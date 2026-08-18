"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Button from "@/components/Button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Star, Truck, Award, ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================
// HERO — Luxury Dual-Mode Architecture:
// 1. Desktop (lg+): Full-bleed multi-depth parallax with Ken Burns
//    rotations, floating particles, and layered depth.
// 2. Mobile (<lg): Dedicated floating visual stage showing crisp,
//    uncropped product masterpieces with touch controls and trust metrics.
// ============================================================

interface ParticleConfig {
  className: string;
  size: number;
  color: string;
  speed: number;
  shape: "dot" | "ring";
}

const particles: ParticleConfig[] = [
  { className: "top-[16%] left-[10%]", size: 12, color: "#CCA681", speed: 90, shape: "dot" },
  { className: "top-[26%] right-[12%]", size: 7, color: "#0E8C7B", speed: 190, shape: "dot" },
  { className: "top-[66%] left-[8%]", size: 5, color: "#CCA681", speed: 240, shape: "dot" },
  { className: "top-[74%] right-[14%]", size: 14, color: "#685558", speed: 130, shape: "ring" },
  { className: "top-[10%] left-[44%]", size: 4, color: "#5A1020", speed: 300, shape: "dot" },
  { className: "bottom-[30%] left-[78%]", size: 6, color: "#CCA681", speed: 210, shape: "dot" },
];

const heroSlides = [
  {
    image: "/images/hero/hero-1.jpeg",
    title: "Bespoke Wooden Wall Clocks",
    tag: "Custom Woodcraft",
  },
  {
    image: "/images/hero/hero-2.jpeg",
    title: "Silhouette & Ultrasound Art",
    tag: "Keepsake Frames",
  },
  {
    image: "/images/hero/hero-3.jpeg",
    title: "Engraved Love Cards & Boxes",
    tag: "Personalized Gifts",
  },
  {
    image: "/images/hero/hero-4.jpeg",
    title: "Laser-Cut Wooden Decor",
    tag: "Artisanal Pieces",
  },
  {
    image: "/images/hero/hero-5.jpeg",
    title: "Handcrafted Luxury Frames",
    tag: "Signature Frames",
  },
];

