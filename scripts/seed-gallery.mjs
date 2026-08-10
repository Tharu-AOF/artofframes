// ============================================================
// SEED GALLERY — imports the studio's real gallery photos.
//
// Copies the images from the source photo folder into public/
// images/gallery/<category>/ and replaces all gallery_items rows
// in Supabase (via the service role). Tiles get generated titles
// ("Wall Art 01", …) and their folder as the category.
//
// Usage: node scripts/seed-gallery.mjs
// Idempotent — re-running clears and re-imports.
// ============================================================

import { readdirSync, readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "D:/Personal/Art Of Frames/Apps/Website/02 - Editing/public/gallery_images";

// Folder → { category slug (from the categories tree), tint, title }
const FOLDERS = [
  { dir: "Love Gilfts", category: "love-gifts", color: "#E2557A", title: "Love Gift" },
  { dir: "Mommy Frames", category: "mommy-frames", color: "#C77DA6", title: "Mommy Frame" },
  { dir: "Wall Arts", category: "wall-arts", color: "#E9A23B", title: "Wall Art" },
];

// Creative, evocative titles — one per image, in the folder's
// sorted file order. Category-themed so they hold up as the
// collection evolves; rename any of them in /admin/gallery.
const TITLES = {
  "Love Gilfts": [
    "Where Hearts Meet",
    "A Little Love Note",
    "Sealed With a Kiss",
    "Yours Truly",
    "Love, Stitched in Wood",
    "The Heart of It All",
    "For You, Always",
    "A Promise in Wood",
    "Love, in Every Line",
  ],
  "Mommy Frames": ["First Breath", "Little Miracles", "A Mother's Heart"],
  "Wall Arts": [
    "Light & Shadow Play",
    "Whispers of Wood",
    "The Quiet Statement",
    "Shadows That Speak",
    "A Room's First Word",
    "Silhouette Stories",
    "Lines of Light",
    "The Warm Corner",
    "Carved Conversations",
    "Between Dark & Gold",
    "A Frame of Mind",
    "The Geometry of Calm",
    "Patterns of Home",
    "Grain & Grace",
    "The Art of Arrival",
    "Where Walls Remember",
    "Soft Geometry",
    "A Study in Wood",
    "The Golden Hour",
    "Silent Poems",
    "Craft, Layered",
    "The Everyday Gallery",
    "Wood, Warmed",
    "A Quiet Elegance",
    "The Signature Wall",
    "Shadows in Amber",
    "The Finishing Touch",
    "A Place to Land",
    "Made, Not Found",
  ],
};

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

function slugify(name) {
  const ext = extname(name);
  const base = basename(name, ext);
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image";
  return slug + ext;
}

function uuidFrom(seed) {
  const hex = createHash("md5").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
    (parseInt(hex.slice(16, 18), 16) & 0x3f) |
    0x80
  ).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

// ── Copy images + build rows ─────────────────────────────────
const rows = [];
const slugUsed = new Set();

for (const folder of FOLDERS) {
  const srcDir = resolve(SOURCE, folder.dir);
  const files = readdirSync(srcDir)
    .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
    .sort();

  files.forEach((file, i) => {
    const destDir = resolve(root, "public/images/gallery", folder.dir === "Love Gilfts" ? "love-gifts" : folder.dir === "Mommy Frames" ? "mommy-frames" : "wall-arts");
    mkdirSync(destDir, { recursive: true });
    let destName = slugify(file);
    if (slugUsed.has(`${folder.dir}/${destName}`)) {
      destName = `${basename(destName, extname(destName))}-2${extname(destName)}`;
    }
    slugUsed.add(`${folder.dir}/${destName}`);
    copyFileSync(resolve(srcDir, file), resolve(destDir, destName));

    const title =
      TITLES[folder.dir]?.[i] ??
      `${folder.title} ${String(i + 1).padStart(2, "0")}`;
    const imageUrl =
      folder.dir === "Love Gilfts"
        ? `/images/gallery/love-gifts/${destName}`
        : folder.dir === "Mommy Frames"
          ? `/images/gallery/mommy-frames/${destName}`
          : `/images/gallery/wall-arts/${destName}`;

    rows.push({
      id: uuidFrom(`${folder.category}::${title}::${i}`),
      title,
      category_id: folder.category,
      image_url: imageUrl,
      color: folder.color,
      span: "",
      sort_order: i + 1,
    });
  });

  console.log(`✓ ${folder.dir}: ${files.length} images → gallery_items (category "${folder.category}")`);
}

console.log(`Collected ${rows.length} gallery tiles`);

// ── Push to Supabase ─────────────────────────────────────────
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
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

// Preserve admin-set "show on landing page" flags across re-seeds.
let existingFlags = new Map();
try {
  const res = await fetch(
    `${baseUrl}/rest/v1/gallery_items?select=id,show_on_home`,
    { headers }
  );
  if (res.ok) {
    existingFlags = new Map(
      (await res.json()).map((r) => [r.id, r.show_on_home])
    );
  }
} catch {
  // Read failed — defaults apply.
}

await rest("DELETE", "gallery_items?id=neq.00000000-0000-0000-0000-000000000000");
console.log("✓ cleared existing gallery items");
await rest(
  "POST",
  "gallery_items",
  rows.map((r) => ({ ...r, show_on_home: existingFlags.get(r.id) ?? false }))
);
console.log(`✓ inserted ${rows.length} gallery items`);
console.log("Done — gallery is live.");
