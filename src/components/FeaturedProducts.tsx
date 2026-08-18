"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/Button";

// ============================================================
// FEATURED PRODUCTS — matches the page's dark ambient theme.
//
//   Left  : auto-playing carousel of transparent product shots
//           (no card, no border — the images float on the dark
//           background, softened by a drop shadow).
//   Right : eyebrow + section title, then the name + description
//           of whichever product is currently in the carousel,
//           and a "Go to Shop" CTA.
// ============================================================

export interface FeaturedProduct {
  name: string;
  description: string;
  image: string;
  alt: string;
}

// Curated in the admin panel — only products with "Show on
// landing page" checked appear here. The home page serves this
// section its data (server-fetched); this set is the fallback
// when that fetch fails.
export const DEFAULT_PRODUCTS: FeaturedProduct[] = [
  {
    name: "Laser-Cut Keytags",
    description:
      "Precision-cut keytags that keep every set of keys unmistakably yours — engraved in wood with your name, your brand, your story.",
    image: "/images/keytags.webp",
    alt: "Custom laser-cut wooden keytags",
  },
  {
    name: "Mommy & Me Frames",
    description:
      "Matching plywood frames crafted to hold the portraits that matter most — a timeless keepsake for the bond you treasure.",
    image: "/images/mommy-frames.webp",
    alt: "Mommy and me plywood photo frames",
  },
  {
    name: "Custom Signboards",
    description:
      "Bespoke signboards laser-cut from premium materials — from storefront statements to wedding-day centerpieces.",
    image: "/images/signboard.webp",
    alt: "Custom laser-cut wooden signboard",
  },
  {
    name: "Slide Cards",
    description:
      "Slim, laser-cut slide cards that carry your brand with quiet confidence — details so fine you can feel the craft.",
    image: "/images/slide-card.png",
    alt: "Laser-cut slide cards",
  },
  {
    name: "Wall Art",
    description:
      "Statement wall art that turns any room into a gallery — layered, textured, and cut to tell your story in light and shadow.",
    image: "/images/wallart.webp",
    alt: "Laser-cut wooden wall art",
  },
];

const AUTOPLAY_MS = 5000;

const FeaturedProducts = ({ products }: { products: FeaturedProduct[] }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // No flagged products means the admin hasn't curated the section
  // yet — show the curate-me hint instead of stale defaults.
  const showEmpty = products.length === 0;
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();


  // Parallax on the ambient layers — same depth feel as the rest
  // of the page.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbTopY = useTransform(scrollYProgress, [0, 1], [140, -200]);
  const orbBottomY = useTransform(scrollYProgress, [0, 1], [-120, 220]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  // Autoplay — restarts whenever the index changes (manual nav
  // included) and pauses while the cursor is over the carousel.
  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % products.length),
      AUTOPLAY_MS
    );
    return () => clearTimeout(id);
  }, [index, paused, reduceMotion, products.length]);

  // Clamped for the brief moment a curated list is shorter than
  // the slide we were on (e.g. 5 defaults → 3 flagged products).
  const safeIndex = Math.min(index, Math.max(products.length - 1, 0));
  const product = products[safeIndex];

  const goTo = (next: number) =>
    setIndex((next + products.length) % products.length);

  return (
    <section
      id="featured"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* ── Ambient orbs — parallax drift ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/4 h-[480px] w-[480px] rounded-full bg-[#5A1020]/10 blur-[160px] gpu-layer"
        style={{ y: reduceMotion ? 0 : orbTopY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/5 blur-[150px] gpu-layer"
        style={{ y: reduceMotion ? 0 : orbBottomY }}
      />

      {/* Dot grid overlay — slow upward drift (matches Services) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25] gpu-layer"
        style={{ y: reduceMotion ? 0 : gridY }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {showEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-14 text-center"
          >
            <div className="mb-5 flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-[#CCA681]" />
              <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                Handpicked for You
              </span>
              <div className="h-[1px] w-8 bg-[#CCA681]" />
            </div>
            <h3
              className="text-3xl tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Nothing featured yet
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-400">
              Turn on “Show on landing page” for any product in the admin
              panel and it will be featured here.
            </p>
            <div className="mt-7 flex justify-center">
              <Button variant="primary" size="lg" href="/shop">
                Shop the Collection
              </Button>
            </div>
          </motion.div>
        ) : (
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* ══ Left — carousel ══ */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
              {/* Stage */}
              <div
                role="region"
                aria-roledescription="carousel"
                aria-label="Featured products"
                className="relative h-[320px] sm:h-[400px] lg:h-[480px]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={safeIndex}
                    initial={{ opacity: 0, x: 48, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -48, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Image
                      src={product.image}
                      alt={product.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="h-full w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.45)]"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Arrows — centered on the image stage */}
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  aria-label="Previous product"
                  className="absolute top-1/2 left-0 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur transition-all duration-300 hover:bg-[#5A1020] hover:text-[#CCA681] hover:shadow-[0_0_25px_rgba(90,16,32,0.5)] sm:h-12 sm:w-12"
                >
                  <ChevronLeft size={20} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label="Next product"
                  className="absolute top-1/2 right-0 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur transition-all duration-300 hover:bg-[#5A1020] hover:text-[#CCA681] hover:shadow-[0_0_25px_rgba(90,16,32,0.5)] sm:h-12 sm:w-12"
                >
                  <ChevronRight size={20} strokeWidth={2.2} />
                </button>
              </div>

              {/* Dots */}
              <div className="mt-8 flex items-center justify-center gap-2.5">
                {products.map((p, i) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => goTo(i)}
                    aria-label={`Go to ${p.name}`}
                    aria-current={i === safeIndex ? "true" : undefined}
                    className="group p-1"
                  >
                    <span
                      className={`block rounded-full transition-all duration-300 ${i === index
                          ? "h-2 w-8 bg-[#CCA681]"
                          : "h-2 w-2 bg-white/25 group-hover:bg-white/50"
                        }`}
                    />                </button>
              ))}
            </div>
          </motion.div>

          {/* ══ Right — copy ══ */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col items-start gap-6 lg:gap-7"
          >
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-10 bg-[#CCA681]" />
                <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                  Handpicked for You
                </span>
              </div>

              <h2>
                <span
                  className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                  style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
                >
                  The pieces customers
                </span>
                <span
                  className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Love Most
                </span>
              </h2>

              {/* Synced product copy — fixed height keeps the CTA
                stable across slides; aria-live announces changes. */}
              <div className="mt-2 h-[160px] sm:h-[140px] lg:h-[150px]" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={safeIndex}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col gap-3"
                  >
                    <h3
                      className="text-xl tracking-tight text-[#CCA681] sm:text-2xl"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                    >
                      {product.name}
                    </h3>
                    <p className="max-w-md text-base leading-relaxed text-gray-400 lg:text-lg">
                      {product.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>            <div className="mt-2">
              <Button variant="primary" size="lg" href="/shop">
                Shop Now
              </Button>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
