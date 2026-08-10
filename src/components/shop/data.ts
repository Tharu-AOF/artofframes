// ============================================================
// SHOP DATA — shared types, constants and tree helpers.
//
// The products themselves live in Supabase (products +
// product_images tables); this module only holds the shapes and
// pure helpers both the shop and the admin panel depend on.
//
// CATEGORIES — a two-level tree shown in the shop sidebar. Each
// product points at a LEAF category via `categoryId`; groups
// (e.g. "Hotel Items") are folders that aggregate their leaves.
// The tree is fetched from Supabase; CATEGORY_TREE below is the
// fallback used before the database responds and by any pure
// helper that is called without an explicit tree.
// Prices are LKR (Rs.).
// ============================================================

export interface Category {
  id: string;
  name: string;
  /** Hidden from the shop sidebar when false */
  active?: boolean;
  children?: Category[];
}

export const CATEGORY_TREE: Category[] = [
  { id: "all", name: "All" },
  {
    id: "hotel-items",
    name: "Hotel Items",
    children: [
      { id: "coaster", name: "Coaster" },
      { id: "keytag", name: "Keytag" },
      { id: "menu", name: "Menu" },
      { id: "reserved", name: "Reserved" },
      { id: "sign-boards", name: "Sign Boards" },
      { id: "table-number", name: "Table Number" },
      { id: "serviette-holder", name: "Serviette Holder" },
    ],
  },
  {
    id: "wall-arts",
    name: "Wall Arts",
    children: [
      { id: "door-signs", name: "Door Signs" },
      { id: "hotel", name: "Hotel" },
      { id: "open-close-welcome", name: "Open Close Welcome" },
      { id: "restroom", name: "Restroom" },
      { id: "salon", name: "Salon" },
      { id: "common", name: "Common" },
    ],
  },
  { id: "baby-frames", name: "Baby Frames" },
  { id: "clocks", name: "Clocks" },
  { id: "love-gifts", name: "Love Gifts" },
  { id: "mommy-frames", name: "Mommy Frames" },
];

/** Category whose product anchors the large signature card in "All" view */
export const SIGNATURE_CATEGORY = "sign-boards";

export const WHATSAPP_NUMBER = "94750350109";

// ─── Tree helpers (pure — default to CATEGORY_TREE) ─────────────────────────

/** Full path from the root down to the category with `id` (or []). */
export function getCategoryPath(
  id: string,
  tree: Category[] = CATEGORY_TREE
): Category[] {
  const walk = (cats: Category[], trail: Category[]): Category[] | null => {
    for (const c of cats) {
      const t = [...trail, c];
      if (c.id === id) return t;
      if (c.children) {
        const r = walk(c.children, t);
        if (r) return r;
      }
    }
    return null;
  };
  return walk(tree, []) ?? [];
}

/** The category node itself (leaf or group) for an id, or null. */
export function getCategory(
  id: string,
  tree: Category[] = CATEGORY_TREE
): Category | null {
  const path = getCategoryPath(id, tree);
  return path.length ? path[path.length - 1] : null;
}

/** All leaf ids under a category (its own id if it is a leaf). */
export function getLeafIds(cat: Category): string[] {
  return cat.children ? cat.children.flatMap(getLeafIds) : [cat.id];
}

/** Breadcrumb-style path name, e.g. "Hotel Items · Keytag". */
export function getCategoryPathName(
  id: string,
  tree: Category[] = CATEGORY_TREE
): string {
  return getCategoryPath(id, tree)
    .map((c) => c.name)
    .join(" · ");
}

// Brand-tinted accents, keyed deterministically by category id so a
// tile's glow/badges stay stable without the admin picking a color.
const CATEGORY_ACCENTS = [
  "#CCA681",
  "#E9A23B",
  "#0E8C7B",
  "#E2557A",
  "#C77DA6",
  "#685558",
  "#5A1020",
  "#8B5E3C",
];

/** Deterministic brand accent for a category id (stable across renders). */
export function getCategoryAccent(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_ACCENTS[h % CATEGORY_ACCENTS.length];
}

// ─── Products ────────────────────────────────────────────────────────────────

