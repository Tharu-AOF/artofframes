"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  UploadCloud,
  Star,
} from "lucide-react";
import {
  AButton,
  ACard,
  ADrawer,
  AInput,
  ATextarea,
  ASelect,
  ASelectSearchable,
  AToggle,
  PageHeader,
} from "@/components/admin/ui";
import {
  deleteProduct,
  getCategories,
  getProduct,
  getProductSummaries,
  newId,
  saveProduct,
  setProductActive,
  setProductHome,
  syncProductGalleryTile,
  uploadImage,
  type ProductSummary,
} from "@/lib/admin-db";
import {
  getCategory,
  getCategoryAccent,
  getCategoryPath,
  getCategoryPathName,
  getLeafIds,
  type Category,
  type ProductVariation,
  type ShopProduct,
} from "@/components/shop/data";

// ============================================================
// PRODUCTS — list + editor backed by Supabase. Images are added
// by uploading a file (uploaded to the product-images bucket via
// /api/admin/upload).
// ============================================================

interface Draft {
  name: string;
  price: string;
  categoryId: string;
  badge: string;
  color: string;
  createdAt: string;
  description: string;
  features: string;
  materials: string;
  customizable: boolean;
  gallery: string[];
  variations: ProductVariation[];
  active: boolean;
  showOnHome: boolean;
  /** Mirror this product as a gallery tile ("Add to Gallery also"). */
  addToGallery: boolean;
}

const emptyDraft = (categoryId: string): Draft => ({
  name: "",
  price: "",
  categoryId,
  badge: "",
  color: "#CCA681",
  // New products let Supabase stamp created_at (defaults to today).
  createdAt: "",
  description: "",
  features: "",
  materials: "",
  customizable: false,
  gallery: [],
  variations: [],
  active: true,
  showOnHome: false,
  addToGallery: false,
});

const toDraft = (p: ShopProduct): Draft => ({
  name: p.name,
  price: p.price,
  categoryId: p.categoryId,
  badge: p.badge ?? "",
  color: p.color,
  createdAt: p.createdAt,
  description: p.description,
  features: p.features.join("\n"),
  materials: p.materials.join("\n"),
  customizable: p.customizable,
  gallery: [...p.gallery],
  variations: p.variations.map((v) => ({ ...v })),
  active: p.active,
  showOnHome: p.showOnHome,
  addToGallery: p.inGallery ?? false,
});

// A price is a placeholder when it's "Rs. 0" or "Custom Price".
const isPlaceholderPrice = (price: string) =>
  /^(rs\.\s*0|custom price)$/i.test(price.trim());

// A product truly needs a price when its base is a placeholder AND
// none of its variations carry a real price.
const needsPrice = (p: { price: string; variationPrices: string[] }) =>
  isPlaceholderPrice(p.price) &&
  !p.variationPrices.some((v) => !isPlaceholderPrice(v));

const toProduct = (d: Draft, existing?: ShopProduct): ShopProduct => ({
  id: existing?.id ?? newId(),
  name: d.name,
  categoryId: d.categoryId,
  price: d.price,
  image: d.gallery[0] ?? "/images/aof-logo.png",
  gallery: d.gallery,
  inGallery: d.addToGallery,
  // Drop half-typed rows so blank options never reach the shop.
  variations: d.variations.filter((v) => v.label.trim() !== ""),
  alt: `${d.name} product`,
  badge: d.badge || undefined,
  description: d.description,
  features: d.features.split("\n").map((s) => s.trim()).filter(Boolean),
  materials: d.materials.split("\n").map((s) => s.trim()).filter(Boolean),
  customizable: d.customizable,
  // Card tint is no longer hand-picked — new products inherit the
  // accent of their category (like gallery tiles); edits keep their
  // stored color. New products also skip created_at so Supabase's
  // current_date default applies.
  color: existing ? existing.color : getCategoryAccent(d.categoryId),
  createdAt: existing ? existing.createdAt : "",
  active: d.active,
  showOnHome: d.showOnHome,
});

