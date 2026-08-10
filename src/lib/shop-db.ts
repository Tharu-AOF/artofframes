// ============================================================
// SHOP DB — server-side data layer for the shop page. Reads are
// public (anon key + RLS "public read" policies). The tree is
// rebuilt from the flat categories table and the virtual "All"
// node is added at the root, matching the sidebar's expectations.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import {
  DELIVERY_SETTINGS_KEY,
  normalizeSettings,
  normalizeSignboardSettings,
  SIGNBOARD_SETTINGS_KEY,
  type ShopSettings,
  type SignboardSettings,
} from "@/lib/settings";
import {
  discountLabel,
  isDiscountLive,
  parsePrice,
  type Category,
  type EffectiveDiscount,
  type Offer,
  type ShopProduct,
} from "@/components/shop/data";

const PLACEHOLDER_IMAGE = "/images/aof-logo.png";

// ─── 60-second in-memory TTL cache ───────────────────────────────────────────
// The public shop/gallery reads are cached so repeat visits skip the
// Supabase round trips (a big TTFB win) while admin edits still appear
// within a minute. Module-level state is fine for a single-process
// server; each instance warms its own cache on first request.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
// Single-flight: concurrent requests for the same key share one
// in-flight loader instead of duplicating the Supabase query on a
// cold cache.
const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = loader()
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export interface GalleryTile {
  id: string;
  title: string;
  /** PRIMARY category id — drives the home page caption; null = uncategorized */
  categoryId: string | null;
  /** Every category the tile lives under (primary first) — /gallery filtering */
  categories: string[];
  image: string;
  color: string;
  span: string;
}

interface ProductImageRow {
  url: string;
  sort_order: number;
}

interface VariationRow {
  id: string;
  label: string;
  price: string;
  sort_order: number;
}

interface DiscountRow {
  id: string;
  target_type: "product" | "category";
  target_id: string;
  type: "percent" | "flat";
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  category_id: string;
  price: string;
  description: string;
  badge: string | null;
  customizable: boolean;
  color: string;
  features: string[] | null;
  materials: string[] | null;
  created_at: string;
  active: boolean;
  show_on_home: boolean;
  product_images: ProductImageRow[] | null;
  product_variations: VariationRow[] | null;
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

const toShopProduct = (
  row: ProductRow,
  discount?: EffectiveDiscount
): ShopProduct => {
  const gallery = [...(row.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url);
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    createdAt: row.created_at,
    active: row.active,
    showOnHome: row.show_on_home,
    price: row.price,
    image: gallery[0] ?? PLACEHOLDER_IMAGE,
    gallery: gallery.length ? gallery : [PLACEHOLDER_IMAGE],
    alt: `Custom ${row.name.toLowerCase()}`,
    badge: row.badge ?? undefined,
    description: row.description,
    features: row.features ?? [],
    materials: row.materials ?? [],
    customizable: row.customizable,
    color: row.color,
    variations: [...(row.product_variations ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ id: v.id, label: v.label, price: v.price })),
    ...(discount ? { discount } : {}),
  };
};

const buildCategoryTree = (rows: CategoryRow[]): Category[] => {
  const childrenOf = new Map<string, CategoryRow[]>();
  const roots: CategoryRow[] = [];
  for (const row of rows) {
    if (row.parent_id) {
      const list = childrenOf.get(row.parent_id) ?? [];
      list.push(row);
      childrenOf.set(row.parent_id, list);
    } else {
      roots.push(row);
    }
  }
  const sort = (a: CategoryRow, b: CategoryRow) => a.sort_order - b.sort_order;
  const node = (row: CategoryRow): Category => {
    const kids = (childrenOf.get(row.id) ?? []).sort(sort).map(node);
    return kids.length
      ? { id: row.id, name: row.name, children: kids }
      : { id: row.id, name: row.name };
  };
  return [{ id: "all", name: "All" }, ...roots.sort(sort).map(node)];
};

export interface ShopData {
  products: ShopProduct[];
  categories: Category[];
}

