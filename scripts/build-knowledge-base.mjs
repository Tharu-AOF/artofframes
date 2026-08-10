// ============================================================
// BUILD KNOWLEDGE BASE — reads the site's public pages and
// stores searchable passages in the kb_chunks table.
//
//   npm run kb:refresh
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// .env.local, fetches SITE_URL (default http://localhost:3000),
// strips nav/footer noise, splits the remaining text into ~220-word
// passages labeled with the nearest heading, and REPLACES the
// chunks for those pages (idempotent — safe to re-run any time the
// site content changes).
//
// Requires the kb_chunks table to exist — apply supabase/schema.sql
// first (node scripts/setup-supabase.mjs).
// ============================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  const text = readFileSync(resolve(root, ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!baseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

// Pages that make up the customer-facing knowledge base. Admin,
// cart and search/filter URLs are intentionally excluded — and so is
// /shop: its content (names, descriptions, PRICES) is structured data
// that lives in Supabase and is served by src/lib/chat/products.ts.
// Keeping it here too would create a second, stale-able source of
// truth for prices.
const PAGES = [
  { path: "/", label: "home" },
  { path: "/services/sign-boards", label: "services" },
  { path: "/gallery", label: "gallery" },
  { path: "/track-order", label: "track-order" },
];

const CHUNK_WORDS = 220;

// Nav/footer labels that survive tag-stripping — a line made up
// entirely of these is navigation, not content.
const JUNK_TOKENS = new Set([
  "art", "of", "frames", "home", "services", "shop", "gallery", "contact",
  "track", "order", "sign", "boards", "menu", "cart", "instagram", "facebook",
  "whatsapp", "scroll", "explore", "all", "now", "bulk", "get", "quote",
  "send", "message", "name", "email", "subject", "powered", "by", "©",
]);

// ─── HTML → text ─────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-");
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ");
}

function normalize(s) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function htmlToText(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const headings = [];
  const hRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = hRe.exec(clean))) {
    const text = decodeEntities(stripTags(m[2]))
      .replace(/\s+/g, " ")
      .trim();
    if (text) headings.push({ level: Number(m[1]), text });
  }

  const text = decodeEntities(
    clean
      .replace(/<\/(p|div|section|li|h[1-6]|tr|td|br)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

  return { text, headings };
}

// ─── Chunking ────────────────────────────────────────────────────────────────

/** Split page text into labeled passages under the nearest heading. */
function chunkPage({ text, headings }, page) {
  const headingNorm = headings.map((h) => ({ ...h, norm: normalize(h.text) }));
  const paragraphs = text
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let section = "Overview";
  let buffer = [];
  const seen = new Set();

  const flush = () => {
    if (!buffer.length) return;
    const content = buffer.join(" ");
    const title = section !== "Overview" ? section : "Overview";
    chunks.push({
      page: page.path,
      section,
      title,
      content,
      source_url: `${siteUrl}${page.path}`,
    });
    buffer = [];
  };

  for (const paragraph of paragraphs) {
    const norm = normalize(paragraph);
    // The site repeats content in scrolling marquees (testimonials,
    // materials) — keep only the first copy.
    if (seen.has(norm)) continue;
    seen.add(norm);

    // A new heading closes the current section — flush what we have
    // so each passage carries the heading it actually belongs to.
    const heading = headingNorm.find((h) => norm === h.norm || norm.includes(h.norm));
    if (heading && norm.length <= 80) {
      flush();
      section = heading.text;
      continue;
    }
    // Drop nav/footer lines (e.g. "Home Services Sign Boards Shop…")
    // and tiny labels — but keep contact-like lines (phone, email).
    const words = paragraph.split(/\s+/);
    const tokens = words.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")).filter(Boolean);
    if (tokens.length && tokens.every((t) => JUNK_TOKENS.has(t))) continue;
    const looksContact = /\d/.test(paragraph) || /@/.test(paragraph);
    if (words.length < 4 && !looksContact) continue;
    if (/^©|all rights reserved/i.test(paragraph)) continue;

    buffer.push(paragraph);
    if (buffer.join(" ").split(/\s+/).length >= CHUNK_WORDS) flush();
  }
  flush();

  return chunks;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const db = createClient(baseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allChunks = [];
for (const page of PAGES) {
  let html;
  try {
    const res = await fetch(`${siteUrl}${page.path}`, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`⚠  ${page.path} → HTTP ${res.status}, skipped`);
      continue;
    }
    html = await res.text();
  } catch (e) {
    console.warn(`⚠  ${page.path} → could not fetch (${e.message}), skipped`);
    continue;
  }
  const chunks = chunkPage(htmlToText(html), page);
  allChunks.push(...chunks);
  console.log(`✓ ${page.path} → ${chunks.length} passages`);
}

if (!allChunks.length) {
  console.error("No content extracted — nothing to store.");
  process.exit(1);
}

// Replace semantics: this script is the sole writer of kb_chunks,
// so clear the whole table first (removes stale rows from pages
// that are no longer scanned) and insert the fresh passages.
try {
  // PostgREST refuses DELETE without a WHERE clause, even for the
  // service role — neq on the uuid id matches every row.
  const { error: delError } = await db
    .from("kb_chunks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError) throw delError;
} catch (e) {
  console.error(
    `✗ Could not clear kb_chunks (${e.message}). Does the table exist? ` +
      "Apply supabase/schema.sql first (node scripts/setup-supabase.mjs)."
  );
  process.exit(1);
}

for (let i = 0; i < allChunks.length; i += 100) {
  const batch = allChunks.slice(i, i + 100);
  const { error } = await db.from("kb_chunks").insert(batch);
  if (error) {
    console.error(`✗ Insert batch failed: ${error.message}`);
    process.exit(1);
  }
}

const words = allChunks.reduce((n, c) => n + c.content.split(/\s+/).length, 0);
console.log(
  `\n✓ Knowledge base refreshed — ${allChunks.length} passages, ~${words.toLocaleString()} words across ${PAGES.length} pages.`
);