export default function AdminProducts() {
  const [list, setList] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "missing" | "set">(
    "all"
  );
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // The drawer keeps its own open flag so the form content (bound to
  // `draft`) stays mounted through the slide-out animation; the draft
  // is cleared once the exit completes.
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Ids with a quick-toggle in flight — guards against double
  // clicks racing two PATCHes.
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [prods, cats] = await Promise.all([
          getProductSummaries(),
          getCategories(),
        ]);
        if (!active) return;
        setList(prods);
        setCategories(cats);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load products");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Leaf categories only (products always sit on a leaf), labelled
  // with the full path like the gallery picker — e.g. "Hotel Items ·
  // Coaster". Resolved against the top-level tree so nested leaves
  // keep their group prefix.
  const leafOptions = useMemo(() => {
    const walk = (tree: Category[]): { value: string; label: string }[] =>
      tree.flatMap((c) =>
        c.children
          ? walk(c.children)
          : c.id === "all"
            ? []
            : [
                {
                  value: c.id,
                  label: getCategoryPathName(c.id, categories),
                },
              ]
      );
    return walk(categories);
  }, [categories]);

  // Counts per category (groups aggregate their leaves) — shown
  // in the category filter dropdown.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of list) {
      for (const c of getCategoryPath(p.categoryId, categories)) {
        counts[c.id] = (counts[c.id] ?? 0) + 1;
      }
    }
    return counts;
  }, [list, categories]);

  const categoryOptions = useMemo(() => {
    const walk = (tree: Category[]): { value: string; label: string }[] =>
      tree.flatMap((c) =>
        c.id === "all"
          ? []
          : c.children
            ? [
                {
                  value: c.id,
                  label: `${c.name} (${categoryCounts[c.id] ?? 0})`,
                },
                ...walk(c.children),
              ]
            : [
                {
                  value: c.id,
                  label: `${getCategoryPathName(c.id, categories)} (${
                    categoryCounts[c.id] ?? 0
                  })`,
                },
              ]
      );
    return [{ value: "all", label: `All categories (${list.length})` }, ...walk(categories)];
  }, [categories, categoryCounts, list.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((p) => {
      if (categoryFilter !== "all") {
        const cat = getCategory(categoryFilter, categories);
        if (cat && !getLeafIds(cat).includes(p.categoryId)) return false;
      }
      if (priceFilter !== "all") {
        const missing = needsPrice(p);
        if (priceFilter === "missing" ? !missing : missing) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        getCategoryPathName(p.categoryId, categories).toLowerCase().includes(q)
      );
    });
  }, [list, query, categories, categoryFilter, priceFilter]);

  const filtersActive =
    categoryFilter !== "all" || priceFilter !== "all" || query.trim() !== "";

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("all");
    setPriceFilter("all");
  };

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft(leafOptions[0]?.value ?? "all"));
    setEditorOpen(true);
  };

  // The list only holds light summaries — fetch the full product
  // (one row) when the editor opens.
  const openEdit = async (p: ProductSummary) => {
    try {
      const full = await getProduct(p.id);
      if (!full) return;
      setEditing(full);
      setDraft(toDraft(full));
      setEditorOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product");
    }
  };

  // Closing only hides the drawer — the draft/editing snapshots are
  // cleared once the slide-out finishes so the form stays intact
  // while it animates away.
  const closeEditor = () => {
    setEditorOpen(false);
  };

  const onEditorClosed = () => {
    setDraft(null);
    setEditing(null);
  };

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      const product = toProduct(draft, editing ?? undefined);
      await saveProduct(product);
      // "Add to Gallery also" — keep the linked tile in sync with
      // the product (upsert mirror / delete when turned off).
      await syncProductGalleryTile({
        productId: product.id,
        name: product.name,
        categoryId: product.categoryId,
        image: product.gallery[0] ?? null,
        color: product.color,
        addToGallery: draft.addToGallery,
      });
      // Patch the list locally — no full refetch after a save.
      const summary: ProductSummary = {
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        price: product.price,
        badge: product.badge ?? null,
        active: product.active,
        showOnHome: product.showOnHome,
        // New products get the DB default (today); display matches.
        createdAt: product.createdAt || new Date().toISOString().slice(0, 10),
        image: product.image,
        variationCount: product.variations.length,
        variationPrices: product.variations.map((v) => v.price),
      };
      setList((ls) =>
        editing
          ? ls.map((x) => (x.id === summary.id ? summary : x))
          : [summary, ...ls]
      );
      closeEditor();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: ProductSummary) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      setList((ls) => ls.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product");
    }
  };

  // Quick toggles — update the DB and patch the local list so the
  // row reflects the change instantly without a full reload.
  const withPending = (id: string, fn: () => Promise<void>) => {
    if (pending.has(id)) return;
    setPending((s) => new Set(s).add(id));
    void fn().finally(() =>
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      })
    );
  };

  const toggleActive = (p: ProductSummary) =>
    withPending(p.id, async () => {
      try {
        await setProductActive(p.id, !p.active);
        setList((ls) =>
          ls.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update status");
      }
    });

  const toggleHome = (p: ProductSummary) =>
    withPending(p.id, async () => {
      try {
        await setProductHome(p.id, !p.showOnHome);
        setList((ls) =>
          ls.map((x) =>
            x.id === p.id ? { ...x, showOnHome: !p.showOnHome } : x
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update landing flag");
      }
    });

  const moveImage = (index: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.gallery];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft({ ...draft, gallery: next });
  };

  const addVariation = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      variations: [...draft.variations, { id: newId(), label: "", price: "" }],
    });
  };

  const setVariation = (i: number, key: "label" | "price", val: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      variations: draft.variations.map((v, j) =>
        j === i ? { ...v, [key]: val } : v
      ),
    });
  };

  const removeVariation = (i: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      variations: draft.variations.filter((_, j) => j !== i),
    });
  };

  const handleUpload = async (file: File | undefined) => {
    if (!draft || !file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft({ ...draft, gallery: [...draft.gallery, url] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Products"
        subtitle={`${list.length} products in the shop`}
        actions={
          <AButton variant="gold" onClick={openNew}>
            <Plus size={14} /> Add Product
          </AButton>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filters — search + category + price status */}
      <div className="mt-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="h-10 w-full rounded-lg border border-white/15 bg-black/25 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
          />
        </label>
        <ASelectSearchable
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
        />
        <ASelect
          label="Price"
          value={priceFilter}
          onChange={(v) => setPriceFilter(v as "all" | "missing" | "set")}
          options={[
            { value: "all", label: "All prices" },
            { value: "missing", label: "Needs a price (Rs. 0 / Custom)" },
            { value: "set", label: "Has a real price" },
          ]}
        />
      </div>

      {/* Result summary + clear */}
      <div className="mt-3 flex items-center gap-3">
        <p className="text-xs text-gray-500" aria-live="polite">
          Showing <span className="font-semibold text-[#CCA681]">{filtered.length}</span>{" "}
          of {list.length} products
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer text-[11px] font-semibold uppercase tracking-widest text-gray-400 underline-offset-4 transition-colors hover:text-[#CCA681] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Editor — slide-over drawer */}
      <ADrawer
        open={editorOpen}
        onClose={closeEditor}
        onClosed={onEditorClosed}
        title={editing ? `Edit — ${editing.name}` : "New Product"}
        subtitle="Products shown in the shop; edits commit on Save"
        size="xl"
        footer={
          draft ? (
            <div className="flex justify-end gap-2.5">
              <AButton variant="outline" onClick={closeEditor}>
                Cancel
              </AButton>
              <AButton
                variant="gold"
                onClick={() => void save()}
                disabled={
                  saving || !draft.name.trim() || draft.gallery.length === 0
                }
              >
                <Save size={14} /> {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </AButton>
            </div>
          ) : undefined
        }
      >
        {draft && (
          <>
            {/* Two-column body — essentials left, settings right */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
              {/* ── Left column ── */}
              <div className="min-w-0">
                {/* ── Details ── */}
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                  Details
                </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AInput
                label="Name"
                value={draft.name}
                onChange={(v) => set({ name: v })}
                placeholder="Custom villa keychain"
              />
              <AInput
                label="Price"
                value={draft.price}
                onChange={(v) => set({ price: v })}
                placeholder="Rs. 450"
                hint="Base price shown on the shop card"
              />
            </div>
            <div className="mt-4">
              <ASelectSearchable
                label="Category"
                value={draft.categoryId}
                onChange={(v) => set({ categoryId: v })}
                options={leafOptions}
              />
            </div>
                <div className="mt-4">
                  <AInput
                    label="Badge"
                    value={draft.badge}
                    onChange={(v) => set({ badge: v })}
                    placeholder="Bestseller (optional)"
                    hint="Small chip shown on the shop card"
                  />
                </div>

                {/* ── Description & content ── */}
                <div className="mt-6 border-t border-white/5 pt-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                    Description & content
                  </p>
                  <ATextarea
                    label="Description"
                    value={draft.description}
                    onChange={(v) => set({ description: v })}
                    rows={4}
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <ATextarea
                      label="Features (one per line)"
                      value={draft.features}
                      onChange={(v) => set({ features: v })}
                      rows={4}
                    />
                    <ATextarea
                      label="Materials (one per line)"
                      value={draft.materials}
                      onChange={(v) => set({ materials: v })}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="min-w-0">
                {/* ── Visibility ── */}
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3.5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                    Visibility
                  </p>
                  <div className="grid gap-y-3">
                    <AToggle
                      label="Active — visible in the shop"
                      checked={draft.active}
                      onChange={(v) => set({ active: v })}
                    />
                    <AToggle
                      label="Show on landing page"
                      checked={draft.showOnHome}
                      onChange={(v) => set({ showOnHome: v })}
                    />
                    <AToggle
                      label="Customizable"
                      checked={draft.customizable}
                      onChange={(v) => set({ customizable: v })}
                    />
                    <AToggle
                      label="Add to Gallery also"
                      checked={draft.addToGallery}
                      onChange={(v) => set({ addToGallery: v })}
                    />
                  </div>
                  {draft.customizable && (
                    <p className="mt-2 text-xs text-gray-500">
                      Shows a “Customizable” badge on the shop card.
                    </p>
                  )}
                  {draft.addToGallery && (
                    <p className="mt-2 text-xs text-gray-500">
                      Creates a tile in the “Our Craft” gallery mirroring this
                      product — uses its first image, name and category. Turn it
                      off (or delete the product) to remove the tile.
                    </p>
                  )}
                </div>

                {/* ── Images ── */}
                <div className="mt-6 border-t border-white/5 pt-5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                    Images
                  </p>
                  <p className="mb-3 text-xs text-gray-500">
                    First image is the card image
                    {draft.gallery.length === 0 && (
                      <span className="ml-1.5 text-[#E9A23B]">— at least one required</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
              {draft.gallery.map((src, i) => (
                <div key={`${src}-${i}`} className="group relative">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <Image
                      src={src}
                      alt={`Image ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  {i === 0 && (
                    <span className="absolute -left-1.5 -top-1.5 rounded-full bg-[#CCA681] px-1.5 text-[9px] font-bold text-[#5A1020]">
                      1st
                    </span>
                  )}
                  <span className="absolute right-1 top-1 flex gap-1">
                    <button
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      aria-label="Move image up"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-black/70 text-gray-300 transition-colors hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => moveImage(i, 1)}
                      disabled={i === draft.gallery.length - 1}
                      aria-label="Move image down"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-black/70 text-gray-300 transition-colors hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </span>
                  <button
                    onClick={() =>
                      set({ gallery: draft.gallery.filter((_, j) => j !== i) })
                    }
                    aria-label="Remove image"
                    className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-red-400/40 bg-[#0a0a14] text-red-300 transition-all hover:bg-red-500/20"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {/* Add image — upload from device */}
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CCA681]/40 bg-[#CCA681]/5 px-3 text-xs font-semibold text-[#CCA681] transition-all hover:bg-[#CCA681]/10">
                <UploadCloud size={14} />
                {uploading ? "Uploading…" : "Upload from device"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    void handleUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                  </label>
                </div>
              </div>

                {/* ── Variations ── */}
                <div className="mt-6 border-t border-white/5 pt-5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                    Variations
                  </p>
                  <p className="mb-3 text-xs text-gray-500">
                    Optional options (size / material / tier) shown in the
                    details modal with their own price.
                  </p>
            {draft.variations.length > 0 && (
              <div className="flex flex-col gap-2">
                {draft.variations.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <input
                      value={v.label}
                      onChange={(e) => setVariation(i, "label", e.target.value)}
                      aria-label={`Variation ${i + 1} label`}
                      placeholder="e.g. Small 12in / 5+ pcs / Acrylic"
                      className="h-10 flex-1 rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
                    />
                    <input
                      value={v.price}
                      onChange={(e) => setVariation(i, "price", e.target.value)}
                      aria-label={`Variation ${i + 1} price`}
                      placeholder="Rs. 2,500"
                      className="h-10 w-36 rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681] sm:w-44"
                    />
                    <button
                      onClick={() => removeVariation(i)}
                      aria-label="Remove variation"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
                  <button
                    onClick={addVariation}
                    className="mt-2 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[#CCA681]/40 bg-[#CCA681]/5 px-3 text-xs font-semibold text-[#CCA681] transition-all hover:bg-[#CCA681]/10"
                  >
                    <Plus size={13} /> Add variation
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </ADrawer>

      {/* List */}
      <ACard className="mt-5 overflow-hidden">
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-gray-500">
            Loading products…
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-gray-500">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Added</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                          <Image
                            src={p.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{p.name}</p>
                          {p.badge && (
                            <p className="text-[10px] uppercase tracking-widest text-[#CCA681]">
                              {p.badge}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {getCategoryPathName(p.categoryId, categories)}
                    </td>
                    <td
                      className={`px-5 py-3 text-xs ${
                        needsPrice(p)
                          ? "font-semibold text-[#E9A23B]"
                          : "text-[#CCA681]"
                      }`}
                    >
                      {p.price}
                      {p.variationCount > 0 && (
                        <span className="ml-1.5 text-[10px] font-normal text-gray-500">
                          · {p.variationCount} options
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <AToggle
                          title={`${p.name} — active in shop`}
                          checked={p.active}
                          disabled={pending.has(p.id)}
                          onChange={() => void toggleActive(p)}
                        />
                        <button
                          onClick={() => void toggleHome(p)}
                          disabled={pending.has(p.id)}
                          aria-label={`${p.name} — ${p.showOnHome ? "remove from" : "add to"} landing page`}
                          title={p.showOnHome ? "On landing page" : "Not on landing page"}
                          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
                            p.showOnHome
                              ? "text-[#CCA681]"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          <Star size={14} className={p.showOnHome ? "fill-[#CCA681]" : ""} />
                        </button>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-xs text-gray-500 sm:table-cell">
                      {p.createdAt}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => void remove(p)}
                          aria-label={`Delete ${p.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                        <a
                          href={`/shop`}
                          aria-label={`View ${p.name} in shop`}
                          className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-white sm:flex"
                        >
                          <Eye size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ACard>
    </div>
  );
}
