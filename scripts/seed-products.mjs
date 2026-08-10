// ============================================================
// SEED REAL PRODUCTS — imports the studio's real catalog.
//
// Reads the info.json files + images from the source photo
// folder, copies the referenced images into public/images/
// products/<category>/ (with slugified filenames), then replaces
// all shop products in Supabase (via the service role).
//
// Usage: node scripts/seed-products.mjs
// Idempotent — re-running clears products and re-imports.
// ============================================================

import { readFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Source of the real photos ────────────────────────────────
const SOURCE = "D:/Personal/Art Of Frames/Apps/Website/02 - Editing/public/product_images";

// ── Env ──────────────────────────────────────────────────────
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

// ── Category mapping: source folder → leaf category slug ─────
const FOLDER_TO_CATEGORY = {
  "Baby Frames": "baby-frames",
  "Clocks": "clocks",
  "Hotel Package/Coaster": "coaster",
  "Hotel Package/Keytag": "keytag",
  "Hotel Package/Menu": "menu",
  "Hotel Package/Reserved": "reserved",
  "Hotel Package/Sign Boards": "sign-boards",
  "Hotel Package/Table Number": "table-number",
  "Hotel Package/serviette holder": "serviette-holder",
  "Love Gifts": "love-gifts",
  "Mommy Frames": "mommy-frames",
  "Wall Arts/Door Signs": "door-signs",
  "Wall Arts/Hotel": "hotel",
  "Wall Arts/Open Close Welcome": "open-close-welcome",
  "Wall Arts/Restroom": "restroom",
  "Wall Arts/Salon": "salon",
  "Wall Arts/Wall Decor": "common",
};

// ── Brand tint per category (card glow + accents) ────────────
const TINTS = {
  "baby-frames": "#C77DA6",
  "clocks": "#E9A23B",
  "coaster": "#0E8C7B",
  "keytag": "#CCA681",
  "menu": "#0E8C7B",
  "reserved": "#CCA681",
  "sign-boards": "#E9A23B",
  "table-number": "#CCA681",
  "serviette-holder": "#0E8C7B",
  "love-gifts": "#E2557A",
  "mommy-frames": "#C77DA6",
  "door-signs": "#CCA681",
  "hotel": "#0E8C7B",
  "open-close-welcome": "#0E8C7B",
  "restroom": "#CCA681",
  "salon": "#E9A23B",
  "common": "#685558",
};

const GENERIC_ENGRAVING =
  "Personalize with names, initials, logos or a special message — designed, cut and finished to order.";

// ── Human-readable names for products whose info.json name is
//    just a number ("1", "01", …) or a placeholder ────────────
const NAME_OVERRIDES = {
  "Clocks": [
    "Geometric Roman Wall Clock", "Minimalist Black Cutout Clock",
    "Classic Twelve & Six Clock", "Tree & Bird Silhouette Clock",
    "Scattered Numbers Clock", "Love Vinyl Record Clock",
    "Four-Design Clock Collection", "Love Photo Frame Clock",
    "Circuit Tech Clock", "Oval Family Name Clock",
    "Multi-Layer Premium Clock", "Modern Square Clock",
    "Minimal Vertical Clock", "Semi-Circle Slat Clock",
    "Perpetual Calendar Clock", "Lady Silhouette Clock",
    "Industrial Gold Accent Clock",
  ],
  "Wall Arts/Restroom": [
    "Rose Gold Restroom Sign", "Gold Outline Restroom Sign",
    "Matte Black Restroom Sign", "Playful Black Silhouette Sign",
    "Walnut Restroom Plaques", "Wave-Cut Dark Restroom Sign",
    "Wave-Cut Light Restroom Sign", "Raised Lettering Restroom Plaques",
    "Circular Figure Restroom Sign", "Cutout Nameplate Restroom Sign",
    "Formal Attire Restroom Sign", "Brushed Gold Restroom Sign",
    "White Acrylic Restroom Plaques", "Inclusive Three-Piece Restroom Sign",
    "Rounded Frame Restroom Sign", "Rose Gold Mirror Restroom Sign",
    "Geometric Black Restroom Figures", "Bowtie Suit Restroom Sign",
  ],
  "Wall Arts/Salon": [
    "Salon Profile Clock", "Hairstyle Silhouette Board",
    "Bearded Profiles Wall Set", "Sunglasses Barber Silhouette",
    "Barber Tools Round Sign", "Salon Clock with Tools",
    "Sophia Custom Salon Sign", "Geometric Barber Framework",
    "Barber Script Sign",
  ],
  "Love Gifts": [
    "“You Have My Heart” Couple Keytags", "Couple Under Tree Wall Art",
    "Personalized Rose Box", "Cupid Photo Frame",
    "Sliding Valentine Card", "Name Roses",
    "Open Book Anniversary Card", "Couple Shadow Candle Holder",
  ],
  "Wall Arts/Door Signs": [
    "Push Pull Wooden Sign", "Circular Icon Door Sign",
    "Silhouette Push Pull Sign",
  ],
  "Wall Arts/Hotel": [
    "Cutlery Kitchen Wall Sign", "Coffee Mug Motivational Art",
    "Teapot Three-Panel Wall Art", "Culinary Quote Wall Art",
    "Cooking Pot Floral Art",
  ],
  "Wall Arts/Open Close Welcome": [
    "Turquoise Round Open Sign", "Floral Round Salon Open Sign",
    "Geometric Hello Sign", "Monstera Hello Sign",
  ],
  "Mommy Frames": [
    "Wall Frame — Couple Journey", "Wall Frame — Family Silhouette",
    "Wall Frame — Ultrasound Scan", "Wall Frame — Heart Charm",
    "Table Frame — Couple Silhouette", "Table Frame — Sonogram",
    "Table Frame — Heart Charm",
  ],
  "Hotel Package/Reserved": [
    "Script Reserved Sign", "Stenciled Reserved Sign",
    "Bold Lettering Reserved Sign", "Personalized Block Reserved Sign",
    "Vertical Branded Reserved Stand",
  ],
  "Hotel Package/Sign Boards": [
    "Custom Sign Board 01", "Custom Sign Board 02",
    "Custom Sign Board 03", "Custom Sign Board 04",
    "Custom Sign Board 05", "Custom Sign Board 06",
    "Custom Sign Board 07", "Custom Sign Board 08",
  ],
  "Hotel Package/Coaster": [
    "QR Code Menu Coaster", "Elegant QR Coaster",
    "Wave Pattern Coaster Set", "Mandala Coaster",
    "Flower Coaster", "Casino Coaster",
    "Geometric Coaster", "Leaf Coaster",
    "Rose Coaster", "Square QR Coaster",
    "Quote Coaster", "Petal Coaster",
  ],
};

// ── Price helpers ────────────────────────────────────────────
function normalizePrice(raw) {
  if (raw === null || raw === undefined) return { price: "Rs. 0", note: null };
  const s = String(raw).trim();
  if (/^custom$/i.test(s)) return { price: "Custom Price", note: null };
  const tiered = s.match(/=\s*rs\.?\s*\d[\d,]*/gi);
  if (tiered && tiered.length) {
    const first = parseInt(tiered[0].replace(/\D/g, ""), 10);
    return {
      price: "Rs. " + first.toLocaleString("en-US"),
      note: `Pricing — ${s.replace(/_/g, "·")}`,
    };
  }
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(n)) return { price: "Custom Price", note: null };
  return { price: "Rs. " + n.toLocaleString("en-US"), note: null };
}

