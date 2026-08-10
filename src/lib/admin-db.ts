"use client";

// ============================================================
// ADMIN DB — async Supabase data layer for the admin panel.
// Reads and writes use the browser client with the logged-in
// session; RLS grants the authenticated role full CRUD on the
// shop tables. Image uploads go through /api/admin/upload,
// which uses the service role server-side (storage.objects RLS
// can't be created programmatically, so we bypass it there).
// ============================================================

import { createClient } from "@/lib/supabase/client";
import {
  DELIVERY_SETTINGS_KEY,
  normalizeSettings,
  normalizeSignboardSettings,
  SIGNBOARD_SETTINGS_KEY,
  type ShopSettings,
  type SignboardSettings,
} from "@/lib/settings";
import type {
  Category,
  DiscountCampaign,
  Offer,
  ShopProduct,
} from "@/components/shop/data";

export interface GalleryTile {
  id: string;
  title: string;
  /** PRIMARY category id (first selection) — drives the home page caption. */
  categoryId: string | null;
  /** Every category the tile lives under (primary first). */
  categories: string[];
  image: string;
  /** Brand tint for badges/glow — derived from the primary category in the UI. */
  color: string;
  span: string;
  /** Appears on the home page "Our Craft" section when true */
  showOnHome: boolean;
  /** Read-only — set when the tile mirrors a shop product ("Add to Gallery also"). */
  productId: string | null;
}

const PLACEHOLDER_IMAGE = "/images/aof-logo.png";

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Cache the client — sessions are read from cookies per request,
// so reusing the instance is safe even across sign-in/sign-out.
let cachedClient: ReturnType<typeof createClient> | null = null;
const db = () => {
  if (!cachedClient) cachedClient = createClient();
  return cachedClient;
};

// ── Row ⇄ UI mapping ────────────────────────────────────────

interface ImageRow {
  url: string;
  sort_order: number;
}

interface VariationRow {
  id: string;
  label: string;
  price: string;
  sort_order: number;
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
  product_images: ImageRow[] | null;
  product_variations: VariationRow[] | null;
  /** Linked gallery tile ("Add to Gallery also") */
  gallery_items: { product_id: string }[] | null;
}

const toShopProduct = (row: ProductRow): ShopProduct => {
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
    inGallery: (row.gallery_items?.length ?? 0) > 0,
  };
};

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
}

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
      ? { id: row.id, name: row.name, active: row.active, children: kids }
      : { id: row.id, name: row.name, active: row.active };
  };
  return [{ id: "all", name: "All" }, ...roots.sort(sort).map(node)];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

// Ensures a unique slug for a new category (ids must stay stable
// because products reference them).
async function uniqueCategoryId(base: string): Promise<string> {
  let id = base;
  let n = 2;
  for (;;) {
    const { data } = await db()
      .from("categories")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!data) return id;
    id = `${base}-${n++}`;
  }
}

// ── Products ────────────────────────────────────────────────

// Single-flight for concurrent reads: dev StrictMode fires each
// page's effect twice back-to-back, and two identical queries
// should share ONE network request instead of doubling the load.
// No caching — only concurrent calls are deduped.
const inflight = new Map<string, Promise<unknown>>();
function once<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = loader().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export interface ProductSummary {
  id: string;
  name: string;
  categoryId: string;
  price: string;
  badge: string | null;
  active: boolean;
  showOnHome: boolean;
  createdAt: string;
  image: string;
  variationCount: number;
  /** Variation prices — lets the list flag "needs a real price". */
  variationPrices: string[];
}

// Lightweight list payload — enough for the products table, the
// discounts target picker and the overview's recent list. Avoids
// the nested description/features/materials payload of getProduct.
export async function getProductSummaries(
  limit?: number
): Promise<ProductSummary[]> {
  return once(`products-summary:${limit ?? "all"}`, async () => {
    let q = db()
      .from("products")
      .select(
        "id, name, category_id, price, badge, active, show_on_home, created_at, product_images(url), product_variations(price)"
      )
      .order("created_at", { ascending: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.category_id,
      price: r.price,
      badge: r.badge,
      active: r.active,
      showOnHome: r.show_on_home,
      createdAt: r.created_at,
      image: r.product_images?.[0]?.url ?? PLACEHOLDER_IMAGE,
      variationCount: r.product_variations?.length ?? 0,
      variationPrices: (r.product_variations ?? []).map((v: { price: string }) => v.price),
    }));
  });
}

