"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addToCart, openCartDrawer } from "@/lib/cart-store";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  ListFilter,
  Maximize2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import Button from "@/components/Button";
import CategorySidebar from "@/components/shop/CategorySidebar";
import OffersCarousel from "@/components/shop/OffersCarousel";
import ShareMenu from "@/components/shop/ShareMenu";
import ShopByCategory from "@/components/shop/ShopByCategory";
import {
  discountPrice,
  getCategory,
  getCategoryPath,
  getCategoryPathName,
  getLeafIds,
  parsePrice,
  SIGNATURE_CATEGORY,
  WHATSAPP_NUMBER,
  type Category,
  type Offer,
  type ProductVariation,
  type ShopProduct,
} from "@/components/shop/data";

// ============================================================
// THE COLLECTION — the shop page's heart: an editorial header,
// a category sidebar (sticky on desktop, drawer on mobile),
// live search + sort, an asymmetric gallery (one large signature
// piece + a refined grid), a quick-view modal, and an
// add-to-cart toast that syncs the navbar badge through the
// shared cart store (localStorage + useSyncExternalStore).
// ============================================================

type SortKey = "most-recent" | "price-asc" | "price-desc" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "most-recent", label: "Most Recent" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A–Z" },
];

// Sorting uses the cheapest variation when a product has options;
// otherwise the discounted base price when a sale is live.
const priceValue = (p: ShopProduct) => {
  if (p.variations.length) {
    return Math.min(...p.variations.map((v) => parsePrice(v.price) ?? 0));
  }
  const base = parsePrice(p.price) ?? 0;
  if (!p.discount) return base;
  return parsePrice(discountPrice(p.price, p.discount) ?? p.price) ?? base;
};

const dateValue = (p: ShopProduct) => new Date(p.createdAt).getTime();

// "From Rs. X" label for products that have variations.
const fromPrice = (p: ShopProduct): string | null => {
  if (!p.variations.length) return null;
  const priced = p.variations
    .map((v) => ({ v, n: parseInt(v.price.replace(/\D/g, ""), 10) }))
    .filter((x) => !Number.isNaN(x.n) && x.n > 0);
  if (!priced.length) return p.variations[0]?.price ?? null;
  const cheapest = priced.reduce((a, b) => (b.n < a.n ? b : a));
  return cheapest.v.price;
};

const stats = [
  { value: "05", label: "Signature pieces" },
  { value: "06", label: "Premium materials" },
  { value: "3–5", label: "Day turnaround" },
];

// ─── Small shared bits ──────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#CCA681] backdrop-blur">
      {children}
    </span>
  );
}

// High-contrast sale pill — breaks from the gold palette so it
// reads instantly against the dark cards.
function SaleBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-[#FF4D3A] via-[#FF6B2C] to-[#E9A23B] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(255,77,58,0.5)] ring-1 ring-white/25">
      <Zap size={12} strokeWidth={2.6} className="fill-current" aria-hidden="true" />
      {children}
    </span>
  );
}

