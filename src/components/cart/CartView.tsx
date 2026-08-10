"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  lineKey,
  removeLine,
  setLineQty,
  useCartLines,
} from "@/lib/cart-store";
import {
  discountPrice,
  getCategoryPathName,
  parsePrice,
  WHATSAPP_NUMBER,
  type Category,
  type ProductVariation,
  type ShopProduct,
} from "@/components/shop/data";

// ============================================================
// CART — the customer's selected pieces. Lines are resolved
// against live product data (names, images, options and current
// discounted prices), so what's shown here always matches the
// shop. Checkout happens over WhatsApp, mirroring the product
// modal's order flow.
// ============================================================

const rs = (n: number) => "Rs. " + n.toLocaleString("en-US");

interface ResolvedLine {
  key: string;
  product: ShopProduct;
  variant: ProductVariation | null;
  qty: number;
  unit: number;
  unitLabel: string;
  wasLabel: string | null;
  wasUnit: number | null;
}

export default function CartView({
  products,
  categories,
  origin,
  deliveryCharge = 0,
}: {
  products: ShopProduct[];
  categories: Category[];
  /** Site origin (scheme + host) for shareable product links. */
  origin: string;
  /** Flat delivery charge in rupees per order (admin-configurable). */
  deliveryCharge?: number;
}) {
  const lines = useCartLines();

  // Resolve store identity lines against the live collection.
  // Lines whose product was deactivated/deleted — or whose chosen
  // variation no longer exists — are dropped (and surfaced as a note
  // so the customer knows why an item vanished, instead of silently
  // repricing at a different option).
  const resolved = useMemo<ResolvedLine[]>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const out: ResolvedLine[] = [];
    for (const l of lines) {
      const product = byId.get(l.productId);
      if (!product) continue;
      // A line that picked an option must still find that option — a
      // deleted variation means the line can no longer be honored.
      if (l.variantId && !product.variations.some((v) => v.id === l.variantId)) {
        continue;
      }
      const variant = l.variantId
        ? (product.variations.find((v) => v.id === l.variantId) ?? null)
        : null;

      let unit: number;
      let unitLabel: string;
      let wasLabel: string | null = null;
      let wasUnit: number | null = null;
      if (variant) {
        unitLabel = variant.price;
        unit = parsePrice(variant.price) ?? 0;
      } else if (product.discount) {
        const dp = discountPrice(product.price, product.discount);
        unitLabel = dp ?? product.price;
        unit = parsePrice(unitLabel) ?? 0;
        wasLabel = product.price;
        wasUnit = parsePrice(product.price) ?? null;
      } else {
        unitLabel = product.price;
        unit = parsePrice(product.price) ?? 0;
      }

      out.push({
        key: lineKey(l.productId, l.variantId),
        product,
        variant,
        qty: l.qty,
        unit,
        unitLabel,
        wasLabel,
        wasUnit,
      });
    }
    return out;
  }, [lines, products]);

  const missing = lines.length - resolved.length;
  const itemCount = resolved.reduce((s, l) => s + l.qty, 0);
  const subtotal = resolved.reduce((s, l) => s + l.unit * l.qty, 0);
  const savings = resolved.reduce(
    (s, l) => s + ((l.wasUnit ?? l.unit) - l.unit) * l.qty,
    0
  );
  const delivery = deliveryCharge > 0 ? deliveryCharge : 0;
  const total = subtotal + delivery;

  // WhatsApp order — same format as the product modal's order link,
  // but listing every line with its option and shareable product link.
  const waMessage = resolved.length
    ? [
        "Hello Art of Frames! I'd like to order:",
        "",
        ...resolved.map((l) =>
          [
            `${l.product.name} × ${l.qty}`,
            l.variant
              ? `Variation: ${l.variant.label} — ${l.variant.price}`
              : l.wasLabel
                ? `${l.wasLabel} → ${l.unitLabel} (${l.product.discount?.label ?? "sale"})`
                : `Price: ${l.unitLabel}`,
            `Product: ${origin}/shop?product=${l.product.id}`,
          ].join("\n")
        ),
        "",
        ...(delivery > 0
          ? [`Delivery: ${rs(delivery)}`, ""]
          : []),
        `Total: ${rs(total)}`,
        "",
        "Please confirm availability.",
      ].join("\n")
    : "";
  const waHref = resolved.length
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`
    : "";

  return (
    <main className="min-h-screen bg-[#030712]">
      {/* No top-level nav link is active on the cart page — the cart
          icon in the navbar carries the active state there. */}
      <Navbar activeOverride="cart" />

      {/* overflow-clip (not hidden) — clips the ambient orbs without
          creating a scroll container, so the sticky summary works. */}
      <section className="relative overflow-clip pb-24 pt-28 lg:pb-32 lg:pt-36">
        {/* ── Ambient orbs ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/12 blur-[160px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/6 blur-[150px]"
        />
        {/* Dot grid */}
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
          {/* Header */}
          <div className="mt-6 flex flex-col gap-3">
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
                Your
              </span>
              <span
                className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Cart
              </span>
            </motion.h1>
            {itemCount > 0 && (
              <p className="text-sm text-gray-400">
                {itemCount} {itemCount === 1 ? "piece" : "pieces"} ready for
                the workshop
              </p>
            )}
          </div>

          {resolved.length === 0 ? (
            /* ── Empty state ── */
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-16 flex flex-col items-center gap-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#CCA681]">
                <ShoppingBag size={24} strokeWidth={1.8} />
              </span>
              <div>
                <p
                  className="text-xl text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Your cart is empty
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
                  Every piece at Art of Frames is designed, cut and finished
                  by hand — the collection is waiting for you.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Button variant="light" size="lg" href="/shop">
                  Browse the Collection
                </Button>
                <Button variant="outline" size="lg" href="/">
                  Back to Home
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
              {/* ── Line items ── */}
              <div className="min-w-0">
                {missing > 0 && (
                  <p className="mb-4 rounded-xl border border-[#E9A23B]/25 bg-[#E9A23B]/5 px-4 py-3 text-xs leading-relaxed text-[#CCA681]">
                    {missing}{" "}
                    {missing === 1
                      ? "item is no longer available and was removed"
                      : "items are no longer available and were removed"}{" "}
                    from your cart.
                  </p>
                )}

                <ul className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {resolved.map((l) => (
                      <motion.li
                        key={l.key}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors duration-300 hover:border-white/20 sm:gap-5 sm:p-5"
                      >
                        {/* Image → opens the product modal */}
                        <Link
                          href={`/shop?product=${l.product.id}`}
                          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-28 sm:w-28"
                        >
                          <Image
                            src={l.product.image}
                            alt={l.product.alt}
                            fill
                            sizes="112px"
                            className="object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </Link>

                        {/* Copy */}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-gray-500">
                            {getCategoryPathName(
                              l.product.categoryId,
                              categories
                            )}
                          </p>
                          <Link
                            href={`/shop?product=${l.product.id}`}
                            className="mt-0.5 line-clamp-2 text-base tracking-tight text-white transition-colors hover:text-[#CCA681] sm:text-lg"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 500,
                            }}
                          >
                            {l.product.name}
                          </Link>
                          {l.variant && (
                            <p className="mt-1 text-xs text-gray-400">
                              {l.variant.label}
                            </p>
                          )}
                          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
                            {l.wasLabel && (
                              <span className="text-xs font-medium text-gray-500 line-through">
                                {l.wasLabel}
                              </span>
                            )}
                            <span
                              className="text-base font-bold text-[#CCA681] sm:text-lg"
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                              }}
                            >
                              {l.unitLabel}
                            </span>
                            <span className="text-xs text-gray-500">
                              × {l.qty} ={" "}
                              <span className="font-semibold text-white">
                                {rs(l.unit * l.qty)}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Qty + remove */}
                        <div className="flex shrink-0 flex-col items-end justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => removeLine(l.product.id, l.variant?.id ?? null)}
                            aria-label={`Remove ${l.product.name} from cart`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 text-gray-400 transition-all duration-300 hover:border-[#FF4D3A]/60 hover:text-[#FF4D3A]"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                          <div className="flex items-center rounded-full border border-white/15 bg-white/5">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                setLineQty(
                                  l.product.id,
                                  l.variant?.id ?? null,
                                  l.qty - 1
                                )
                              }
                              className="flex h-9 w-9 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                            >
                              <Minus size={14} strokeWidth={2.2} />
                            </button>
                            <span
                              aria-live="polite"
                              className="w-7 text-center text-sm font-semibold text-white"
                            >
                              {l.qty}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() =>
                                setLineQty(
                                  l.product.id,
                                  l.variant?.id ?? null,
                                  l.qty + 1
                                )
                              }
                              className="flex h-9 w-9 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                            >
                              <Plus size={14} strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors duration-300 hover:text-[#CCA681]"
                >
                  <ArrowRight size={14} className="rotate-180" />
                  Continue shopping
                </Link>
              </div>

              {/* ── Order summary ── */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="card-shimmer relative overflow-hidden rounded-3xl border border-[#CCA681]/25 bg-white/[0.03] p-6 sm:p-7"
                >
                  <h2
                    className="text-xl tracking-tight text-white"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  >
                    Order Summary
                  </h2>

                  <dl className="mt-5 flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between text-gray-300">
                      <dt>Subtotal</dt>
                      <dd className="font-semibold text-white">{rs(subtotal)}</dd>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-[#CCA681]">
                        <dt>You save</dt>
                        <dd className="font-semibold">− {rs(savings)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-gray-300">
                      <dt>Delivery</dt>
                      <dd className="font-semibold text-white">
                        {delivery > 0 ? rs(delivery) : "Calculate at checkout"}
                      </dd>
                    </div>
                    <div className="my-1 h-px bg-white/10" />
                    <div className="flex items-baseline justify-between">
                      <dt className="text-xs uppercase tracking-widest text-gray-400">
                        Total
                      </dt>
                      <dd
                        className="text-2xl text-[#CCA681]"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                        }}
                      >
                        {rs(total)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col gap-3">
                    <Button
                      variant="light"
                      size="lg"
                      fullWidth
                      target="_blank"
                      rel="noopener noreferrer"
                      href={waHref}
                      icon={<MessageCircle size={15} strokeWidth={2.2} />}
                    >
                      Order on WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      href="/shop"
                      icon={<ShoppingBag size={15} strokeWidth={2.2} />}
                      iconPosition="left"
                    >
                      Continue Shopping
                    </Button>
                  </div>

                  <p className="mt-5 text-xs leading-relaxed text-gray-500">
                    Checkout happens over WhatsApp — we&apos;ll confirm
                    availability, engraving and delivery before you pay.
                    Every piece is made to order in our studio.
                  </p>
                </motion.div>
              </aside>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