// Full single product — fetched on demand when the editor opens
// (one row instead of the whole catalog).
export async function getProduct(id: string): Promise<ShopProduct | null> {
  return once(`product:${id}`, async () => {
    const { data, error } = await db()
      .from("products")
      .select(
        "id, name, category_id, price, description, badge, customizable, color, features, materials, created_at, active, show_on_home, product_images(url, sort_order), product_variations(id, label, price, sort_order), gallery_items(product_id)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toShopProduct(data) : null;
  });
}

export async function getProductCount(): Promise<number> {
  return once("products-count", async () => {
    const { count, error } = await db()
      .from("products")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  });
}

// id + category only — used by the categories page delete guards
// (products stay leaf-only, so a group delete checks its leaves).
export async function getProductCategoryIds(): Promise<
  { id: string; categoryId: string }[]
> {
  return once("products-category-ids", async () => {
    const { data, error } = await db()
      .from("products")
      .select("id, category_id");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      categoryId: r.category_id,
    }));
  });
}

export async function saveProduct(p: ShopProduct): Promise<void> {
  const client = db();
  // created_at is omitted when empty so a new product gets the
  // table default (current_date) — the admin form no longer picks it.
  const { error } = await client.from("products").upsert(
    {
      id: p.id,
      name: p.name,
      category_id: p.categoryId,
      price: p.price,
      description: p.description,
      badge: p.badge ?? null,
      customizable: p.customizable,
      color: p.color,
      features: p.features,
      materials: p.materials,
      created_at: p.createdAt || undefined,
      active: p.active,
      show_on_home: p.showOnHome,
    },
    { onConflict: "id" }
  );
  if (error) throw error;

  // Replace images and variations in PARALLEL — two round-trip
  // phases instead of four sequential ones (deletes can't overlap
  // their own inserts, but the two resources are independent).
  const [delImg, delVar] = await Promise.all([
    client.from("product_images").delete().eq("product_id", p.id),
    client.from("product_variations").delete().eq("product_id", p.id),
  ]);
  if (delImg.error) throw delImg.error;
  if (delVar.error) throw delVar.error;

  const inserts = await Promise.all([
    p.gallery.length
      ? client.from("product_images").insert(
          p.gallery.map((url, i) => ({
            product_id: p.id,
            url,
            sort_order: i + 1,
          }))
        )
      : Promise.resolve({ error: null }),
    p.variations.length
      ? client.from("product_variations").insert(
          p.variations.map((v, i) => ({
            product_id: p.id,
            label: v.label,
            price: v.price,
            sort_order: i + 1,
          }))
        )
      : Promise.resolve({ error: null }),
  ]);
  const firstErr = inserts.find((r) => r.error);
  if (firstErr?.error) throw firstErr.error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const { error } = await db().from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function setProductHome(id: string, showOnHome: boolean): Promise<void> {
  const { error } = await db()
    .from("products")
    .update({ show_on_home: showOnHome })
    .eq("id", id);
  if (error) throw error;
}

// ── Discounts (scheduled sales) ─────────────────────────────

const toDiscount = (r: {
  id: string;
  target_type: "product" | "category";
  target_id: string;
  type: "percent" | "flat";
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}): DiscountCampaign => ({
  id: r.id,
  targetType: r.target_type,
  targetId: r.target_id,
  type: r.type,
  value: Number(r.value),
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  active: r.active,
});

export async function getDiscounts(): Promise<DiscountCampaign[]> {
  return once("discounts", async () => {
  const { data, error } = await db()
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toDiscount);
  });
}

export async function saveDiscount(d: DiscountCampaign): Promise<void> {
  const { error } = await db()
    .from("discounts")
    .upsert(
      {
        id: d.id,
        target_type: d.targetType,
        target_id: d.targetId,
        type: d.type,
        value: d.value,
        starts_at: d.startsAt,
        ends_at: d.endsAt,
        active: d.active,
      },
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function deleteDiscount(id: string): Promise<void> {
  const { error } = await db().from("discounts").delete().eq("id", id);
  if (error) throw error;
}

export async function setDiscountActive(
  id: string,
  active: boolean
): Promise<void> {
  const { error } = await db()
    .from("discounts")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

// ── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return once("categories", async () => {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return buildCategoryTree((data ?? []) as CategoryRow[]);
  });
}

export async function addCategoryGroup(name: string): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("categories")
    .select("sort_order")
    .is("parent_id", null);
  if (error) throw error;
  const id = await uniqueCategoryId(slugify(name));
  const { error: insErr } = await client.from("categories").insert({
    id,
    name,
    parent_id: null,
    sort_order: (data?.length ?? 0) + 1,
  });
  if (insErr) throw insErr;
}

export async function renameCategoryGroup(id: string, name: string): Promise<void> {
  const { error } = await db()
    .from("categories")
    .update({ name })
    .eq("id", id)
    .is("parent_id", null);
  if (error) throw error;
}