// Inline spinner for the add-to-cart loading state.
function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// Short feedback state for add-to-cart buttons: click → spinner
// ("Adding…") → check ("Added") → back to idle. The cart write is
// synchronous; the spinner is held up long enough to be felt
// (750ms), and `done` (the confirmation toast) fires exactly when
// the button flips to its check, so the two agree. Also guards
// against double-clicks.
function useAddFeedback() {
  const [phase, setPhase] = useState<"idle" | "loading" | "added">("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);
  const trigger = (commit: () => void, done?: () => void) => {
    if (phase !== "idle") return;
    setPhase("loading");
    commit();
    timers.current.push(
      window.setTimeout(() => {
        done?.();
        setPhase("added");
      }, 750)
    );
    timers.current.push(window.setTimeout(() => setPhase("idle"), 2200));
  };
  return { phase, trigger };
}

// Thumbnail strip — shared by the quick-view modal and the lightbox.
function Thumbnails({
  images,
  active,
  onSelect,
}: {
  images: string[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Product images">
      {images.map((src, i) => (
        <button
          key={`${src}-${i}`}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`View image ${i + 1} of ${images.length}`}
          aria-current={i === active ? "true" : undefined}
          className={`relative h-14 w-14 cursor-pointer overflow-hidden rounded-xl border bg-white/[0.03] transition-all duration-300 sm:h-16 sm:w-16 ${
            i === active
              ? "border-[#CCA681] ring-1 ring-[#CCA681]/50"
              : "border-white/10 opacity-60 hover:border-white/25 hover:opacity-100"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}

// ─── Standard product card ──────────────────────────────────────────────────

function ProductCard({
  product,
  categories,
  wished,
  onQuickView,
  onAdd,
  onAdded,
  onWishlist,
}: {
  product: ShopProduct;
  categories: Category[];
  wished: boolean;
  onQuickView: (p: ShopProduct) => void;
  onAdd: (p: ShopProduct) => void;
  onAdded: (p: ShopProduct) => void;
  onWishlist: (id: string) => void;
}) {
  const from = fromPrice(product);
  const disc = product.discount ?? null;
  const discPrice = !from && disc ? discountPrice(product.price, disc) : null;
  const { phase, trigger } = useAddFeedback();
  return (
    <div className="shop-card group card-shimmer relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-500 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]">
      {/* Brand-tinted glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, ${product.color}14, transparent 60%)`,
        }}
      />

      {/* Image — the whole area opens the product details modal */}
      <div className="relative aspect-square overflow-hidden">
        <button
          type="button"
          onClick={() => onQuickView(product)}
          aria-label={`View ${product.name}`}
          className="absolute inset-0 z-10 cursor-pointer"
        >
          <Image
            src={product.image}
            alt={product.alt}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Hover overlay — brand-tinted scrim with "More Info" text.
              Hover-only by design: on touch the image tap opens the
              modal directly, and the overlay would hide the photo. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-t from-[#5A1020]/95 via-[#5A1020]/45 to-[#5A1020]/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            <Eye size={20} strokeWidth={1.8} className="text-[#CCA681]" />
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-white">
              More Info
            </span>
          </span>
        </button>

        {(disc || product.badge || product.customizable) && (
          <span className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
            {disc && <SaleBadge>{disc.label}</SaleBadge>}
            {product.badge && <Badge>{product.badge}</Badge>}
            {product.customizable && <Badge>Customizable</Badge>}
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => onWishlist(product.id)}
          aria-pressed={wished}
          aria-label={
            wished
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          className="absolute right-3 top-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-gray-300 backdrop-blur transition-all duration-300 hover:scale-110 hover:border-[#CCA681]/60 hover:text-[#CCA681]"
        >
          <Heart
            size={16}
            strokeWidth={2}
            className={`transition-all duration-300 ${
              wished ? "scale-110 fill-[#CCA681] text-[#CCA681]" : ""
            }`}
          />
        </button>
      </div>

      {/* Copy */}
      <div className="relative z-10 flex flex-1 flex-col gap-1.5 px-5 pb-5 pt-4">
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-gray-500">
          {getCategoryPathName(product.categoryId, categories)}
        </p>
        <h3
          className="text-lg tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {discPrice ? (
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-gray-500 line-through">
                {product.price}
              </span>
              <span
                className="text-lg font-bold text-[#CCA681]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {discPrice}
              </span>
            </span>
          ) : (
            <p
              className="text-lg font-bold text-[#CCA681]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              {from ? `From ${from}` : product.price}
            </p>
          )}
          {/* Add to cart — labeled button with loading → added feedback */}
          <button
            type="button"
            disabled={phase !== "idle"}
            onClick={() =>
              trigger(() => onAdd(product), () => onAdded(product))
            }
            className="btn-shine flex h-9 min-w-[8.25rem] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#5A1020] px-3.5 text-[11px] font-bold uppercase tracking-widest text-[#CCA681] transition-all duration-300 hover:bg-[#6d1528] hover:shadow-[0_0_20px_rgba(90,16,32,0.5)] active:scale-95 disabled:cursor-wait disabled:opacity-80"
          >
            {phase === "loading" ? (
              <>
                <Spinner />
                Adding…
              </>
            ) : phase === "added" ? (
              <>
                <Check size={14} strokeWidth={2.6} />
                Added
              </>
            ) : (
              <>
                <ShoppingBag size={14} strokeWidth={2.2} />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signature feature card (spans two columns) ─────────────────────────────

function FeatureCard({
  product,
  onQuickView,
  onAdd,
  onAdded,
}: {
  product: ShopProduct;
  onQuickView: (p: ShopProduct) => void;
  onAdd: (p: ShopProduct) => void;
  onAdded: (p: ShopProduct) => void;
}) {
  const from = fromPrice(product);
  const disc = product.discount ?? null;
  const discPrice = !from && disc ? discountPrice(product.price, disc) : null;
  const { phase, trigger } = useAddFeedback();
  return (
    <div className="shop-feature group card-shimmer relative h-full min-h-[440px] overflow-hidden rounded-3xl border border-[#E9A23B]/25 transition-transform duration-500 hover:-translate-y-1 lg:min-h-[520px]">
      <Image
        src={product.image}
        alt={product.alt}
        fill
        loading="eager"
        sizes="(max-width: 1024px) 100vw, 66vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* Readability scrim + brand glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r from-[#030712] via-[#030712]/75 to-[#030712]/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[#E9A23B]/15 opacity-80 blur-[100px] transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-6 sm:p-8 lg:p-10">
        <span className="flex flex-wrap items-center gap-2">
          {disc && <SaleBadge>{disc.label}</SaleBadge>}
          <Badge>{product.badge ?? "Signature Piece"}</Badge>
          {product.customizable && <Badge>Customizable</Badge>}
        </span>

        <h3>
          <span
            className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-2xl leading-snug text-transparent sm:text-3xl"
            style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
          >
            The piece that
          </span>
          <span
            className="mt-1 block text-4xl leading-none tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Makes the Entrance
          </span>
        </h3>

        <p className="max-w-md text-base leading-relaxed text-gray-300">
          {product.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          {discPrice ? (
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-400 line-through">
                {product.price}
              </span>
              <span
                className="text-lg font-semibold text-[#CCA681]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {discPrice}
              </span>
            </span>
          ) : (
            <p
              className="text-lg font-semibold text-[#CCA681]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {from ? `From ${from}` : product.price}
            </p>
          )}
          <Button
            variant="light"
            size="md"
            className="btn-shine min-w-[9.5rem]"
            disabled={phase !== "idle"}
            icon={
              phase === "loading" ? (
                <Spinner />
              ) : phase === "added" ? (
                <Check size={15} strokeWidth={2.6} />
              ) : undefined
            }
            onClick={() =>
              trigger(() => onAdd(product), () => onAdded(product))
            }
          >
            {phase === "loading"
              ? "Adding…"
              : phase === "added"
                ? "Added"
                : "Add to Cart"}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => onQuickView(product)}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main section ───────────────────────────────────────────────────────────

interface ShopCollectionProps {
  products: ShopProduct[];
  categories: Category[];
  offers: Offer[];
  /** Site origin (scheme + host) for shareable product links. */
  origin: string;
}

const ShopCollection = ({
  products,
  categories,
  offers,
  origin,
}: ShopCollectionProps) => {
  const [query, setQuery] = useState("");

  // The selected category lives in the URL (?category=<slug>), so
  // offer CTA links like /shop?category=clocks deep-link straight
  // into a filtered collection, and every filter is shareable.
  const searchParams = useSearchParams();
  const router = useRouter();
  // Only accept a category that actually exists in the tree — a typo'd
  // or stale link (e.g. /shop?category=clokcs) falls back to "All".
  const rawCategory = searchParams.get("category") || "";
  const category =
    rawCategory && getCategory(rawCategory, categories) ? rawCategory : "all";

  const selectCategory = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("product"); // a category pick clears any shared product
    if (id === "all" || id === "") params.delete("category");
    else params.set("category", id);
    const qs = params.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
    // The sidebar is sticky, so picks happen mid-scroll — jump back
    // to the top of the PRODUCTS column (not the section top, which
    // sits above the offers carousel) so the filtered grid comes
    // into view. (scroll-mt-24 offsets the fixed navbar.)
    document
      .getElementById("shop-products")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [sort, setSort] = useState<SortKey>("most-recent");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  // The modal's product: either clicked from the grid, or arriving
  // via a shared link (?product=<id>). The URL keeps driving the
  // modal until the visitor closes it (shared links re-open it on
  // reload, and the param is dropped on close).
  const [clickedQuickView, setClickedQuickView] =
    useState<ShopProduct | null>(null);
  const deepLinked = useMemo(() => {
    const pid = searchParams.get("product");
    if (!pid) return null;
    return products.find((x) => x.id === pid) ?? null;
  }, [searchParams, products]);
  const quickView = clickedQuickView ?? deepLinked;

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [qty, setQty] = useState(1);
  // Selected variation, tagged with its product id so a stale pick
  // from another product can never leak in — falls back to the
  // product's first option (or null = base price).
  const [variantPick, setVariantPick] = useState<{
    pid: string;
    v: ProductVariation | null;
  } | null>(null);
  const variant =
    variantPick?.pid === quickView?.id
      ? (variantPick?.v ?? null)
      : (quickView?.variations[0] ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  // Loading feedback for the modal's Add to Cart button.
  const modalAdd = useAddFeedback();
  // Auto-close timer for the modal after adding — held in a ref so it
  // is cleared whenever the modal closes/opens another way, and can
  // never fire a stale close after the user already moved on.
  const modalCloseTimer = useRef<number | null>(null);

  // Per-category product counts (groups aggregate their leaves).
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) {
      for (const c of getCategoryPath(p.categoryId, categories)) {
        map[c.id] = (map[c.id] ?? 0) + 1;
      }
    }
    return map;
  }, [products, categories]);

  // The signature piece takes the large feature card in the default
  // (most-recent, unfiltered) view — filtered views show a uniform grid.
  const showFeature =
    category === "all" && query.trim() === "" && sort === "most-recent";

  const results = useMemo(() => {
    const selected = category === "all" ? null : getCategory(category, categories);
    const leaves = selected ? getLeafIds(selected) : null;
    const q = query.trim().toLowerCase();

    const filtered = products.filter((p) => {
      if (leaves && !leaves.includes(p.categoryId)) return false;
      if (q === "") return true;
      const haystack = [
        p.name,
        getCategoryPathName(p.categoryId, categories),
        p.description,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...filtered];
    switch (sort) {
      case "most-recent":
        sorted.sort((a, b) => dateValue(b) - dateValue(a));
        break;
      case "price-asc":
        sorted.sort((a, b) => priceValue(a) - priceValue(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => priceValue(b) - priceValue(a));
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return sorted;
  }, [query, category, sort, products, categories]);

  // The signature card anchors on the Sign Boards category (stable
  // even though product ids are database-generated).
  const feature = showFeature
    ? results.find((p) => p.categoryId === SIGNATURE_CATEGORY) ?? null
    : null;
  const gridItems = showFeature
    ? results.filter((p) => p.id !== feature?.id)
    : results;
  const total = gridItems.length + (feature ? 1 : 0);

  // ── Actions ──

  // Adds the line to the shared cart store — the navbar badge, the
  // drawer and the /cart page react automatically. The display
  // snapshot (name/image/price) powers the drawer, which has no live
  // product data on other pages; the cart page re-resolves live.
  const addLine = (
    p: ShopProduct,
    variant: ProductVariation | null,
    qtyN = 1
  ) => {
    const unitLabel = variant
      ? variant.price
      : p.discount
        ? (discountPrice(p.price, p.discount) ?? p.price)
        : p.price;
    addToCart({
      productId: p.id,
      variantId: variant?.id ?? null,
      qty: qtyN,
      name: p.name,
      image: p.image,
      alt: p.alt,
      variantLabel: variant?.label ?? null,
      unitLabel,
      wasLabel: !variant && p.discount ? p.price : null,
      unit: parsePrice(unitLabel) ?? 0,
    });
  };

  // Corner confirmation — fired as the button flips to its check.
  const toastAdded = (name: string) => {
    setToast(name);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openQuickView = (p: ShopProduct) => {
    if (modalCloseTimer.current) {
      window.clearTimeout(modalCloseTimer.current);
      modalCloseTimer.current = null;
    }
    setClickedQuickView(p);
    setQty(1);
    setVariantPick(null); // back to the product's first option
    setActiveImage(0);
    setLightboxOpen(false);
  };

  // One close path for both sources: a clicked product is simply
  // cleared; a shared-link product closes by dropping ?product=.
  const closeQuickView = useCallback(() => {
    if (modalCloseTimer.current) {
      window.clearTimeout(modalCloseTimer.current);
      modalCloseTimer.current = null;
    }
    setQty(1);
    setVariantPick(null);
    setActiveImage(0);
    setLightboxOpen(false);
    if (clickedQuickView) {
      setClickedQuickView(null);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("product");
    const qs = params.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  }, [clickedQuickView, searchParams, router]);

  // Quick-view modal: body scroll locks while open, focus moves
  // into the dialog and is restored on close. (Keyed on the modal
  // only, so opening the lightbox on top doesn't disturb it.)
  useEffect(() => {
    if (!quickView) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [quickView]);

  // Escape layering — the lightbox handles Escape itself; only
  // close the modal when the lightbox is not open.
  useEffect(() => {
    if (!quickView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lightboxOpen) closeQuickView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickView, lightboxOpen, closeQuickView]);

  // Lightbox: Escape closes, arrow keys navigate, focus moves in
  // and is restored on close.
  useEffect(() => {
    if (!lightboxOpen || !quickView) return;
    const len = quickView.gallery.length;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setActiveImage((i) => (i + 1) % len);
      if (e.key === "ArrowLeft") setActiveImage((i) => (i - 1 + len) % len);
    };
    window.addEventListener("keydown", onKey);
    lightboxCloseRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [lightboxOpen, quickView]);

  // Simple focus trap — Tab cycles within the dialog panel.
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const modalDisc = quickView ? (quickView.discount ?? null) : null;
  const modalDiscPrice =
    quickView && !variant && modalDisc
      ? discountPrice(quickView.price, modalDisc)
      : null;

  // The WhatsApp order link — a real href (middle-clickable, visible
  // on hover, shareable), rebuilt on every render so it always
  // reflects the selected variation and quantity.
  const waMessage = quickView
    ? [
        "Hello Art of Frames! I'd like to order:",
        "",
        `${quickView.name} × ${qty}`,
        variant
          ? `Variation: ${variant.label} — ${variant.price}`
          : modalDisc && modalDiscPrice
            ? `${quickView.price} → ${modalDiscPrice} (${modalDisc.label})`
            : `Price: ${quickView.price}`,
        "",
        `Product: ${origin}/shop?product=${quickView.id}`,
        "",
        "Please confirm availability.",
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const waHref = quickView
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`
    : "";

  // overflow-clip (not hidden) clips the ambient orbs WITHOUT
  // creating a scroll container — overflow: hidden on an ancestor
  // would break position: sticky for the sidebar below.
  return (
    <section
      id="collection"
      className="relative scroll-mt-24 overflow-clip bg-[#030712] pb-24 pt-28 lg:pb-32 lg:pt-36"
    >
      {/* ── Ambient orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/12 blur-[160px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/6 blur-[150px]"
      />

      {/* Dot grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
      >
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
        {/* ── Header: offers carousel, or the editorial header when
            no offers are configured ── */}
        {offers.length > 0 ? (
          <div className="mt-6">
            <OffersCarousel offers={offers} />
          </div>
        ) : (
          <>
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="h-[1px] w-10 bg-[#CCA681]" />
              <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                The Atelier · Handmade to Order
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
                Browse the
              </span>
              <span
                className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Collection
              </span>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-5 lg:items-end"
          >
            <p className="max-w-md text-base leading-relaxed text-gray-400">
              Every piece is designed, cut and finished by hand in our
              studio — ready to be engraved with your name, your brand,
              your story.
            </p>
            <div className="flex flex-wrap gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span
                    className="text-lg leading-none text-[#CCA681]"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                  >
                    {s.value}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
          </div>
          </>
        )}

        {/* ── Shop by Category — single-row icon strip below the offers ── */}
        <ShopByCategory categories={categories} onSelect={selectCategory} />

        {/* ── Sidebar + content ── */}
        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Sticky sidebar — desktop: sticks below the navbar and
              scrolls internally when the category list is taller than
              the viewport. */}
          <aside className="thin-scroll hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto">
            <CategorySidebar
              selected={category}
              onSelect={selectCategory}
              counts={counts}
              tree={categories}
            />
          </aside>

          {/* Content column — the products area: toolbar + grid.
              This is the scroll target when a sidebar category is
              picked (scroll-mt-24 offsets the fixed navbar). */}
          <div id="shop-products" className="min-w-0 scroll-mt-24">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

              <label className="relative block flex-1 sm:max-w-xs">
                <span className="sr-only">Search the collection</span>
                <Search
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the collection…"
                  className="h-11 w-full rounded-xl border border-white/15 bg-black/25 pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.15)]"
                />
              </label>

              <div className="flex items-center gap-2.5 sm:ml-auto">
                <SlidersHorizontal size={16} className="text-gray-500" />
                <label htmlFor="sort-select" className="sr-only">
                  Sort products
                </label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-11 cursor-pointer rounded-xl border border-white/15 bg-black/25 px-4 text-sm text-white outline-none transition-all duration-300 focus:border-[#CCA681] [&>option]:bg-[#0a0a14] [&>option]:text-white"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                      onSelect={(id) => {
                        selectCategory(id);
                        setMobileCatsOpen(false);
                      }}
                      counts={counts}
                      tree={categories}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p
              className="mt-6 text-xs uppercase tracking-widest text-gray-500"
              aria-live="polite"
            >
              {total} {total === 1 ? "piece" : "pieces"}
            </p>

            {/* ── Gallery grid ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-8"
            >
              {total === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#CCA681]">
                    <Package size={22} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p
                      className="text-lg text-white"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                    >
                      Nothing here just yet
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-gray-400">
                      This category is still in the workshop — every piece is
                      made to order. Need it sooner?
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button variant="light" size="md" href="#quote">
                      Request a Custom Order
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        selectCategory("all");
                        setSort("most-recent");
                      }}
                      className="h-11 cursor-pointer rounded-full border border-white/15 px-6 text-xs font-semibold uppercase tracking-widest text-white transition-all duration-300 hover:border-[#CCA681] hover:text-[#CCA681]"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {feature && (
                      <motion.div
                        layout
                        key={feature.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="sm:col-span-2"
                      >
                        <FeatureCard
                          product={feature}
                          onQuickView={openQuickView}
                          onAdd={(p) =>
                            addLine(p, p.variations[0] ?? null, 1)
                          }
                          onAdded={(p) => toastAdded(p.name)}
                        />
                      </motion.div>
                    )}
                    {gridItems.map((p) => (
                      <motion.div
                        layout
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="h-full"
                      >
                        <ProductCard
                          product={p}
                          categories={categories}
                          wished={wishlist.has(p.id)}
                          onQuickView={openQuickView}
                          onAdd={(prod) =>
                            addLine(prod, prod.variations[0] ?? null, 1)
                          }
                          onAdded={(prod) => toastAdded(prod.name)}
                          onWishlist={toggleWishlist}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Quick view modal ── */}
      <AnimatePresence>
        {quickView && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${quickView.name} details`}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.button
              type="button"
              aria-label="Close quick view"
              onClick={closeQuickView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.97 }}
              transition={{ type: "spring" as const, damping: 28, stiffness: 220 }}
              onKeyDown={trapFocus}
              className="card-shimmer relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-3xl border border-[#CCA681]/25 bg-[#06060f]/70 p-6 backdrop-blur-xl sm:p-8"
            >
              {/* Share — social popover */}
              <div className="absolute right-16 top-4 z-20">
                <ShareMenu product={quickView} />
              </div>

              <button
                type="button"
                ref={closeButtonRef}
                onClick={closeQuickView}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
              >
                <X size={16} strokeWidth={2.2} />
              </button>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Image — click to open the lightbox gallery */}
                <div>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`Open ${quickView.name} image gallery`}
                    className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 30% 30%, ${quickView.color}1c, transparent 65%)`,
                      }}
                    />
                    {/* Crossfade (no wait) so thumbnail swaps feel snappy */}
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={activeImage}
                        initial={{ opacity: 0, scale: 1.03 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={
                            quickView.gallery[activeImage] ?? quickView.image
                          }
                          alt={quickView.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
                        />
                      </motion.div>
                    </AnimatePresence>
                    {/* Zoom hint */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-gray-300 opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100"
                    >
                      <Maximize2 size={15} strokeWidth={2} />
                    </span>
                  </button>

                  {quickView.gallery.length > 1 && (
                    <div className="mt-3">
                      <Thumbnails
                        images={quickView.gallery}
                        active={activeImage}
                        onSelect={setActiveImage}
                      />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className="truncate text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: quickView.color }}
                    >
                      {getCategoryPathName(quickView.categoryId, categories)}
                    </p>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {quickView.badge && <Badge>{quickView.badge}</Badge>}
                      {quickView.customizable && <Badge>Customizable</Badge>}
                    </span>
                  </div>

                  <h3
                    className="mt-2 text-2xl tracking-tight text-white sm:text-3xl"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  >
                    {quickView.name}
                  </h3>
                  {modalDiscPrice ? (
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-500 line-through">
                        {quickView.price}
                      </span>
                      <span
                        className="text-lg font-semibold text-[#CCA681]"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                      >
                        {modalDiscPrice}
                      </span>
                    </span>
                  ) : (
                    <p
                      className="mt-1 text-lg font-semibold text-[#CCA681]"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                    >
                      {variant ? variant.price : quickView.price}
                    </p>
                  )}
                  {modalDisc && (
                    <div className="mt-2">
                      <SaleBadge>{modalDisc.label}</SaleBadge>
                    </div>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-gray-400">
                    {quickView.description}
                  </p>

                  {/* Variations — pick an option to update the price */}
                  {quickView.variations.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                        Options
                      </p>
                      <div className="flex flex-col gap-2">
                        {quickView.variations.map((v) => {
                          const active = variant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setVariantPick({ pid: quickView.id, v })
                              }
                              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-300 ${
                                active
                                  ? "border-[#CCA681]/60 bg-[#CCA681]/8"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                                    active ? "border-[#CCA681]" : "border-white/25"
                                  }`}
                                >
                                  {active && (
                                    <span className="h-2 w-2 rounded-full bg-[#CCA681]" />
                                  )}
                                </span>
                                <span
                                  className={`text-sm ${
                                    active ? "text-white" : "text-gray-300"
                                  }`}
                                >
                                  {v.label}
                                </span>
                              </span>
                              <span className="text-sm font-semibold text-[#CCA681]">
                                {v.price}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="mt-5 flex flex-col gap-2.5">
                    {quickView.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: `${quickView.color}18`,
                            boxShadow: `inset 0 0 0 1px ${quickView.color}30`,
                          }}
                        >
                          <Check size={10} strokeWidth={3} style={{ color: quickView.color }} />
                        </span>
                        <span className="text-sm text-gray-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Materials */}
                  <div className="mt-5">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      Materials
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickView.materials.map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quantity + actions */}
                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center rounded-full border border-white/15 bg-white/5">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                        >
                          <Minus size={15} strokeWidth={2.2} />
                        </button>
                        <span
                          aria-live="polite"
                          className="w-8 text-center text-sm font-semibold text-white"
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQty((q) => q + 1)}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                        >
                          <Plus size={15} strokeWidth={2.2} />
                        </button>
                      </div>
                      <Button
                        variant="light"
                        size="lg"
                        className="btn-shine flex-1"
                        disabled={modalAdd.phase !== "idle"}
                        icon={
                          modalAdd.phase === "loading" ? (
                            <Spinner />
                          ) : modalAdd.phase === "added" ? (
                            <Check size={15} strokeWidth={2.6} />
                          ) : (
                            <ShoppingBag size={15} strokeWidth={2.2} />
                          )
                        }
                        onClick={() => {
                          modalAdd.trigger(
                            () => addLine(quickView, variant, qty),
                            () => toastAdded(quickView.name)
                          );
                          // Close the modal once the check feedback has
                          // shown (the ref is cleared if the user
                          // closes or switches first).
                          if (modalCloseTimer.current) {
                            window.clearTimeout(modalCloseTimer.current);
                          }
                          modalCloseTimer.current = window.setTimeout(
                            closeQuickView,
                            900
                          );
                        }}
                      >
                        {modalAdd.phase === "loading"
                          ? "Adding…"
                          : modalAdd.phase === "added"
                            ? "Added"
                            : "Add to Cart"}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      target="_blank"
                      rel="noopener noreferrer"
                      href={waHref}
                      icon={<MessageCircle size={15} strokeWidth={2.2} />}
                    >
                      Order on WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && quickView && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${quickView.name} images`}
            onKeyDown={trapFocus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-black/92 p-4 backdrop-blur-md sm:p-8"
          >
            {/* Close */}
            <motion.button
              type="button"
              ref={lightboxCloseRef}
              onClick={() => setLightboxOpen(false)}
              aria-label="Close image gallery"
              className="absolute right-4 top-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
            >
              <X size={18} strokeWidth={2.2} />
            </motion.button>

            {/* Counter */}
            <p className="absolute left-1/2 top-6 z-20 -translate-x-1/2 text-xs font-semibold uppercase tracking-widest text-[#CCA681]">
              {Math.min(activeImage + 1, Math.max(quickView.gallery.length, 1))} /{" "}
              {Math.max(quickView.gallery.length, 1)}
            </p>

            {/* Prev / Next */}
            {quickView.gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage(
                      (i) => (i - 1 + quickView.gallery.length) % quickView.gallery.length
                    )
                  }
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/15 hover:text-[#CCA681] sm:left-6"
                >
                  <ChevronLeft size={20} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((i) => (i + 1) % quickView.gallery.length)
                  }
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/15 hover:text-[#CCA681] sm:right-6"
                >
                  <ChevronRight size={20} strokeWidth={2.2} />
                </button>
              </>
            )}

            {/* Image + thumbnails — m-auto keeps them centered and
                scrollable when they exceed the viewport height. */}
            <div className="m-auto flex flex-col items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex max-h-[75vh] items-center justify-center"
                >
                  <Image
                    src={
                      quickView.gallery[activeImage] ?? quickView.image
                    }
                    alt={quickView.alt}
                    width={1400}
                    height={1400}
                    className="max-h-[75vh] w-auto rounded-2xl object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Thumbnails */}
              {quickView.gallery.length > 1 && (
                <div className="mt-6">
                  <Thumbnails
                    images={quickView.gallery}
                    active={activeImage}
                    onSelect={setActiveImage}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add-to-cart toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring" as const, damping: 26, stiffness: 260 }}
            className="fixed bottom-6 right-6 z-[80]"
          >
            <div className="flex items-center gap-3 rounded-full border border-[#CCA681]/30 bg-[#0a0a14]/95 py-3 pl-4 pr-5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CCA681]/15 text-[#CCA681]">
                <Check size={15} strokeWidth={2.6} />
              </span>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">{toast}</span>
                {" added to your cart"}
              </p>
              <span aria-hidden="true" className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  setToast(null);
                  openCartDrawer();
                }}
                className="cursor-pointer text-xs font-bold uppercase tracking-widest text-[#CCA681] transition-colors duration-300 hover:text-white"
              >
                View Cart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ShopCollection;
