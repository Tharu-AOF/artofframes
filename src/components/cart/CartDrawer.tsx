"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import {
  closeCartDrawer,
  lineKey,
  removeLine,
  setLineQty,
  useCartDrawerOpen,
  useCartLines,
} from "@/lib/cart-store";

// ============================================================
// CART DRAWER — the slide-out cart opened from the navbar icon.
// Renders from the store's display snapshots, so it works on
// every page instantly (no data fetch). The full cart page
// (/cart) re-resolves against live product data; the drawer's
// Checkout button links there.
// ============================================================

const rs = (n: number) => "Rs. " + n.toLocaleString("en-US");

export default function CartDrawer() {
  const open = useCartDrawerOpen();
  const lines = useCartLines();
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open: lock body scroll, focus the close button, and
  // close on Escape. (No setState here — only DOM side effects.)
  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCartDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  // Simple focus trap — Tab cycles within the drawer panel.
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85]">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close cart"
            onClick={closeCartDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />

          {/* Panel */}            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Shopping cart"
              onKeyDown={trapFocus}
              initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#CCA681]/20 bg-[#06060f]/95 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="flex items-center gap-2.5">
                <ShoppingBag size={16} strokeWidth={2} className="text-[#CCA681]" />
                <span
                  className="text-sm font-semibold uppercase tracking-widest text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  Your Cart
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-[#5A1020] px-2 py-0.5 text-[10px] font-bold text-[#CCA681]">
                    {count}
                  </span>
                )}
              </p>
              <button
                type="button"
                ref={closeRef}
                onClick={closeCartDrawer}
                aria-label="Close cart"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            {/* Items */}
            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#CCA681]">
                  <ShoppingBag size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <p
                    className="text-base text-white"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                  >
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    The collection is waiting — every piece is made to order.
                  </p>
                </div>
                <Button
                  variant="light"
                  size="md"
                  href="/shop"
                  onClick={closeCartDrawer}
                >
                  Browse the Collection
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={lineKey(l.productId, l.variantId)}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors duration-300 hover:border-white/20"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <Image
                            src={l.image}
                            alt={l.alt}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <p
                            className="truncate text-sm tracking-tight text-white"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 500,
                            }}
                          >
                            {l.name}
                          </p>
                          {l.variantLabel && (
                            <p className="mt-0.5 truncate text-[11px] text-gray-400">
                              {l.variantLabel}
                            </p>
                          )}
                          <div className="mt-auto flex items-baseline gap-2 pt-1">
                            {l.wasLabel && (
                              <span className="text-[11px] font-medium text-gray-500 line-through">
                                {l.wasLabel}
                              </span>
                            )}
                            <span
                              className="text-sm font-bold text-[#CCA681]"
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                              }}
                            >
                              {l.unitLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              removeLine(l.productId, l.variantId)
                            }
                            aria-label={`Remove ${l.name} from cart`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 text-gray-400 transition-all duration-300 hover:border-[#FF4D3A]/60 hover:text-[#FF4D3A]"
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                          <div className="flex items-center rounded-full border border-white/15 bg-white/5">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                setLineQty(l.productId, l.variantId, l.qty - 1)
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                            >
                              <Minus size={12} strokeWidth={2.2} />
                            </button>
                            <span
                              aria-live="polite"
                              className="w-6 text-center text-xs font-semibold text-white"
                            >
                              {l.qty}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() =>
                                setLineQty(l.productId, l.variantId, l.qty + 1)
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                            >
                              <Plus size={12} strokeWidth={2.2} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                {/* Footer */}
                <div className="border-t border-white/10 px-5 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      Subtotal
                    </span>
                    <span
                      className="text-xl text-[#CCA681]"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                    >
                      {rs(subtotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Pricing refreshes on the cart page — every piece is made to
                    order.
                  </p>
                  <Button
                    variant="light"
                    size="lg"
                    fullWidth
                    className="mt-4"
                    href="/cart"
                    onClick={closeCartDrawer}
                    icon={<ArrowRight size={15} strokeWidth={2.2} />}
                  >
                    Checkout
                  </Button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