export async function deleteCategoryGroup(id: string): Promise<void> {
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function addCategoryChild(groupId: string, name: string): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("categories")
    .select("sort_order")
    .eq("parent_id", groupId);
  if (error) throw error;
  const id = await uniqueCategoryId(slugify(name));
  const { error: insErr } = await client.from("categories").insert({
    id,
    name,
    parent_id: groupId,
    sort_order: (data?.length ?? 0) + 1,
  });
  if (insErr) throw insErr;
}

export async function renameCategoryChild(childId: string, name: string): Promise<void> {
  const { error } = await db().from("categories").update({ name }).eq("id", childId);
  if (error) throw error;
}

export async function deleteCategoryChild(childId: string): Promise<void> {
  const { error } = await db().from("categories").delete().eq("id", childId);
  if (error) throw error;
}

export async function setCategoryActive(id: string, active: boolean): Promise<void> {
  const { error } = await db()
    .from("categories")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Swap a category's position with its neighbour (dir = -1 | 1).
 *
 * Reordering swaps sort_order between two adjacent SIBLINGS only
 * (groups among groups, children among children of the same
 * parent) — never across levels. Implemented as two narrow UPDATEs
 * rather than a bulk upsert: an upsert that only sends id + sort_order
 * fails with 23502 because categories.name is NOT NULL and PostgREST
 * validates the proposed row even on conflict.
 */
export async function moveCategory(id: string, dir: -1 | 1): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("categories")
    .select("id, parent_id, sort_order")
    .order("sort_order");
  if (error) throw error;
  const rows = data ?? [];
  const target = rows.find((c) => c.id === id);
  if (!target) return;
  const parentId = target.parent_id ?? null;
  const siblings = rows.filter((c) => (c.parent_id ?? null) === parentId);
  const i = siblings.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= siblings.length) return;
  const a = siblings[i];
  const b = siblings[j];
  const { error: e1 } = await client
    .from("categories")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (e1) throw e1;
  const { error: e2 } = await client
    .from("categories")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  if (e2) throw e2;
}

// ── Gallery ─────────────────────────────────────────────────

export async function getGalleryCount(): Promise<number> {
  return once("gallery-count", async () => {
    const { count, error } = await db()
      .from("gallery_items")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  });
}

// category_id + product_id only — delete guards don't need the
// full join rows.
export async function getGalleryCategoryIds(): Promise<
  { categoryId: string | null; productId: string | null }[]
> {
  return once("gallery-category-ids", async () => {
    const { data, error } = await db()
      .from("gallery_items")
      .select("category_id, product_id");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      categoryId: r.category_id ?? null,
      productId: r.product_id ?? null,
    }));
  });
}

// A tile's full category set: the join rows plus the primary
// (category_id) as a defensive fallback — deduped, primary first.
const tileCategories = (g: {
  category_id?: string | null;
  gallery_item_categories?: { category_id: string }[] | null;
}): string[] => {
  const ids: string[] = [];
  const push = (id: string | null | undefined) => {
    if (id && !ids.includes(id)) ids.push(id);
  };
  push(g.category_id);
  for (const row of g.gallery_item_categories ?? []) push(row.category_id);
  return ids;
};

export async function getGallery(): Promise<GalleryTile[]> {
  return once("gallery", async () => {
  const { data, error } = await db()
    .from("gallery_items")
    .select("*, gallery_item_categories(category_id)")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((g) => {
    const categories = tileCategories(g);
    return {
      id: g.id,
      title: g.title,
      categoryId: categories[0] ?? null,
      categories,
      image: g.image_url,
      color: g.color,
      span: g.span,
      showOnHome: g.show_on_home,
      productId: g.product_id ?? null,
    };
  });
  });
}

// Replaces a tile's full category set — join rows first, then the
// denormalized primary on gallery_items (first category).
async function writeTileCategories(
  client: ReturnType<typeof db>,
  itemId: string,
  categories: string[]
): Promise<string[]> {
  const ids = [...new Set(categories.map((c) => c.trim()).filter(Boolean))];
  const { error: delErr } = await client
    .from("gallery_item_categories")
    .delete()
    .eq("gallery_item_id", itemId);
  if (delErr) throw delErr;
  if (ids.length) {
    const { error: insErr } = await client
      .from("gallery_item_categories")
      .insert(ids.map((category_id) => ({ gallery_item_id: itemId, category_id })));
    if (insErr) throw insErr;
  }
  return ids;
}

