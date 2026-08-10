"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import type { Offer } from "@/components/shop/data";

// ============================================================
// OFFERS CAROUSEL — the shop page's header: a full-width hero
// that cycles through active offers (cover image, title, CTA).
// Falls back to the editorial header in ShopCollection when no
// offers exist. Autoplays, pauses on hover, keyboard-friendly.
// ============================================================

const AUTOPLAY_MS = 6000;

// Ken Burns drift — a slow continuous scale+pan so the cover image
// feels alive. Direction alternates per slide for variety. Skipped
// entirely for users who prefer reduced motion.
const KENBURNS_MS = 12000;

export default function OffersCarousel({ offers }: { offers: Offer[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const length = offers.length;

  // Autoplay — restarts on manual nav and respects reduced motion.
  useEffect(() => {
    if (paused || reduceMotion || length <= 1) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % length), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, paused, reduceMotion, length]);

  const goTo = (next: number) => setIndex((next + length) % length);
  const offer = offers[Math.min(index, length - 1)];

  // Even slides gently zoom in (and drift left), odd slides zoom out
  // (and drift right) — restarts fresh on every slide change.
  // The pan only happens while the image is scaled (scale 1 = zero
  // bleed), so the edges never show through.
  const kenBurns = reduceMotion
    ? null
    : index % 2 === 0
      ? {
          initial: { scale: 1, x: 0 },
          animate: { scale: 1.15, x: "-1.5%" },
        }
      : {
          initial: { scale: 1.15, x: "1.5%" },
          animate: { scale: 1, x: 0 },
        };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Current offers"
        className="relative h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#06060f] sm:h-[440px] lg:h-[500px]"
      >
        {/* Slide — cover image + readability scrims */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Ken Burns layer — slow transform drift (no layout
                thrash); static image when reduced motion is on. */}
            <motion.div
              initial={kenBurns?.initial}
              animate={kenBurns?.animate}
              transition={{ duration: KENBURNS_MS / 1000, ease: "linear" }}
              className="absolute inset-0"
            >
              <Image
                src={offer.image}
                alt={offer.title}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-[#030712] via-[#030712]/45 to-[#030712]/5"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-r from-[#030712]/75 via-[#030712]/25 to-transparent"
            />
          </motion.div>
        </AnimatePresence>

        {/* Copy — ribbon badge (top-left) + title + CTA */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
            className="absolute inset-0"
          >
            {/* Stylized ribbon — top left, larger, with a folded tail */}
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.25,
                type: "spring" as const,
                damping: 14,
                stiffness: 220,
              }}
              className="absolute left-5 top-5 z-20 inline-flex items-center gap-2.5 bg-linear-to-r from-[#E9A23B] via-[#DBA642] to-[#CCA681] py-2.5 pl-5 pr-7 text-sm font-extrabold uppercase tracking-[0.16em] text-[#5A1020] shadow-[0_10px_30px_rgba(233,162,59,0.45)] sm:left-8 sm:top-8 sm:text-base"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)",
              }}
            >
              <Sparkles size={15} strokeWidth={2.5} className="fill-current" />
              Special Offer
            </motion.span>

            <div className="absolute inset-x-0 bottom-0 flex max-w-2xl flex-col items-start justify-end gap-5 p-6 pb-20 sm:p-10 sm:pb-24 lg:p-12">
              <h2
                className="text-3xl leading-tight text-white sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                {offer.title}
              </h2>
              {offer.ctaLabel && offer.ctaLink && (
                <Button variant="light" size="lg" className="btn-shine" href={offer.ctaLink}>
                  {offer.ctaLabel}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation — arrows + dots grouped at the bottom right */}
        {length > 1 && (
          <div
            className="absolute bottom-5 right-5 z-20 flex items-center gap-2.5 sm:right-8"
            role="group"
            aria-label="Offer navigation"
          >
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous offer"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition-all duration-300 hover:bg-[#5A1020] hover:text-[#CCA681] sm:h-11 sm:w-11"
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </button>

            <div
              className="flex items-center gap-1.5"
              role="tablist"
              aria-label="Choose offer"
            >
              {offers.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to offer ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className="group p-1"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      i === index
                        ? "h-2 w-8 bg-[#CCA681]"
                        : "h-2 w-2 bg-white/30 group-hover:bg-white/60"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next offer"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition-all duration-300 hover:bg-[#5A1020] hover:text-[#CCA681] sm:h-11 sm:w-11"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