function ParallaxParticle({
  config,
  progress,
}: {
  config: ParticleConfig;
  progress: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const y = useTransform(progress, [0, 1], [0, config.speed]);

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute ${config.className}`}
      style={{ y: reduceMotion ? 0 : y }}
    >
      {config.shape === "ring" ? (
        <div
          className="rounded-full"
          style={{
            width: config.size,
            height: config.size,
            border: `1.5px solid ${config.color}55`,
          }}
        />
      ) : (
        <div
          className="rounded-full"
          style={{
            width: config.size,
            height: config.size,
            background: `${config.color}80`,
            boxShadow: `0 0 12px ${config.color}40`,
          }}
        />
      )}
    </motion.div>
  );
}

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Auto-rotating slide index — advances every 5s
  const [bgIndex, setBgIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setBgIndex((i) => (i + 1) % heroSlides.length),
      5000
    );
    return () => clearInterval(id);
  }, []);

  // Section scroll progress
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Desktop Depth layers
  const orbFarY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const orbMidY = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const orbNearY = useTransform(scrollYProgress, [0, 1], [0, -360]);

  const gridY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const gridScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.2]);

  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const controlsOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 28, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        damping: 24,
        stiffness: 110,
      },
    },
  };

  const wordVariants = {
    hidden: { y: 18, opacity: 0, filter: "blur(4px)" },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: 0.3 + i * 0.1,
        duration: 0.45,
        ease: "easeOut" as const,
      },
    }),
  };

  const headlineLines = [
    { words: ["Designed", "with"], accent: "Passion," },
    { words: ["Crafted", "with"], accent: "Precision" },
  ];

  let globalWordIndex = 0;

  return (
    <div
      id="home"
      ref={containerRef}
      className="relative min-h-[100svh] overflow-hidden bg-[#030712]"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP HERO BACKGROUND (Full-bleed cinematic parallax)
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <AnimatePresence initial={false}>
          <motion.div
            key={bgIndex}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{
              opacity: 1,
              scale: reduceMotion ? 1 : 1.08,
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.2, ease: "easeInOut" },
              scale: { duration: 7, ease: "linear" },
            }}
          >
            <Image
              src={heroSlides[bgIndex].image}
              alt=""
              fill
              sizes="100vw"
              priority={bgIndex === 0}
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Hidden preload */}
        <Image
          src={heroSlides[(bgIndex + 1) % heroSlides.length].image}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 object-cover object-center"
        />

        {/* Desktop Gradient Scrim */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.6)_38%,transparent_68%)]"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SHARED AMBIENT DEPTH LAYERS (Orbs, Grid, Particles)
      ───────────────────────────────────────────────────────────── */}
      {/* Far orb */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden gpu-layer"
        style={{ y: reduceMotion ? 0 : orbFarY }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] sm:h-[600px] sm:w-[600px] rounded-full bg-[#5A1020]/15 blur-[120px] sm:blur-[150px]" />
      </motion.div>

      {/* Mid orb */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden gpu-layer"
        style={{ y: reduceMotion ? 0 : orbMidY }}
      >
        <div className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-[#685558]/12 blur-[100px]" />
        <div className="absolute top-[12%] right-[18%] h-[180px] w-[180px] rounded-full bg-[#CCA681]/10 blur-[70px]" />
      </motion.div>

      {/* Near orb */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden gpu-layer"
        style={{ y: reduceMotion ? 0 : orbNearY }}
      >
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-[#5A1020]/10 blur-[90px]" />
        <div className="absolute bottom-[8%] left-[16%] h-[140px] w-[140px] rounded-full bg-[#0E8C7B]/8 blur-[60px]" />
      </motion.div>

      {/* Grid pattern */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          y: reduceMotion ? 0 : gridY,
          scale: reduceMotion ? 1 : gridScale,
        }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(rgba(204, 166, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(204, 166, 129, 0.4) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </motion.div>

      {/* Floating particles */}
      {particles.map((config, index) => (
        <ParallaxParticle
          key={index}
          config={config}
          progress={scrollYProgress}
        />
      ))}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN HERO CONTENT (Unified Responsive Stack)
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        style={{
          y: reduceMotion ? 0 : contentY,
          opacity: reduceMotion ? 1 : contentOpacity,
        }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-28"
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Editorial Headline & Actions */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5 text-center sm:text-left lg:col-span-7 lg:gap-7"
          >
            {/* Eyebrow badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-[#CCA681]/30 bg-[#CCA681]/10 px-3.5 py-1.5 backdrop-blur-md sm:self-start"
            >
              <Sparkles size={13} className="text-[#CCA681]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#CCA681]">
                Art of Frames • Sri Lanka
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-3xl leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 400,
              }}
            >
              {headlineLines.map((line, lineIndex) => (
                <span key={lineIndex} className="block text-white">
                  <span className="block">
                    {line.words.map((word) => {
                      const index = globalWordIndex++;
                      return (
                        <motion.span
                          key={word}
                          custom={index}
                          variants={wordVariants}
                          initial="hidden"
                          animate="visible"
                          className="inline-block whitespace-nowrap"
                          style={{ marginRight: "0.22em" }}
                        >
                          {word}
                        </motion.span>
                      );
                    })}
                  </span>
                  <motion.span
                    custom={globalWordIndex++}
                    variants={wordVariants}
                    initial="hidden"
                    animate="visible"
                    className="inline-block whitespace-nowrap bg-linear-to-r from-[#CCA681] via-[#E9A23B] to-[#CCA681] bg-clip-text text-[1.14em] text-transparent drop-shadow-[0_2px_12px_rgba(204,166,129,0.3)]"
                    style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
                  >
                    {line.accent}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="mx-auto max-w-lg text-sm leading-relaxed text-gray-300 sm:mx-0 sm:text-base sm:text-gray-400 lg:text-lg"
            >
              Transform your precious memories into heirloom keepsakes
              through precision laser-cutting, fine woodcraft, and bespoke artistry.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-3.5 pt-1 sm:justify-start sm:gap-4"
            >
              <Button variant="primary" size="lg" href="/shop">
                Explore Shop
              </Button>

              <Button variant="outline" size="lg" href="#quote">
                Bulk / Custom Order
              </Button>
            </motion.div>
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────
              4. MOBILE DEDICATED VISUAL STAGE (< lg screens)
          ───────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            className="relative block w-full lg:hidden"
          >
            {/* Ambient luxury halo behind card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-3xl bg-linear-to-br from-[#CCA681]/25 via-[#5A1020]/35 to-[#0E8C7B]/20 blur-xl opacity-75"
            />

            {/* Floating Glassmorphic Product Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-2xl backdrop-blur-xl">
              {/* Product Visual Container */}
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-gray-950 sm:aspect-[16/10]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={bgIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={heroSlides[bgIndex].image}
                      alt={heroSlides[bgIndex].title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                      className="object-cover object-center"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Badge Chip */}
                <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#CCA681] backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#CCA681] animate-pulse" />
                  {heroSlides[bgIndex].tag}
                </div>

                {/* Bottom Title Scrim & Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-linear-to-t from-black/95 via-black/60 to-transparent p-4 pt-12">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#CCA681]">
                      Featured Craft
                    </p>
                    <p
                      className="text-base font-medium text-white sm:text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {heroSlides[bgIndex].title}
                    </p>
                  </div>

                  {/* Micro Next/Prev Arrow Controls */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setBgIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)
                      }
                      aria-label="Previous slide"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:border-[#CCA681] hover:text-[#CCA681]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBgIndex((i) => (i + 1) % heroSlides.length)
                      }
                      aria-label="Next slide"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all active:scale-95 hover:border-[#CCA681] hover:text-[#CCA681]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Progress Dots */}
              <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setBgIndex(i)}
                      aria-label={`Jump to slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === bgIndex ? "w-6 bg-[#CCA681]" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
                <Link
                  href="/gallery"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#CCA681] hover:underline"
                >
                  <span>View All Gallery</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. MOBILE TRUST STRIP (Instant Credibility)
        ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-6 sm:mt-10 sm:justify-start lg:hidden"
        >
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCA681]/15 text-[#CCA681]">
              <Star size={12} className="fill-[#CCA681]" />
            </div>
            <span><strong className="text-white">4.9/5</strong> Star Rating</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-300">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0E8C7B]/15 text-[#0E8C7B]">
              <Truck size={12} />
            </div>
            <span><strong className="text-white">Islandwide</strong> Safe Delivery</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-300">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5A1020]/25 text-[#CCA681]">
              <Award size={12} />
            </div>
            <span><strong className="text-white">100%</strong> Custom Handcrafted</span>
          </div>
        </motion.div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          6. DESKTOP RIGHT-CENTER SLIDE CONTROLS (lg+ screens)
      ───────────────────────────────────────────────────────────── */}
      <motion.div
        style={{ opacity: reduceMotion ? 1 : controlsOpacity }}
        className="hidden absolute top-1/2 right-6 z-20 -translate-y-1/2 flex-col items-center gap-3 lg:flex lg:right-8"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() =>
            setBgIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)
          }
          aria-label="Previous background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-colors hover:border-[#CCA681]/50 hover:bg-[#CCA681]/10 hover:text-[#CCA681]"
        >
          <ChevronLeft size={18} />
        </motion.button>

        {/* Dots */}
        <div
          role="group"
          aria-label="Background image selection"
          className="flex flex-col items-center gap-2"
        >
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              aria-label={`Show slide ${i + 1} of ${heroSlides.length}`}
              aria-current={i === bgIndex || undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === bgIndex
                  ? "w-6 bg-[#CCA681]"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setBgIndex((i) => (i + 1) % heroSlides.length)}
          aria-label="Next background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-colors hover:border-[#CCA681]/50 hover:bg-[#CCA681]/10 hover:text-[#CCA681]"
        >
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: reduceMotion ? 1 : indicatorOpacity }}
        className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-[#CCA681]/80">
          Scroll to explore
        </span>
        <div className="flex h-7 w-4 justify-center rounded-full border border-white/20 p-1">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
              ease: "easeInOut",
            }}
            className="h-1.5 w-1 rounded-full bg-[#CCA681]"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
