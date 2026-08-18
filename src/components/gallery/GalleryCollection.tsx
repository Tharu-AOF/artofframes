"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  X,
} from "lucide-react";
import CategorySidebar from "@/components/shop/CategorySidebar";
import {
  getCategory,
  getCategoryPath,
  getCategoryPathName,
  type Category,
} from "@/components/shop/data";

// ============================================================
// GALLERY COLLECTION — the /gallery page's heart: an editorial
// header, the SAME category sidebar as the shop (sticky on
// desktop, drawer on mobile, ?category= deep links), a masonry
// grid of studio photos with hover reveals, a keyboard-navigable
// lightbox, and a closing CTA tile. Tiles are managed in
// /admin/gallery and share the shop's categories table.
// ============================================================

export interface GalleryTile {
  id: string;
  title: string;
  /** PRIMARY category id — drives the home page caption; null = uncategorized */
  categoryId: string | null;
  /** Every category the tile lives under (primary first) */
  categories: string[];
  image: string;
  color: string;
  span: string;
}

const BATCH_SIZE = 18;

const GalleryCollection = ({
  tiles,
  categories,
}: {
  tiles: GalleryTile[];
  categories: Category[];
}) => {
  const [active, setActive] = useState<number | null>(null);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(BATCH_SIZE);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // The selected category lives in the URL (?category=<slug>), so
  // gallery links deep-link straight into a filtered set, and every
  // filter is shareable. Only accept a category that exists in the
  // tree — a typo'd or stale link falls back to "All".
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawCategory = searchParams.get("category") || "";
  const category =
    rawCategory && getCategory(rawCategory, categories) ? rawCategory : "all";

  // Per-category photo counts — a tile counts toward EVERY category
  // it lives under (walking each path aggregates groups automatically,
  // so a tile on "Sign Boards" also counts toward "Hotel Items").
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tiles.length };
    for (const t of tiles) {
      for (const catId of t.categories) {
        for (const node of getCategoryPath(catId, categories)) {
          c[node.id] = (c[node.id] ?? 0) + 1;
        }
      }
    }
    return c;
  }, [tiles, categories]);

  // A tile matches a category when that category is on the path of
  // ANY of its categories — group selections include tiles pinned to
  // the group itself and to any leaf beneath it. Uncategorized tiles
  // appear under "All" only.
  const visible = useMemo(
    () =>
      category === "all"
        ? tiles
        : tiles.filter((t) =>
            t.categories.some((catId) =>
              getCategoryPath(catId, categories).some((n) => n.id === category)
            )
          ),
    [tiles, category, categories]
  );

  const item = active === null ? null : visible[active];

  // Reset batch limit when category changes
  useEffect(() => {
    setDisplayLimit(BATCH_SIZE);
  }, [category]);

  const displayedTiles = useMemo(
    () => visible.slice(0, displayLimit),
    [visible, displayLimit]
  );
  const hasMore = displayLimit < visible.length;

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + BATCH_SIZE, visible.length));
        }
      },
      { rootMargin: "400px" }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, visible.length]);

  // Pick a category: filter the grid and jump back to the top of the
  // PHOTOS column (not the section top, which sits above the
  // editorial header) so the filtered tiles come into view.
  // (scroll-mt-24 offsets the fixed navbar.)
  const selectCategory = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all" || id === "") params.delete("category");
    else params.set("category", id);
    const qs = params.toString();
    router.replace(qs ? `/gallery?${qs}` : "/gallery", { scroll: false });
    setActive(null);
    setMobileCatsOpen(false);
    document
      .getElementById("gallery-photos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Lightbox: Escape closes, arrows browse the filtered set, focus
  // moves in and returns when closed.
  useEffect(() => {
    if (active === null) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight")
        setActive((a) => (a === null ? a : (a + 1) % visible.length));
      if (e.key === "ArrowLeft")
        setActive((a) =>
          a === null ? a : (a - 1 + visible.length) % visible.length
        );
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [active, visible.length]);

  // Body scroll lock while the lightbox is open.
  useEffect(() => {
    if (active === null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  const categoryChip = (t: GalleryTile) =>
    t.categoryId ? (
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)]">
        <span
          className="truncate rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest backdrop-blur"
          style={{
            background: `${t.color}26`,
            color: t.color,
            boxShadow: `inset 0 0 0 1px ${t.color}40`,
          }}
        >
          {getCategoryPathName(t.categoryId, categories)}
        </span>
      </div>
    ) : null;

  return (
    <section
      id="gallery"
      className="relative scroll-mt-24 overflow-clip bg-[#030712] pb-24 pt-28 lg:pb-32 lg:pt-36"
    >
      {/* ── Ambient orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/14 blur-[160px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-[#CCA681]/8 blur-[150px]"
      />

      {/* Dot grid overlay */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.22]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Editorial header ── */}
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="h-[1px] w-10 bg-[#CCA681]" />
              <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                The Atelier · Real Work
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span
                className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
              >
                Moments we’ve
              </span>
              <span
                className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Made by Hand
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md text-base leading-relaxed text-gray-400"
          >
            Real pieces, straight from the studio floor — love gifts, mommy
            keepsakes and wall art, designed, cut and finished to order.
          </motion.p>
        </div>

        {/* ── Sidebar + content ── */}
        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          {/* Sidebar — desktop (same component as the shop) */}
          <aside className="thin-scroll hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto">
            <CategorySidebar
              selected={category}
              onSelect={selectCategory}
              counts={counts}
              tree={categories}
              noun="photos"
            />
          </aside>

          {/* Content column — the photos area: drawer/count + grid.
              This is the scroll target when a sidebar category is
              picked (scroll-mt-24 offsets the fixed navbar). */}
          <div id="gallery-photos" className="min-w-0 scroll-mt-24">
            {/* Mobile categories drawer toggle */}
            <button
              type="button"
              onClick={() => setMobileCatsOpen((v) => !v)}
              aria-expanded={mobileCatsOpen}
              aria-controls="mobile-categories"
              className="btn-shine flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:border-[#CCA681]/50 hover:text-[#CCA681] lg:hidden"
            >
              <ListFilter size={15} strokeWidth={2} />
              Categories
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${
                  mobileCatsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Mobile drawer */}
            <AnimatePresence>
              {mobileCatsOpen && (
                <motion.div
                  id="mobile-categories"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden lg:hidden"
                >
                  <div className="pt-4">
                    <CategorySidebar
                      selected={category}
                      onSelect={selectCategory}
                      counts={counts}
                      tree={categories}
                      noun="photos"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p
              className="mt-4 text-xs uppercase tracking-widest text-gray-500 lg:mt-0"
              aria-live="polite"
            >
              {visible.length} {visible.length === 1 ? "photo" : "photos"}
            </p>

            {/* ── Masonry grid ── */}
            {visible.length === 0 ? (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
                <p
                  className="text-lg text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Nothing here just yet
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-gray-400">
                  This category is still being filled from the studio — check
                  back soon.
                </p>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3"
                >
                  {displayedTiles.map((tile, i) => (
                    <motion.button
                      key={tile.id}
                      type="button"
                      onClick={() => setActive(i)}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      aria-label={`Open ${tile.title}`}
                      className="group relative mb-4 block w-full break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all duration-300 hover:border-white/25"
                    >
                    {/* Brand-tinted glow */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(ellipse at 20% 20%, ${tile.color}2b, transparent 60%)`,
                      }}
                    />

                    <div className="relative overflow-hidden">
                      <Image
                        src={tile.image}
                        alt={tile.title}
                        width={640}
                        height={800}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      {categoryChip(tile)}

                      {/* Caption scrim — revealed on hover */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-black/85 via-black/35 to-transparent px-4 pb-3.5 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div>
                          <p
                            className="text-base leading-tight text-white"
                            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                          >
                            {tile.title}
                          </p>
                          {tile.categoryId && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#CCA681]">
                              {getCategoryPathName(tile.categoryId, categories)}
                            </p>
                          )}
                        </div>
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-all duration-300 group-hover:border-[#CCA681] group-hover:bg-[#CCA681] group-hover:text-[#5A1020]"
                        >
                          <ArrowUpRight size={15} strokeWidth={2.2} />
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}

                {/* CTA tile */}
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="mb-4 break-inside-avoid"
                  >
                    <Link
                      href="/shop"
                      className="group card-shimmer relative flex min-h-[240px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#CCA681]/25 bg-linear-to-br from-[#5A1020]/60 via-[#5A1020]/25 to-transparent p-6 transition-all duration-300 hover:border-[#CCA681]/60 hover:shadow-[0_0_40px_rgba(90,16,32,0.4)]"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]">
                        Explore
                      </p>
                      <div className="flex items-end justify-between gap-4">
                        <p
                          className="text-xl tracking-tight text-white sm:text-2xl"
                          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                        >
                          See the Collection
                        </p>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition-all duration-300 group-hover:border-[#CCA681] group-hover:bg-[#CCA681] group-hover:text-[#5A1020]">
                          <ArrowUpRight
                            size={20}
                            strokeWidth={2.2}
                            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                </motion.div>

                {/* Load More & Infinite Scroll Trigger */}
                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="mt-8 flex flex-col items-center justify-center gap-3 pt-4"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDisplayLimit((prev) =>
                          Math.min(prev + BATCH_SIZE, visible.length)
                        )
                      }
                      className="btn-shine inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/10 hover:text-[#CCA681]"
                    >
                      <span>Load More Photos</span>
                      <span className="text-gray-400 font-normal">
                        ({displayedTiles.length} of {visible.length})
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {item && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${item.title} — full view`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-black/95 p-4 backdrop-blur-md sm:p-8"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close gallery lightbox"
              className="absolute right-4 top-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
            >
              <X size={18} strokeWidth={2.2} />
            </button>

            <p className="absolute left-1/2 top-6 z-20 -translate-x-1/2 text-xs font-semibold uppercase tracking-widest text-[#CCA681]">
              {active! + 1} / {visible.length}
            </p>

            {visible.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActive((a) =>
                      a === null ? a : (a - 1 + visible.length) % visible.length
                    )
                  }
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/15 hover:text-[#CCA681] sm:left-6"
                >
                  <ChevronLeft size={20} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActive((a) => (a === null ? a : (a + 1) % visible.length))
                  }
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/15 hover:text-[#CCA681] sm:right-6"
                >
                  <ChevronRight size={20} strokeWidth={2.2} />
                </button>
              </>
            )}

            <div className="m-auto flex max-w-5xl flex-col items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex max-h-[75vh] items-center justify-center"
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={1400}
                    height={1400}
                    className="max-h-[75vh] w-auto rounded-2xl object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 text-center">
                <p
                  className="text-lg text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  {item.title}
                </p>
                {item.categoryId && (
                  <p
                    className="mt-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: item.color }}
                  >
                    {getCategoryPathName(item.categoryId, categories)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default GalleryCollection;
