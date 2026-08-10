"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";

// ============================================================
// GALLERY — bento grid of the studio's work.
//
// A mixed-size tile layout (one large 2x2 feature, two wide
// tiles, four square tiles, plus a "View All" CTA tile). Tiles
// follow the Services card language: rounded, hairline border,
// soft brand-tinted glow, image zoom + caption reveal on hover.
// ============================================================

export interface GalleryTile {
  title: string;
  /** Category display name (path name, resolved server-side) */
  category: string;
  image: string;
  alt: string;
  fill: "contain" | "cover";
  color: string;
  span: string;
}

// Only the in-action photo is unique vs. the Featured Products
// carousel (which already shows the product shots) — so the
// gallery keeps just that, next to the CTA tile. The home page
// serves this section its tiles (server-fetched); this set is the
// fallback when that fetch fails.
export const DEFAULT_TILES: GalleryTile[] = [
  {
    title: "Laser Cutting",
    category: "From the Studio",
    image: "/images/lasercut-industry-1-1024x683.jpg",
    alt: "Laser cutting in action",
    fill: "cover",
    color: "#E9A23B",
    span: "col-span-2",
  },
];

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const tileVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 26, stiffness: 130 },
  },
};

const Gallery = ({ tiles }: { tiles: GalleryTile[] }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Same ambient parallax language as Services / FeaturedProducts.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbTopY = useTransform(scrollYProgress, [0, 1], [160, -220]);
  const orbBottomY = useTransform(scrollYProgress, [0, 1], [-140, 240]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* ── Ambient orbs — parallax drift ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-[#5A1020]/10 blur-[160px]"
        style={{ y: reduceMotion ? 0 : orbTopY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#0E8C7B]/5 blur-[140px]"
        style={{ y: reduceMotion ? 0 : orbBottomY }}
      />

      {/* Dot grid overlay — slow upward drift */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 flex flex-col items-start gap-5 lg:mb-16"
        >
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-10 bg-[#CCA681]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
              Our Portfolio
            </span>
          </div>

          <h2>
            <span
              className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
              style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
            >
              A glimpse of
            </span>
            <span
              className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Our Craft
            </span>
          </h2>
        </motion.div>

        {/* ── Bento grid ── */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[240px] lg:grid-cols-4"
        >
          {tiles.map((tile) => (
            <motion.div key={tile.title} variants={tileVariants} className={tile.span}>
              <div className="group card-shimmer relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-[border-color] duration-300 hover:border-white/20">
                  {/* Brand-tinted glow — static + intensified on hover */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at 20% 20%, ${tile.color}14, transparent 60%)`,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(ellipse at 20% 20%, ${tile.color}2e, transparent 65%)`,
                    }}
                  />

                  {/* Image */}
                  <Image
                    src={tile.image}
                    alt={tile.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={`transition-transform duration-500 ease-out group-hover:scale-105 ${
                      tile.fill === "contain"
                        ? "p-6 object-contain sm:p-8"
                        : "object-cover"
                    }`}
                  />

                  {/* Caption scrim + label */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent px-5 pb-3 pt-8 sm:pt-14">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]">
                      {tile.category}
                    </p>
                    <p
                      className="text-base tracking-tight text-white sm:text-lg"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                    >
                      {tile.title}
                    </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* ── View All CTA tile ── */}
          <motion.div variants={tileVariants} className="col-span-2">
            <Link
              href="/shop"
              className="group card-shimmer relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#CCA681]/25 bg-linear-to-br from-[#5A1020]/60 via-[#5A1020]/25 to-transparent p-6 transition-all duration-300 hover:border-[#CCA681]/60 hover:shadow-[0_0_40px_rgba(90,16,32,0.4)] sm:p-8"
            >
              {/* Glow on hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(ellipse at 20% 20%, rgba(204,166,129,0.12), transparent 60%)",
                }}
              />

              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]">
                Explore
              </p>

              <div className="flex items-end justify-between gap-4">
                <p
                  className="text-xl tracking-tight text-white sm:text-2xl"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  Shop Now
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
      </div>
    </section>
  );
};

export default Gallery;
