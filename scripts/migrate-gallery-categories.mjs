// ============================================================
// MIGRATE GALLERY CATEGORIES — one-time backfill of the legacy
// free-form tag system to the shared categories tree.
//
// SAFE ORDER (no data loss): on an EXISTING database run this
// script BEFORE re-applying supabase/schema.sql. It is
// self-sufficient:
//
// 1. Ensures the new category_id / product_id columns exist
//    (adds them if the schema hasn't been applied yet).
// 2. Reads every gallery_items row's legacy tag/tags values.
// 3. Maps each tag name to a categories.id (explicit alias table
//    for irregulars like "Keytags"→keytag, plus slugified-name
//    matching so "Sign Boards" resolves to sign-boards). Tags
//    with no match leave the tile uncategorized (category_id
//    stays NULL) — surfaced in /admin/gallery until assigned.
// 4. Writes category_id back to Supabase (service role).
// 5. Drops the legacy tag/tags columns and the gallery_tags
//    table via the Management API (SUPABASE_ACCESS_TOKEN).
//
// Usage: node scripts/migrate-gallery-categories.mjs
// Idempotent — safe to re-run. If the tag columns are already
// gone (fresh DB or an earlier run), the backfill is skipped and
// only the guarded DDL runs.
// ============================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const projectRef = baseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!baseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}
if (!projectRef || !accessToken) {
  console.warn(
    "⚠ SUPABASE_ACCESS_TOKEN missing — backfill can run, but the legacy tag columns and gallery_tags table will NOT be dropped. Re-run after adding it (or apply supabase/schema.sql)."
  );
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function rest(method, path, body) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

async function runSql(name, sql) {
  if (!projectRef || !accessToken) {
    console.warn(`⏭ ${name} skipped (no SUPABASE_ACCESS_TOKEN)`);
    return;
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${name} → ${res.status}: ${text.slice(0, 300)}`);
  }
  console.log(`✓ ${name}`);
}

const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ── D2 tag → category mapping ───────────────────────────────
// Irregulars whose slugified tag name ≠ category id (e.g. the
// tag is plural, or the category has a longer name). Everything
// else resolves by slugified-name equality against categories.
const TAG_ALIASES = {
  keytags: "keytag",
  "table-numbers": "table-number",
  "serviette-holders": "serviette-holder",
  coasters: "coaster",
  "hotel-restaurant": "hotel-items",
  "open-close": "open-close-welcome",
};

// ── 1. Load categories ──────────────────────────────────────
const catRes = await rest("GET", "categories?select=id,name");
const categories = await catRes.json();
const bySlug = new Map(categories.map((c) => [slugify(c.name), c.id]));

// ── 2. Probe for legacy tag columns ─────────────────────────
// `tags` / `tag` exist only on databases created before this
// migration; a failed select means they're already gone.
let tiles = [];
const probe = await fetch(`${baseUrl}/rest/v1/gallery_items?select=id,tag,tags&limit=1`, {
  headers,
});
if (!probe.ok) {
  console.log(
    "Legacy tag columns not found (fresh database or already migrated) — skipping backfill."
  );
} else {
  const allRes = await rest("GET", "gallery_items?select=id,tag,tags&order=sort_order");
  tiles = await allRes.json();
  console.log(`Loaded ${tiles.length} gallery tiles with legacy tags.`);
}

// ── 3. Map tags → category_id ───────────────────────────────
// First match wins (tile.tag is the primary tag). Unmatched tags
// are collected so the admin can see exactly what was dropped.
const unmatched = new Set();
let uncategorized = 0;
const patches = [];

for (const tile of tiles) {
  const raw = Array.isArray(tile.tags) ? tile.tags.map(String) : [];
  const list = raw.filter((t) => t.trim());
  const primary = String(tile.tag ?? "").trim();
  const tags = list.length ? list : primary ? [primary] : [];

  let categoryId = null;
  for (const tag of tags) {
    const slug = slugify(tag);
    const id = TAG_ALIASES[slug] ?? bySlug.get(slug) ?? null;
    if (id) {
      categoryId = id;
      break;
    }
    unmatched.add(tag.trim());
  }

  if (categoryId) {
    patches.push({ id: tile.id, category_id: categoryId });
  } else if (tags.length) {
    uncategorized++;
  }
}

if (unmatched.size) {
  console.warn(
    `Unmatched tags (tiles left uncategorized): ${[...unmatched].sort().join(", ")}`
  );
}

// ── 4. Ensure the new columns exist, then write category_id ──
// The backfill PATCH needs category_id (and the Phase 3 product
// link needs product_id) — add them first so this script works
// even before schema.sql is re-applied.
if (patches.length || tiles.length) {
  await runSql(
    "ensure gallery category/product columns",
    "alter table gallery_items add column if not exists category_id text references categories (id);" +
      " alter table gallery_items add column if not exists product_id uuid unique references products (id) on delete cascade;"
  );
  // DDL via the Management API runs outside PostgREST, whose schema
  // cache goes stale until it reloads. Ask it to reload and give it
  // a moment before PATCHing the new column.
  await runSql("reload postgrest schema cache", "notify pgrst, 'reload schema';");
  await new Promise((r) => setTimeout(r, 2000));
  for (const p of patches) {
    await rest("PATCH", `gallery_items?id=eq.${p.id}`, { category_id: p.category_id });
  }
  console.log(`✓ backfilled category_id on ${patches.length} tiles` + (uncategorized ? ` (${uncategorized} tiles have no matching category)` : ""));
}

// ── 5. Drop the legacy columns + table (idempotent) ─────────
await runSql(
  "drop legacy gallery columns/table",
  "alter table gallery_items drop column if exists tags; alter table gallery_items drop column if exists tag; drop table if exists gallery_tags;"
);

console.log("Done — gallery is on the category system.");