export async function getShopData(): Promise<ShopData> {
  return cached("shop-data", async () => {
  const supabase = await createClient();

  const [catRes, prodRes, discRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, name, category_id, price, description, badge, customizable, color, features, materials, created_at, active, show_on_home, product_images(url, sort_order), product_variations(id, label, price, sort_order)"
      )
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("discounts")
      .select(
        "id, target_type, target_id, type, value, starts_at, ends_at, active"
      ),
  ]);

  if (catRes.error) throw new Error(`categories: ${catRes.error.message}`);
  if (prodRes.error) throw new Error(`products: ${prodRes.error.message}`);
  if (discRes.error) throw new Error(`discounts: ${discRes.error.message}`);

  // Only build the tree from active categories, then drop any
  // product whose category was deactivated (it can't be reached
  // from the sidebar, so it shouldn't appear anywhere either).
  const categories = buildCategoryTree((catRes.data ?? []) as CategoryRow[]);
  const activeIds = new Set<string>();
  const collect = (cats: Category[]) => {
    for (const c of cats) {
      activeIds.add(c.id);
      if (c.children) collect(c.children);
    }
  };
  collect(categories);

  // Parent lookup so we can walk a product's category path.
  const parentOf = new Map<string, string | null>();
  for (const c of (catRes.data ?? []) as CategoryRow[]) {
    parentOf.set(c.id, c.parent_id);
  }

  // Index live discounts by target id (expired/scheduled are skipped).
  const now = new Date();
  const byTarget = new Map<string, DiscountRow[]>();
  for (const d of (discRes.data ?? []) as DiscountRow[]) {
    if (
      !isDiscountLive(
        { active: d.active, startsAt: d.starts_at, endsAt: d.ends_at },
        now
      )
    ) {
      continue;
    }
    const list = byTarget.get(d.target_id) ?? [];
    list.push(d);
    byTarget.set(d.target_id, list);
  }

  // Best live discount from a list — greatest rupee reduction wins
  // (percent and flat compared by their actual effect on the price).
  const bestFrom = (
    rows: DiscountRow[],
    basePrice: string
  ): EffectiveDiscount | null => {
    if (rows.length === 0) return null;
    const base = parsePrice(basePrice);
    if (base === null) {
      // Custom Price / Rs. 0 — no math is possible, but keeping the
      // discount still shows the sale badge as admin feedback.
      const d = rows[0];
      return { type: d.type, value: Number(d.value), label: discountLabel(d) };
    }
    let best: DiscountRow | null = null;
    let bestFinal = Infinity;
    for (const d of rows) {
      const off =
        d.type === "percent" ? Math.round((base * d.value) / 100) : d.value;
      const final = Math.max(0, base - off);
      if (final < bestFinal) {
        bestFinal = final;
        best = d;
      }
    }
    if (!best) return null;
    return {
      type: best.type,
      value: Number(best.value),
      label: discountLabel(best),
    };
  };

  // Product-level discount wins; otherwise the closest category in
  // the path (child → group) that carries a live discount.
  const resolveDiscount = (row: ProductRow): EffectiveDiscount | null => {
    const productLevel = bestFrom(byTarget.get(row.id) ?? [], row.price);
    if (productLevel) return productLevel;
    let catId: string | null = row.category_id;
    while (catId) {
      const d = bestFrom(byTarget.get(catId) ?? [], row.price);
      if (d) return d;
      catId = parentOf.get(catId) ?? null;
    }
    return null;
  };

  return {
    categories,
    products: (prodRes.data ?? [])
      .filter((p) => activeIds.has(p.category_id))
      .map((p) => toShopProduct(p, resolveDiscount(p) ?? undefined)),
  };
  });
}

export interface ShopProductMeta {
  id: string;
  name: string;
  description: string;
  image: string;
}

// Lightweight product lookup for share metadata — just the fields
// needed for Open Graph previews when a product deep link is shared.
export async function getShopProductMeta(
  id: string
): Promise<ShopProductMeta | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, product_images(url, sort_order)")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`product: ${error.message}`);
  if (!data) return null;
  const gallery = [...((data.product_images ?? []) as ProductImageRow[])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url);
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    image: gallery[0] ?? PLACEHOLDER_IMAGE,
  };
}

export interface HomeFeatured {
  name: string;
  description: string;
  image: string;
  alt: string;
}

// Curated landing-page products (show_on_home) for the home page's
// FeaturedProducts section — fetched server-side (and cached) so the
// Supabase client library never loads in the browser on the home
// page.
export async function getShopFeatured(): Promise<HomeFeatured[]> {
  return cached("featured", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("name, description, product_images(url, sort_order)")
      .eq("show_on_home", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`featured: ${error.message}`);
    return ((data ?? []) as {
      name: string;
      description: string;
      product_images: ProductImageRow[] | null;
    }[])
      .map((p) => {
        const first = [...(p.product_images ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
        return first
          ? {
              name: p.name,
              description: p.description,
              image: first,
              alt: `Custom ${p.name.toLowerCase()}`,
            }
          : null;
      })
      .filter((p): p is HomeFeatured => p !== null);
  });
}

export async function getShopOffers(): Promise<Offer[]> {
  return cached("offers", async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(`offers: ${error.message}`);
  return ((data ?? []) as {
    id: string;
    title: string;
    image_url: string;
    cta_label: string;
    cta_link: string;
    sort_order: number;
  }[]).map((o) => ({
    id: o.id,
    title: o.title,
    image: o.image_url,
    ctaLabel: o.cta_label,
    ctaLink: o.cta_link,
    active: true,
    sortOrder: o.sort_order,
  }));
  });
}

export async function getShopGallery(onlyHome = false): Promise<GalleryTile[]> {
  return cached(`gallery:${onlyHome}`, async () => {
  const supabase = await createClient();
  let query = supabase
    .from("gallery_items")
    .select("*, gallery_item_categories(category_id)");
  if (onlyHome) query = query.eq("show_on_home", true);
  const { data, error } = await query.order("sort_order");
  if (error) throw new Error(`gallery: ${error.message}`);
  return ((data ?? []) as GalleryRow[]).map((g): GalleryTile => {
    const categories: string[] = [];
    const push = (id: string | null | undefined) => {
      if (id && !categories.includes(id)) categories.push(id);
    };
    push(g.category_id);
    for (const row of g.gallery_item_categories ?? []) push(row.category_id);
    return {
      id: g.id,
      title: g.title,
      categoryId: categories[0] ?? null,
      categories,
      image: g.image_url,
      color: g.color,
      span: g.span,
    };
  });
  });
}

interface GalleryRow {
  id: string;
  title: string;
  category_id: string | null;
  image_url: string;
  color: string;
  span: string;
  gallery_item_categories?: { category_id: string }[] | null;
}

// The active category tree for the /gallery sidebar — same source
// and shape as the shop's, cached like the other public reads.
export async function getShopCategories(): Promise<Category[]> {
  return cached("gallery-categories", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw new Error(`gallery categories: ${error.message}`);
    return buildCategoryTree((data ?? []) as CategoryRow[]);
  });
}

export async function getShopSettings(): Promise<ShopSettings> {
  return cached("settings", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", DELIVERY_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw new Error(`settings: ${error.message}`);
    return normalizeSettings(data?.value);
  });
}

export async function getShopSignboardSettings(): Promise<SignboardSettings> {
  return cached("settings-signboard", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SIGNBOARD_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw new Error(`settings-signboard: ${error.message}`);
    return normalizeSignboardSettings(data?.value);
  });
}