// ── Slugified filename (keeps URLs clean) ────────────────────
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

// ── Deterministic uuid from a string (stable across runs) ────
function uuidFrom(seed) {
  const hex = createHash("md5").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
    (parseInt(hex.slice(16, 18), 16) & 0x3f) |
    0x80
  ).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

// ── Collect products from info.json ──────────────────────────
const products = [];
const imagesToCopy = [];
const copiedPaths = new Set();

for (const [folder, categoryId] of Object.entries(FOLDER_TO_CATEGORY)) {
  const infoPath = resolve(SOURCE, folder, "info.json");
  if (!existsSync(infoPath)) {
    console.warn(`✗ no info.json in ${folder} — skipped`);
    continue;
  }
  const items = JSON.parse(readFileSync(infoPath, "utf8"));
  const overrides = NAME_OVERRIDES[folder] ?? [];
  items.forEach((item, i) => {
    const rawName = String(item.name ?? "").trim();
    const isNumberName = /^\d+$/.test(rawName);
    const name =
      overrides[i] ??
      (isNumberName
        ? item.description.split(/[.,—]/)[0].trim() || rawName
        : rawName);

    const { price, note } = normalizePrice(item.price);

    // Copy the main image into the project's public folder.
    const srcRel = item.mainImage;
    const srcPath = resolve(SOURCE, folder, srcRel);
    const destName = slugify(srcRel);
    const destDir = resolve(root, "public/images/products", categoryId);
    const destRel = `/images/products/${categoryId}/${destName}`;
    if (!copiedPaths.has(srcPath)) {
      copiedPaths.add(srcPath);
      imagesToCopy.push({ srcPath, destDir, destName });
    }

    const materials = (item.specifications?.Material ?? "")
      .split("/")
      .map((m) => m.trim())
      .filter(Boolean);

    const features = [];
    if (note) features.push(note);
    if (item.specifications?.Size) {
      features.push(`Size: ${item.specifications.Size}`);
    }

    products.push({
      id: uuidFrom(`${categoryId}::${name}::${i}`),
      name,
      category_id: categoryId,
      price,
      description: String(item.description ?? "").trim(),
      badge: null,
      engraving: GENERIC_ENGRAVING,
      color: TINTS[categoryId] ?? "#CCA681",
      features,
      materials,
      created_at: item.createdAt ?? "2026-06-08",
      image_url: destRel,
    });
  });
}

