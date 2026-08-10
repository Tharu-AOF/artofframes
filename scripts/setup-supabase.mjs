// ============================================================
// Applies supabase/schema.sql + supabase/seed.sql to the
// project via the Supabase Management API (Personal Access Token).
//
// Usage: node scripts/setup-supabase.mjs
// Reads SUPABASE_ACCESS_TOKEN from .env.local. Idempotent — safe to re-run.
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
const projectRef = baseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const accessToken = env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken || !serviceKey) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
  process.exit(1);
}

async function runSql(name, sql) {
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
    console.error(`✗ ${name} failed (${res.status}):`, text.slice(0, 600));
    process.exit(1);
  }
  console.log(`✓ ${name} applied`);
}

const schema = readFileSync(resolve(root, "supabase/schema.sql"), "utf8");

// NOTE: seed.sql is intentionally NOT applied here — it would wipe
// and replace the real catalog. It only bootstraps an empty database.
// The real products/gallery are imported with scripts/seed-products.mjs
// and scripts/seed-gallery.mjs.
await runSql("schema.sql", schema);

// PostgREST caches the schema — notify it to reload so the REST API
// sees new tables/columns (e.g. gallery_item_categories) immediately.
await runSql("reload postgrest schema cache", "notify pgrst, 'reload schema';");
await new Promise((r) => setTimeout(r, 1500));

// ── Storage bucket (product images + gallery uploads) ───────
// Created via the Storage REST API with the service role. The
// bucket is PUBLIC, so public object URLs (/storage/v1/object/
// public/...) are served to anyone without needing RLS policies.
// Admin uploads go through a service-role server action, which
// bypasses storage RLS entirely (storage.objects ownership
// blocks creating policies programmatically).
async function createBucket() {
  const res = await fetch(`${baseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "product-images",
      name: "product-images",
      public: true,
      file_size_limit: 15728640, // 15 MB
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    }),
  });
  const text = await res.text();
  if (!res.ok && !text.includes("already exists")) {
    console.error(`✗ bucket creation failed (${res.status}):`, text.slice(0, 400));
    process.exit(1);
  }
  console.log("✓ product-images bucket ready (public)");
}

await createBucket();
console.log("Done — database is ready.");