export async function saveGalleryItem(item: GalleryTile): Promise<void> {
  const client = db();
  const ids = [...new Set(item.categories.map((c) => c.trim()).filter(Boolean))];
  const { error } = await client.from("gallery_items").upsert(
    {
      id: item.id,
      title: item.title,
      category_id: ids[0] ?? null,
      image_url: item.image,
      color: item.color,
      span: item.span,
      show_on_home: item.showOnHome,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  await writeTileCategories(client, item.id, ids);
}

export async function setGalleryHome(id: string, showOnHome: boolean): Promise<void> {
  const { error } = await db()
    .from("gallery_items")
    .update({ show_on_home: showOnHome })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const { error } = await db().from("gallery_items").delete().eq("id", id);
  if (error) throw error;
}

// ── Product → gallery linked tile ("Add to Gallery also") ────
// D3: toggle on upserts ONE tile mirroring the product (title,
// category, first image, tint) keyed by product_id; toggle off
// removes it. Idempotent — re-saving never duplicates, and the
// FK cascade cleans up the tile when the product is deleted.
export async function syncProductGalleryTile(p: {
  productId: string;
  name: string;
  categoryId: string;
  image: string | null;
  color: string;
  addToGallery: boolean;
}): Promise<void> {
  const client = db();
  if (!p.addToGallery || !p.image) {
    const { error } = await client
      .from("gallery_items")
      .delete()
      .eq("product_id", p.productId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("gallery_items").upsert(
    {
      product_id: p.productId,
      title: p.name,
      category_id: p.categoryId || null,
      image_url: p.image,
      color: p.color,
      span: "",
      show_on_home: false,
    },
    { onConflict: "product_id" }
  );
  if (error) throw error;
}

// ── Quick status toggles (list rows, no full edit) ───────────


// ── Offers (shop carousel) ──────────────────────────────────

export async function getOffers(): Promise<Offer[]> {
  return once("offers", async () => {
  const { data, error } = await db()
    .from("offers")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    image: o.image_url,
    ctaLabel: o.cta_label,
    ctaLink: o.cta_link,
    active: o.active,
    sortOrder: o.sort_order,
  }));
  });
}

export async function saveOffer(o: Offer): Promise<void> {
  const { error } = await db()
    .from("offers")
    .upsert(
      {
        id: o.id,
        title: o.title,
        image_url: o.image,
        cta_label: o.ctaLabel,
        cta_link: o.ctaLink,
        active: o.active,
        sort_order: o.sortOrder,
      },
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await db().from("offers").delete().eq("id", id);
  if (error) throw error;
}

export async function setOfferActive(id: string, active: boolean): Promise<void> {
  const { error } = await db().from("offers").update({ active }).eq("id", id);
  if (error) throw error;
}

/** Swap an offer's position with its neighbour (dir = -1 | 1). */
export async function moveOffer(id: string, dir: -1 | 1): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("offers")
    .select("id, sort_order")
    .order("sort_order");
  if (error) throw error;
  const list = data ?? [];
  const i = list.findIndex((o) => o.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i];
  const b = list[j];
  const { error: e1 } = await client
    .from("offers")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  if (e1) throw e1;
  const { error: e2 } = await client
    .from("offers")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  if (e2) throw e2;
}

// ── Store settings (General page) ───────────────────────────

export async function getSettings(): Promise<ShopSettings> {
  const { data, error } = await db()
    .from("settings")
    .select("value")
    .eq("key", DELIVERY_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return normalizeSettings(data?.value);
}

export async function saveSettings(s: ShopSettings): Promise<void> {
  const { error } = await db().from("settings").upsert(
    {
      key: DELIVERY_SETTINGS_KEY,
      value: { deliveryCharge: Math.max(0, Math.round(s.deliveryCharge)) },
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}

export async function getSignboardSettings(): Promise<SignboardSettings> {
  const { data, error } = await db()
    .from("settings")
    .select("value")
    .eq("key", SIGNBOARD_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return normalizeSignboardSettings(data?.value);
}

export async function saveSignboardSettings(s: SignboardSettings): Promise<void> {
  const { error } = await db().from("settings").upsert(
    {
      key: SIGNBOARD_SETTINGS_KEY,
      value: {
        materials: s.materials.map((m) => ({
          id: m.id,
          name: m.name.trim() || "Material",
          ratePerSqft: Math.max(1, Math.round(m.ratePerSqft)),
          layerPrice: Math.max(0, Math.round(m.layerPrice)),
        })),
        minCharge: Math.max(0, Math.round(s.minCharge)),
        roundTo: Math.max(1, Math.round(s.roundTo)),
      },
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}

// ── Image upload (service-role route) ───────────────────────

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error(body.error ?? "Upload failed");
  }
  return body.url;
}

// True when the URL points at an object in our public product-images
// bucket — only those can be removed from the client (via the admin
// route); local /images/… assets are left untouched.
export function isStoredImage(url: string): boolean {
  return url.includes("/storage/v1/object/public/product-images/");
}

export async function deleteImage(url: string): Promise<void> {
  const res = await fetch("/api/admin/delete-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Delete failed");
}
