"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  Search,
  UploadCloud,
  RefreshCw,
  Eye,
  Star,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  AButton,
  ACard,
  ADrawer,
  AInput,
  ASelect,
  ASelectSearchable,
  AToggle,
  PageHeader,
} from "@/components/admin/ui";
import {
  deleteGalleryItem,
  deleteImage,
  getCategories,
  getGallery,
  isStoredImage,
  newId,
  saveGalleryItem,
  setGalleryHome,
  uploadImage,
  type GalleryTile,
} from "@/lib/admin-db";
import {
  getCategoryAccent,
  getCategoryPath,
  getCategoryPathName,
  type Category,
} from "@/components/shop/data";

// ============================================================
// GALLERY — manage the home page "Our Craft" tiles. Tiles share
// the shop's category tree and can live under SEVERAL categories
// (the first is the primary — it drives the home page caption).
// A tile's accent is derived from its primary category, so the
// forms never ask for a color. Uncategorized tiles surface an
// amber warning until assigned; new tiles require at least one.
// ============================================================

// ── Category multi-select ───────────────────────────────────
// Selected categories render as removable chips (first = primary,
// gold ring) with an "Add categories…" trigger that opens a
// searchable dropdown. Toggling keeps the list open so several can
// be picked in one go; Escape / click-outside closes it.
function CategoryMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Add categories…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () =>
      options
        .filter((o) => value.includes(o.value))
        .sort((a, b) => value.indexOf(a.value) - value.indexOf(b.value)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // Click outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const openMenu = () => {
    setOpen(true);
    setSearch("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        Categories
      </span>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((o, i) => (
            <span
              key={o.value}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1.5 text-[11px] font-semibold ${
                i === 0
                  ? "border-[#CCA681]/60 bg-[#CCA681]/15 text-[#CCA681]"
                  : "border-white/15 bg-white/[0.05] text-gray-200"
              }`}
            >
              {i === 0 && (
                <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-[#CCA681]/70">
                  Primary
                </span>
              )}
              <span className="truncate">{o.label}</span>
              <button
                type="button"
                onClick={() => toggle(o.value)}
                aria-label={`Remove ${o.label}`}
                className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-500/20 hover:text-red-300"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={open ? () => setOpen(false) : openMenu}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/25 px-3 text-left text-sm text-white outline-none transition-all duration-200 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]"
      >
        <span className={selected.length ? "truncate text-white/60" : "truncate text-white/30"}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180 text-[#CCA681]" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-white/15 bg-[#0a0a14] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="relative border-b border-white/10">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation(); // close only this dropdown
                  setOpen(false);
                }
              }}
              role="combobox"
              aria-expanded={open}
              aria-controls="cat-multi-listbox"
              aria-autocomplete="list"
              placeholder="Type to filter…"
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none"
            />
          </div>
          <ul id="cat-multi-listbox" role="listbox" className="thin-scroll max-h-60 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-500">
                No matching categories
              </li>
            ) : (
              filtered.map((o) => {
                const on = value.includes(o.value);
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggle(o.value)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
                        on
                          ? "bg-[#CCA681]/10 text-[#CCA681]"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150 ${
                          on
                            ? "border-[#CCA681] bg-[#CCA681] text-[#5A1020]"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="truncate">{o.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const IMAGE_OPTIONS = [
  "/images/lasercut-industry-1-1024x683.jpg",
  "/images/keytags.webp",
  "/images/mommy-frames.webp",
  "/images/signboard.webp",
  "/images/slide-card.png",
  "/images/wallart.webp",
  "/images/hero/hero-1.jpeg",
  "/images/hero/hero-2.jpeg",
  "/images/hero/hero-3.jpeg",
];

export default function AdminGallery() {
  const [tiles, setTiles] = useState<GalleryTile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [editing, setEditing] = useState<GalleryTile | null>(null);
  const [draft, setDraft] = useState<GalleryTile | null>(null);
  // The drawer keeps its own open flag so the form content (bound to
  // `draft`) stays mounted through the slide-out animation.
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Ids with a quick-toggle in flight — guards double clicks.
  const [pending, setPending] = useState<Set<string>>(new Set());
  // Filters — search text, category, landing status, tile size.
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [homeFilter, setHomeFilter] = useState<"all" | "home" | "hidden">(
    "all"
  );
  const [spanFilter, setSpanFilter] = useState<"all" | "" | "col-span-2">(
    "all"
  );
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  // Every node in the tree (groups AND leaves, path-labelled) — a
  // tile can sit on either.
  const categoryOptions = useMemo(() => {
    const walk = (tree: Category[]): { value: string; label: string }[] =>
      tree.flatMap((c) =>
        c.id === "all"
          ? []
          : [
              { value: c.id, label: getCategoryPathName(c.id, categories) },
              ...(c.children ? walk(c.children) : []),
            ]
      );
    return walk(categories);
  }, [categories]);

  // A category matches a tile when it sits on the path of ANY of the
  // tile's categories (group selections include everything beneath).
  const tileHasCategory = useCallback(
    (t: GalleryTile, catId: string) =>
      t.categories.some((c) =>
        getCategoryPath(c, categories).some((n) => n.id === catId)
      ),
    [categories]
  );

  // Per-category tile counts for the filter dropdown.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tiles.length };
    for (const t of tiles) {
      for (const c of t.categories) {
        for (const node of getCategoryPath(c, categories)) {
          counts[node.id] = (counts[node.id] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [tiles, categories]);

  const uncategorizedCount = useMemo(
    () => tiles.filter((t) => t.categories.length === 0).length,
    [tiles]
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: "all", label: `All categories (${tiles.length})` },
      ...categoryOptions.map((o) => ({
        value: o.value,
        label: `${o.label} (${categoryCounts[o.value] ?? 0})`,
      })),
    ],
    [categoryOptions, categoryCounts, tiles.length]
  );

  // Client-side filter of the loaded tiles.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => {
      if (categoryFilter !== "all" && !tileHasCategory(t, categoryFilter))
        return false;
      if (homeFilter === "home" && !t.showOnHome) return false;
      if (homeFilter === "hidden" && t.showOnHome) return false;
      if (spanFilter !== "all" && t.span !== spanFilter) return false;
      if (!q) return true;
      const names = t.categories.map((c) =>
        getCategoryPathName(c, categories).toLowerCase()
      );
      return (
        t.title.toLowerCase().includes(q) ||
        names.some((n) => n.includes(q))
      );
    });
  }, [tiles, query, categoryFilter, homeFilter, spanFilter, categories, tileHasCategory]);

  const filtersActive =
    query.trim() !== "" ||
    categoryFilter !== "all" ||
    homeFilter !== "all" ||
    spanFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("all");
    setHomeFilter("all");
    setSpanFilter("all");
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const tilesData = await getGallery();
        if (!active) return;
        setTiles(tilesData);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load gallery");
        }
      } finally {
        if (active) setLoading(false);
      }
      try {
        const catsData = await getCategories();
        if (!active) return;
        setCategories(catsData);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load categories");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft({
      id: newId(),
      title: "",
      categoryId: null,
      categories: [],
      image: IMAGE_OPTIONS[0],
      color: "", // derived from the primary category on save
      span: "",
      showOnHome: false,
      productId: null,
    });
    setEditorOpen(true);
  };

  const openEdit = (t: GalleryTile) => {
    setEditing(t);
    setDraft({ ...t, categories: [...t.categories] });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const onEditorClosed = () => {
    setDraft(null);
    setEditing(null);
  };

  const save = async () => {
    if (!draft || !draft.title.trim() || draft.categories.length === 0) return;
    setSaving(true);
    try {
      const item: GalleryTile = {
        ...draft,
        categories: [...draft.categories],
        categoryId: draft.categories[0] ?? null,
        // No accent color in forms — derive one from the primary
        // category when the tile has none stored.
        color:
          draft.color || getCategoryAccent(draft.categories[0] ?? "tile"),
      };
      await saveGalleryItem(item);
      // Patch locally — no full refetch after a save.
      setTiles((ts) =>
        editing
          ? ts.map((x) => (x.id === item.id ? item : x))
          : [item, ...ts]
      );
      closeEditor();
      showToast(editing ? "Tile saved" : "Tile added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tile");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: GalleryTile) => {
    if (!window.confirm(`Delete gallery tile "${t.title}"?`)) return;
    try {
      await deleteGalleryItem(t.id);
      setTiles((ts) => ts.filter((x) => x.id !== t.id));
      showToast("Tile deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete tile");
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!draft || !file) return;
    const previous = draft.image;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft({ ...draft, image: url });
      // Replacing — clean up the previous stored image so storage
      // doesn't accumulate orphans (best-effort, never blocks save).
      if (previous && isStoredImage(previous)) {
        await deleteImage(previous).catch(() => {});
      }
      showToast("Image uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Removes the image from Supabase storage and clears the field.
  const handleDeleteImage = async () => {
    if (!draft?.image) return;
    if (
      !window.confirm(
        "Delete this image from storage? This can't be undone."
      )
    )
      return;
    const url = draft.image;
    setDraft({ ...draft, image: "" });
    try {
      if (isStoredImage(url)) await deleteImage(url);
      showToast("Image deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete image");
    }
  };

  // Quick toggle — lands straight on the home "Our Craft" grid.
  const toggleHome = (t: GalleryTile) => {
    if (pending.has(t.id)) return;
    setPending((s) => new Set(s).add(t.id));
    void (async () => {
      try {
        await setGalleryHome(t.id, !t.showOnHome);
        setTiles((ts) =>
          ts.map((x) =>
            x.id === t.id ? { ...x, showOnHome: !t.showOnHome } : x
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update landing flag");
      } finally {
        setPending((s) => {
          const next = new Set(s);
          next.delete(t.id);
          return next;
        });
      }
    })();
  };

  const set = (patch: Partial<GalleryTile>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Gallery"
        subtitle="Tiles shown in the “Our Craft” section on the home page"
        actions={
          <>
            <Link
              href="/gallery"
              target="_blank"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-4 text-xs font-semibold uppercase tracking-widest text-gray-300 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681]"
            >
              <Eye size={13} /> Open page
            </Link>
            <AButton variant="gold" onClick={openNew}>
              <Plus size={14} /> Add Tile
            </AButton>
          </>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {uncategorizedCount > 0 && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#E9A23B]/30 bg-[#E9A23B]/10 px-4 py-3 text-sm text-[#E9A23B]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E9A23B]/40 text-[11px] font-bold">
            {uncategorizedCount}
          </span>
          tile{uncategorizedCount === 1 ? "" : "s"}{" "}
          {uncategorizedCount === 1 ? "has" : "have"} no category yet —
          assign one so they appear in the gallery filters. New tiles
          require at least one.
        </div>
      )}

      {/* Filters — search + category + landing status + size */}
      <div className="mt-6 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative block">
          <span className="sr-only">Search gallery tiles</span>
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tiles…"
            className="h-10 w-full rounded-lg border border-white/15 bg-black/25 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
          />
        </label>
        <ASelectSearchable
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryFilterOptions}
          placeholder="All categories"
        />
        <ASelect
          label="Landing page"
          value={homeFilter}
          onChange={(v) => setHomeFilter(v as "all" | "home" | "hidden")}
          options={[
            { value: "all", label: "All tiles" },
            { value: "home", label: "On landing page" },
            { value: "hidden", label: "Hidden from landing" },
          ]}
        />
        <ASelect
          label="Size"
          value={spanFilter}
          onChange={(v) => setSpanFilter(v as "all" | "" | "col-span-2")}
          options={[
            { value: "all", label: "All sizes" },
            { value: "", label: "Standard" },
            { value: "col-span-2", label: "Wide (2 cols)" },
          ]}
        />
      </div>

      {/* Result summary + clear */}
      <div className="mt-3 flex items-center gap-3">
        <p className="text-xs text-gray-500" aria-live="polite">
          Showing{" "}
          <span className="font-semibold text-[#CCA681]">{filtered.length}</span>{" "}
          of {tiles.length} tiles
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

      {/* Grid */}
      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          Loading gallery…
        </p>
      ) : tiles.length === 0 && !draft ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No gallery tiles yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {filtered.length === 0 ? (
            <p className="col-span-full mt-2 text-center text-sm text-gray-500">
              No tiles match your filters.
            </p>
          ) : (
            filtered.map((t) => {
              const uncategorized = t.categories.length === 0;
              return (
                <ACard
                  key={t.id}
                  className="group relative overflow-hidden transition-all duration-300 hover:border-[#CCA681]/40"
                >
                  {/* ── Image ── */}
                  <div className="relative aspect-square overflow-hidden bg-[#0d0d18]">
                    <Image
                      src={t.image}
                      alt={t.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                    {/* Scrim under the landing toggle */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-black/45 to-transparent" />

                    {/* Linked-to-product chip */}
                    {t.productId && (
                      <span className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-gray-300 backdrop-blur">
                        Linked
                      </span>
                    )}

                    {/* Landing toggle — always visible, over the scrim */}
                    <button
                      onClick={() => void toggleHome(t)}
                      disabled={pending.has(t.id)}
                      aria-label={`${t.title} — ${
                        t.showOnHome ? "remove from" : "add to"
                      } landing page`}
                      title={t.showOnHome ? "On landing page" : "Not on landing page"}
                      className={`absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition-all duration-200 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                        t.showOnHome
                          ? "border-[#CCA681]/70 bg-[#CCA681]/20 text-[#CCA681]"
                          : "border-white/15 bg-black/40 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Star
                        size={15}
                        className={t.showOnHome ? "fill-[#CCA681]" : ""}
                      />
                    </button>
                  </div>

                  {/* ── Body ── */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="min-w-0 truncate text-sm text-white"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                        title={t.title}
                      >
                        {t.title}
                      </p>
                      {t.categories.length > 1 && (
                        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                          {t.categories.length} cats
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 truncate text-[10px] uppercase tracking-widest ${
                        uncategorized ? "text-[#E9A23B]" : "text-gray-500"
                      }`}
                    >
                      {uncategorized
                        ? "Uncategorized"
                        : t.categories
                            .map((c) => getCategoryPathName(c, categories))
                            .join(" · ")}
                    </p>

                    {/* Actions — always visible, never hover-only */}
                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/5 pt-3">
                      <button
                        onClick={() => openEdit(t)}
                        aria-label={`Edit ${t.title}`}
                        className="flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] font-semibold uppercase tracking-widest text-gray-300 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681]"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => void remove(t)}
                        aria-label={`Delete ${t.title}`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-all duration-200 hover:border-red-400/40 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </ACard>
              );
            })
          )}
        </div>
      )}

      {/* Editor — slide-over drawer */}
      <ADrawer
        open={editorOpen}
        onClose={closeEditor}
        onClosed={onEditorClosed}
        title={editing ? `Edit — ${editing.title}` : "New Gallery Tile"}
        subtitle="Tiles shown in the “Our Craft” section on the home page"
        footer={
          draft ? (
            <div className="flex items-center justify-end gap-2.5">
              <AButton variant="outline" onClick={closeEditor}>
                Cancel
              </AButton>
              <AButton
                variant="gold"
                onClick={() => void save()}
                disabled={
                  saving || !draft.title.trim() || draft.categories.length === 0
                }
              >
                <Save size={14} />{" "}
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Tile"}
              </AButton>
            </div>
          ) : undefined
        }
      >
        {draft && (
          <>
            {/* ── Details ── */}
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
              Details
            </p>
            <AInput
              label="Title"
              value={draft.title}
              onChange={(v) => set({ title: v })}
              placeholder="Laser Cutting"
            />

            <div className="mt-3">
              {draft.image ? (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
                  <div className="relative aspect-[16/9] bg-[#0d0d18]">
                    <Image
                      src={draft.image}
                      alt="Uploaded image"
                      fill
                      sizes="600px"
                      className="object-contain p-4"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5">
                    <span className="truncate text-[11px] text-gray-500">
                      {uploading ? "Uploading…" : "Uploaded image"}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-gray-300 transition-colors hover:border-[#CCA681]/50 hover:text-[#CCA681]">
                        <RefreshCw size={12} />
                        Replace
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
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage()}
                        disabled={uploading}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-gray-400 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#CCA681]/40 bg-[#CCA681]/5 px-4 text-xs font-semibold text-[#CCA681] transition-all hover:bg-[#CCA681]/10">
                  <UploadCloud size={14} />
                  {uploading ? "Uploading…" : "Upload image"}
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
              )}
            </div>

            {/* ── Categories ── */}
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                Categories
              </p>
              <CategoryMultiSelect
                value={draft.categories}
                onChange={(next) => set({ categories: next })}
                options={categoryOptions}
              />
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                A tile can live under several categories — the first one
                is the primary and drives the home page caption. Groups
                cover everything beneath them.
              </p>
            </div>

            {/* ── Placement ── */}
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]/80">
                Placement
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5">
                <AToggle
                  label="Show on landing page"
                  checked={draft.showOnHome}
                  onChange={(v) => set({ showOnHome: v })}
                />
              </div>
            </div>

          </>
        )}
      </ADrawer>

      {/* Save/status toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[95] flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-[#0a2a1c]/95 px-4 py-3 text-sm font-medium text-emerald-200 shadow-[0_16px_50px_rgba(0,0,0,0.5)] backdrop-blur"
        >
          <Check size={15} strokeWidth={2.5} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