/** A purchasable option — size, material or quantity tier with its own price. */
export interface ProductVariation {
  id: string;
  label: string;
  price: string;
}

// ─── Offers (shop header carousel) ──────────────────────────────────────────

export interface Offer {
  id: string;
  title: string;
  /** Cover image for the carousel slide */
  image: string;
  /** Button text, e.g. "Shop Clocks" */
  ctaLabel: string;
  /** Button destination, e.g. "/shop" or "/shop?category=clocks" */
  ctaLink: string;
  active: boolean;
  sortOrder: number;
}

// ─── Discounts (scheduled sales) ────────────────────────────────────────────

/** A sale configured in the admin panel — targets a product or category. */
export interface DiscountCampaign {
  id: string;
  targetType: "product" | "category";
  /** Product uuid or category slug */
  targetId: string;
  type: "percent" | "flat";
  /** 10 = 10%, 500 = Rs. 500 */
  value: number;
  /** ISO date (YYYY-MM-DD) or null = starts immediately */
  startsAt: string | null;
  /** ISO date (YYYY-MM-DD) or null = no end */
  endsAt: string | null;
  active: boolean;
}

export type DiscountStatus = "live" | "scheduled" | "expired" | "paused";

/** Live = active AND within the start/end window (ends_at inclusive).
 * Dates are compared as YYYY-MM-DD strings so the result is identical
 * in the browser (admin) and the server (shop) regardless of timezone. */
export function discountStatus(
  d: Pick<DiscountCampaign, "active" | "startsAt" | "endsAt">,
  now: Date = new Date()
): DiscountStatus {
  if (!d.active) return "paused";
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  if (d.startsAt && d.startsAt > today) return "scheduled";
  if (d.endsAt && d.endsAt < today) return "expired";
  return "live";
}

export function isDiscountLive(
  d: Pick<DiscountCampaign, "active" | "startsAt" | "endsAt">,
  now: Date = new Date()
): boolean {
  return discountStatus(d, now) === "live";
}

/** The discount a product effectively carries (resolved by the shop layer). */
export interface EffectiveDiscount {
  type: "percent" | "flat";
  value: number;
  /** Display label, e.g. "10% OFF" or "Rs. 500 OFF" */
  label: string;
}

/** Numeric value of a formatted price string, or null when unpriceable. */
export function parsePrice(price: string): number | null {
  const n = parseInt(price.replace(/\D/g, ""), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

/** Discounted price string for a formatted price, or null when unpriceable. */
export function discountPrice(
  price: string,
  d: Pick<EffectiveDiscount, "type" | "value">
): string | null {
  const base = parsePrice(price);
  if (base === null) return null;
  const off =
    d.type === "percent" ? Math.round((base * d.value) / 100) : d.value;
  const final = Math.max(0, base - off);
  return "Rs. " + final.toLocaleString("en-US");
}

export function discountLabel(d: {
  type: "percent" | "flat";
  value: number;
}): string {
  return d.type === "percent"
    ? `${d.value}% OFF`
    : `Rs. ${d.value.toLocaleString("en-US")} OFF`;
}

export interface ShopProduct {
  id: string;
  name: string;
  /** Leaf category id from the category tree */
  categoryId: string;
  /** ISO date the piece was added — drives the "Most Recent" sort */
  createdAt: string;
  /** Hidden from the shop when false */
  active: boolean;
  /** Appears on the landing page carousel when true */
  showOnHome: boolean;
  price: string;
  image: string;
  /** All product images — the first one is also used on the cards. */
  gallery: string[];
  alt: string;
  badge?: string;
  description: string;
  features: string[];
  materials: string[];
  /** True when the piece can be personalized — shows a badge on the card */
  customizable: boolean;
  /** Brand-tint used for the card glow + accents */
  color: string;
  /** Optional options (size/material/tier) the customer picks in the modal */
  variations: ProductVariation[];
  /** Resolved live discount on the base price (null when none) */
  discount?: EffectiveDiscount;
  /** Whether a linked gallery tile exists ("Add to Gallery also") — admin only */
  inGallery?: boolean;
}
