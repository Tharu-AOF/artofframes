// ============================================================
// IMPORT GALLERY BATCH 2 — adds the studio's second gallery set.
//
// Reads C:/Users/tharu/Downloads/gallery images 2, optimizes each
// image to WebP (long edge 1600px, q82 — matches the existing
// gallery tiles), copies into public/images/gallery/<category>/,
// and INSERTS new gallery_items rows (primary category_id + the
// gallery_item_categories join row). Never deletes or touches the
// existing 49 tiles. If the "other" category doesn't exist yet it
// is created as a top-level category.
//
// Usage: node scripts/import-gallery-batch2.mjs
// Idempotent — re-running skips images that already have a row.
// ============================================================

import { readdirSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "C:/Users/tharu/Downloads/gallery images 2";

// Source folder → { category id (slug from the categories tree), tint }
const FOLDERS = [
  { dir: "business-door sign", category: "door-sign-2", color: "#E9A23B" },
  { dir: "gift items - Event-gift", category: "other", color: "#E2557A" }, // no "Event Gift" subcategory exists → other
  { dir: "gift items - love gifts", category: "love-gifts-2", color: "#E2557A" },
  { dir: "keytags", category: "keytags", color: "#0E8C7B" },
  { dir: "kids learning", category: "kids-leaning", color: "#C77DA6" },
  { dir: "mommy frames", category: "mommy-frames", color: "#C77DA6" },
  { dir: "other", category: "other", color: "#CCA681" },
  { dir: "plymount", category: "plymounts", color: "#CCA681" },
  { dir: "sign boards", category: "sign-boards", color: "#E9A23B" },
  { dir: "wall art-comon", category: "common", color: "#E9A23B" }, // "comon" = common (Wall Arts → Common)
];

// Creative, evocative titles — one per image, in the folder's
// sorted file order. Rename any of them in /admin/gallery.
const TITLES = {
  "business-door sign": [
    "First Impressions",
    "The Welcome Touch",
  ],
  "gift items - Event-gift": [
    "A Celebration in a Box",
    "Wrapped for the Occasion",
    "Moments Made Special",
    "A Gift That Says It All",
    "Joy, Delivered",
    "The Thoughtful Gesture",
    "Party in a Package",
    "Cheers to the Day",
    "A Present for the Party",
    "The Perfect Surprise",
    "Little Tokens of Joy",
    "Festive & Fine",
    "The Afterglow",
  ],
  "gift items - love gifts": [
    "Where Hearts Meet",
    "A Little Love Note",
    "Sealed With a Kiss",
    "Yours Truly",
    "Love, Stitched in Wood",
    "The Heart of It All",
    "For You, Always",
    "A Promise in Wood",
    "Love, in Every Line",
    "Two Hearts, One Gift",
    "Forever in a Frame",
    "The Valentine's Vow",
    "Made With Love",
  ],
  keytags: [
    "Keys to Remember",
    "Carried Every Day",
    "A Little Charm",
    "Always Within Reach",
    "The Everyday Keep",
    "Personal Touch",
    "Small but Meaningful",
    "The Daily Companion",
    "A Slice of Home",
    "Pocket-Sized Love",
    "Made to Be Carried",
    "The Constant Companion",
    "Handled With Care",
    "A Bit of Character",
  ],
  "kids learning": [
    "Little Learners",
    "Play, Learn, Grow",
    "The ABCs of Fun",
    "Growing Every Day",
  ],
  "mommy frames": [
    "A Mother's First Love",
    "The Bond That Lasts",
  ],
  other: [
    "Handcrafted With Heart",
    "The Little Extra",
    "Made Just for You",
    "A Touch of Craft",
  ],
  plymount: [
    "Layered With Care",
    "The Sturdy Stand",
    "Crafted to Last",
    "Wood, Warmed",
    "Built on Solid Ground",
    "The Everyday Essential",
    "Form & Function",
    "The Quiet Workhorse",
    "Carved & Cut",
    "A Cut Above",
    "The Practical Beauty",
    "Shaped by Hand",
    "The Finishing Touch",
    "Sturdy & Stylish",
    "The Solid Choice",
  ],
  "sign boards": [
    "Made to Stand Out",
    "The First Hello",
    "Words That Welcome",
    "The Business Face",
    "Announcing the Day",
    "Where It All Points",
  ],
  "wall art-comon": [
    "The Everyday Gallery",
    "Walls That Speak",
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
const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function rest(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers: { ...baseHeaders, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

function slugify(name) {
  const base = basename(name, extname(name));
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

// ── Ensure the "other" category exists ───────────────────────
const catRes = await rest("GET", "categories?select=id&id=eq.other");
const existing = await catRes.json();
if (existing.length === 0) {
  await rest("POST", "categories", [{ id: "other", name: "Other", sort_order: 999, active: true }]);
  console.log("✓ created category 'other'");
} else {
  console.log("✓ category 'other' already exists");
}

// ── What's already in the gallery? ───────────────────────────
const giRes = await rest("GET", "gallery_items?select=id,image_url,sort_order&limit=2000");
const existingTiles = await giRes.json();
const existingByUrl = new Map(existingTiles.map((t) => [t.image_url, t.id]));
const maxSort = existingTiles.reduce((m, t) => Math.max(m, Number(t.sort_order) || 0), 0);
console.log(`existing tiles: ${existingTiles.length}, max sort_order: ${maxSort}`);

// ── Optimize + collect rows ──────────────────────────────────
const rows = [];
const usedNames = new Map(); // category → set of file slugs

for (const folder of FOLDERS) {
  const srcDir = resolve(SOURCE, folder.dir);
  if (!existsSync(srcDir)) {
    console.warn(`⚠ skip missing folder: ${folder.dir}`);
    continue;
  }
  const files = readdirSync(srcDir)
    .filter((f) => /\.(jpe?g|png|webp|gif|heic)$/i.test(f))
    .sort();

  const destDir = resolve(root, "public/images/gallery", folder.category);
  mkdirSync(destDir, { recursive: true });
  const used = new Set(usedNames.get(folder.category) ?? []);

  let newCount = 0;
  for (const [i, file] of files.entries()) {
    let name = `${slugify(file)}.webp`;
    while (used.has(name)) name = `${basename(name, ".webp")}-2.webp`;
    used.add(name);
    const dest = join(destDir, name);
    const url = `/images/gallery/${folder.category}/${name}`;

    // Skip if this exact URL already has a tile.
    if (existingByUrl.has(url)) {
      console.log(`  = ${folder.dir}/${file} already imported — skipping`);
      continue;
    }

    await sharp(resolve(srcDir, file))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(dest);

    const title =
      TITLES[folder.dir]?.[i] ?? `${folder.dir} ${String(i + 1).padStart(2, "0")}`;
    rows.push({
      title,
      category_id: folder.category,
      image_url: url,
      color: folder.color,
      span: "",
      show_on_home: false,
      sort_order: maxSort + rows.length + 1,
    });
    newCount++;
  }
  usedNames.set(folder.category, used);
  console.log(`✓ ${folder.dir}: ${newCount} new images → category "${folder.category}"`);
}

console.log(`\nCollected ${rows.length} new gallery tiles`);

if (rows.length === 0) {
  console.log("Nothing to import — all images already in the gallery.");
  process.exit(0);
}

if (process.env.DRY_RUN) {
  console.log("DRY RUN — files optimized, DB untouched.");
  process.exit(0);
}

// ── Insert rows + join-table rows ────────────────────────────
const inserted = await rest(
  "POST",
  "gallery_items",
  rows,
  { Prefer: "return=representation" }
);
const created = await inserted.json();

const joinRows = created
  .filter((r) => r.category_id)
  .map((r) => ({ gallery_item_id: r.id, category_id: r.category_id }));
if (joinRows.length) {
  await rest(
    "POST",
    "gallery_item_categories",
    joinRows,
    { Prefer: "resolution=merge-duplicates,return=minimal" }
  );
}
console.log(`✓ inserted ${created.length} gallery items (+ ${joinRows.length} category links)`);
console.log("Done — gallery updated, existing tiles untouched.");
