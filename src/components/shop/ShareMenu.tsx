"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import type { ShopProduct } from "@/components/shop/data";

// ============================================================
// SHARE MENU — the share button + popover in the product details
// modal. Shares a deep link (/shop?product=<id>) that re-opens the
// product's modal for the recipient. Follows the modern pattern:
// one "Share" that opens the OS-native share sheet (Facebook,
// Instagram, WhatsApp and more live there), plus "Copy link" as
// the universal fallback. Per-network URLs are gone — Meta/X no
// longer support prefilled web share intents.
// ============================================================

interface ShareMenuProps {
  product: ShopProduct;
}

export default function ShareMenu({ product }: ShareMenuProps) {
  // The popover is tagged with the product it was opened for, so a
  // switch to another product automatically closes it — no effect
  // or render-time state juggling needed.
  const [shareMenu, setShareMenu] = useState<{ pid: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const open = shareMenu?.pid === product.id;
  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  const toggle = () => {
    setCopied(false);
    setShareMenu(open ? null : { pid: product.id });
  };
  const close = () => {
    setCopied(false);
    setShareMenu(null);
  };

  const url =
    typeof window === "undefined"
      ? "/shop"
      : `${window.location.origin}/shop?product=${encodeURIComponent(product.id)}`;
  const text = `Check out "${product.name}" from Art of Frames`;

  // Escape closes the popover first — registered in the capture
  // phase so it stops the modal's own Escape handler and the modal
  // stays open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setCopied(false);
        setShareMenu(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // The single "Share" action — the OS share sheet, which lists the
  // apps the visitor actually has (Facebook, Instagram, WhatsApp…).
  const share = () => {
    if (!canNativeShare) return;
    void navigator
      .share({ title: product.name, text, url })
      .catch(() => {}) // user dismissed the sheet
      .finally(() => close());
  };

  const copyLink = () => {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => close(), 1300);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Share this product"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all duration-300 hover:scale-105 hover:border-[#CCA681] hover:text-[#CCA681]"
      >
        <Share2 size={15} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away catcher */}
            <button
              type="button"
              aria-label="Close share menu"
              onClick={close}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              role="menu"
              aria-label="Share options"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Share this piece
              </p>

              {canNativeShare && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={share}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#CCA681]">
                    <Share2 size={13} strokeWidth={2} />
                  </span>
                  Share…
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={copyLink}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition-colors duration-200 hover:bg-white/5 hover:text-white"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#CCA681]">
                  {copied ? (
                    <Check size={13} strokeWidth={2.6} />
                  ) : (
                    <Copy size={13} strokeWidth={2} />
                  )}
                </span>
                {copied ? "Link copied!" : "Copy link"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
