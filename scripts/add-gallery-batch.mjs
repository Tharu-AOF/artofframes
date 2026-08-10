// ============================================================
// ADD GALLERY BATCH — imports a new set of studio photos.
//
// Optimizes each source photo to WebP (auto-rotated, resized to
// ≤1600px, quality 82) into public/images/gallery/<category>/,
// then upserts gallery_items rows into Supabase (service role).
// Unlike seed-gallery.mjs this is ADDITIVE: it never deletes or
// rewrites existing tiles, so admin-curated titles/categories survive.
//
// Usage: node scripts/add-gallery-batch.mjs
// Idempotent — re-running re-optimizes and merges by stable id.
// ============================================================

import { readFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Source folder for the raw photos (same style as seed-gallery.mjs,
// which points at the studio's photo drive). Override with
// GALLERY_SOURCE if the files live somewhere else.
const SOURCE = resolve(
  process.env.GALLERY_SOURCE ?? "C:/Users/tharu/Downloads/gallery images"
);

// Per-photo metadata: source file → { title, brand tint, output
// folder (= category slug from the categories tree) }.
const BATCH = [
  {
    file: "IMG_20260314_153107.jpg",
    title: "Open for You",
    color: "#E9A23B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260314_153123_edit_2088104593055.jpg",
    title: "Come On In",
    color: "#E9A23B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260327_121717_edit_2234241974410307.jpg",
    title: "The Voice in Shadow",
    color: "#E9A23B",
    folder: "wall-arts",
  },
  {
    file: "IMG_20260406_085546.jpg",
    title: "A Table in Bloom",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260406_085942.jpg",
    title: "Lotus at the Table",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260418_091404.jpg",
    title: "Details at Every Door",
    color: "#E9A23B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260418_091448_edit_1987136216323.jpg",
    title: "Your Room Awaits",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260418_092040_edit_197201897121855.jpg",
    title: "A Key for Every Day",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260420_101116.jpg",
    title: "Tagged with Care",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260501_095749.jpg",
    title: "A Table of Peaks",
    color: "#0E8C7B",
    folder: "hotel-items",
  },
  {
    file: "IMG_20260517_090102.jpg",
    title: "Twice Blessed",
    color: "#C77DA6",
    folder: "mommy-frames",
  },
  {
    file: "IMG_20260521_083057.jpg",
    title: "Time in Motion",
    color: "#CCA681",
    folder: "clocks",
  },
  {
    file: "IMG_20260525_101800.jpg",
    title: "Mandala of Hours",
    color: "#CCA681",
    folder: "clocks",
  },
  {
    file: "IMG_20260525_101853.jpg",
    title: "Old Time, New Hands",
    color: "#CCA681",
    folder: "clocks",
  },
  {
    file: "IMG_20260526_095328.jpg",
    title: "Hello, Little World",
    color: "#E9A23B",
    folder: "wall-arts",
  },
  {
    file: "IMG_20260527_095217.jpg",
    title: "The Day Ivanna Arrived",
    color: "#C77DA6",
    folder: "mommy-frames",
  },
  {
    file: "IMG_20260613_095545.jpg",
    title: "Sister of My Soul",
    color: "#E2557A",
    folder: "wall-arts",
  },
  {
    file: "IMG_20260615_101223.jpg",
    title: "Hayaan's First Moments",
    color: "#C77DA6",
    folder: "mommy-frames",
  },
  {
    file: "IMG_20260615_171749.jpg",
    title: "Aaruhiya's Sweet Dreams",
    color: "#C77DA6",
    folder: "mommy-frames",
  },
];

// ── Env / helpers ────────────────────────────────────────────
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
if (!baseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

// Keep a stable id per photo so re-runs merge instead of duplicating.
function uuidFrom(seed) {
  const hex = createHash("md5").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
    (parseInt(hex.slice(16, 18), 16) & 0x3f) |
    0x80
  ).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

// IMG_20260314_153123_edit_2088104593055.jpg →
// img-20260314-153123.webp (matches the studio's file naming).
function webpSlug(name) {
  const base = basename(name, extname(name))
    .toLowerCase()
    .replace(/_edit_\d+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "image") + ".webp";
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// ── 1. Optimize + copy images ────────────────────────────────
console.log(`Source: ${SOURCE}`);
let totalBefore = 0;
let totalAfter = 0;
const rows = [];

for (const item of BATCH) {
  const src = resolve(SOURCE, item.file);
  if (!statSync(src, { throwIfNoEntry: true })) {
    console.error(`✗ missing source: ${item.file}`);
    process.exit(1);
  }
  const destDir = resolve(root, "public/images/gallery", item.folder);
  mkdirSync(destDir, { recursive: true });
  const destName = webpSlug(item.file);
  const dest = resolve(destDir, destName);

  const before = statSync(src).size;
  await sharp(src)
    .rotate() // honor EXIF orientation from the phone
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(dest);
  const after = statSync(dest).size;
  totalBefore += before;
  totalAfter += after;

  console.log(
    `✓ ${item.folder}/${destName}  ${kb(before)} → ${kb(after)}  (${Math.round((1 - after / before) * 100)}% smaller)`
  );

  rows.push({
    id: uuidFrom(`batch-2026::${item.folder}::${destName}`),
    title: item.title,
    category_id: item.folder,
    image_url: `/images/gallery/${item.folder}/${destName}`,
    color: item.color,
    span: "",
    sort_order: 100 + rows.length,
    show_on_home: false,
  });
}

console.log(
  `\nTotal: ${kb(totalBefore)} → ${kb(totalAfter)} (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`
);

// ── 2. Upsert gallery_items ──────────────────────────────────
async function rest(method, path, body, prefer) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`
    );
  }
  return res;
}

await rest("POST", "gallery_items", rows);
console.log(`✓ upserted ${rows.length} gallery items`);

console.log("Done — new gallery items are live.");