console.log(`Collected ${products.length} products across ${Object.keys(FOLDER_TO_CATEGORY).length} categories`);

// ── Copy images ──────────────────────────────────────────────
let copied = 0;
for (const { srcPath, destDir, destName } of imagesToCopy) {
  mkdirSync(destDir, { recursive: true });
  // Overwrite: same source → same slug on every run (idempotent).
  copyFileSync(srcPath, resolve(destDir, destName));
  copied++;
}
console.log(`✓ copied ${copied} images → public/images/products/`);

// ── Push to Supabase (service role bypasses RLS) ─────────────
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

// Preserve admin-set visibility flags across re-seeds — the
// catalog is fully replaced below, so re-running this script
// must not silently wipe toggles made in the admin panel.
let existingFlags = new Map();
try {
  const res = await fetch(
    `${baseUrl}/rest/v1/products?select=id,active,show_on_home`,
    { headers }
  );
  if (res.ok) {
    existingFlags = new Map(
      (await res.json()).map((r) => [
        r.id,
        { active: r.active, show_on_home: r.show_on_home },
      ])
    );
  }
} catch {
  // Read failed — defaults apply.
}

// Same for variations — admin-managed options must survive re-seeds.
let existingVariations = [];
try {
  const res = await fetch(
    `${baseUrl}/rest/v1/product_variations?select=id,product_id,label,price,sort_order&order=sort_order.asc`,
    { headers }
  );
  if (res.ok) existingVariations = await res.json();
} catch {
  // None preserved.
}

// 1. Clear existing products (cascades to product_images + variations).
await rest("DELETE", "products?id=neq.00000000-0000-0000-0000-000000000000");
console.log("✓ cleared existing products");

// 2. Insert products + gallery rows.
const productRows = products.map((p) => {
  const flags = existingFlags.get(p.id);
  return {
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    price: p.price,
    description: p.description,
    badge: p.badge,
    engraving: p.engraving,
    color: p.color,
    features: p.features,
    materials: p.materials,
    created_at: p.created_at,
    active: flags?.active ?? true,
    show_on_home: flags?.show_on_home ?? false,
  };
});
const imageRows = products.map((p) => ({
  product_id: p.id,
  url: p.image_url,
  sort_order: 1,
}));

await rest("POST", "products", productRows);
console.log(`✓ inserted ${productRows.length} products`);
await rest("POST", "product_images", imageRows);
console.log(`✓ inserted ${imageRows.length} product images`);

// 3. Restore variations that belong to seeded products (stable ids).
const keptVariations = existingVariations.filter((v) =>
  products.some((p) => p.id === v.product_id)
);
if (keptVariations.length) {
  await rest(
    "POST",
    "product_variations",
    keptVariations.map(({ id, product_id, label, price, sort_order }) => ({
      id,
      product_id,
      label,
      price,
      sort_order,
    }))
  );
  console.log(`✓ restored ${keptVariations.length} product variations`);
}

console.log("Done — real catalog is live.");
