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

// ============================================================
// HERO — multi-depth parallax. Background orbs, the grid and
// floating particles each drift at their own speed as the page
// scrolls, while the content lags behind and fades out — a
// layered "depth" effect driven by one section-scoped
// scrollYProgress.
// ============================================================

interface ParticleConfig {
  className: string;
  size: number;
  color: string;
  speed: number;
  shape: "dot" | "ring";
}

// Deterministic positions + speeds. Each particle gets its own
// hook inside <ParallaxParticle>, so this array stays a module
// constant and the map stays hook-safe.
const particles: ParticleConfig[] = [
  { className: "top-[16%] left-[10%]", size: 12, color: "#CCA681", speed: 90, shape: "dot" },
  { className: "top-[26%] right-[12%]", size: 7, color: "#0E8C7B", speed: 190, shape: "dot" },
  { className: "top-[66%] left-[8%]", size: 5, color: "#CCA681", speed: 240, shape: "dot" },
  { className: "top-[74%] right-[14%]", size: 14, color: "#685558", speed: 130, shape: "ring" },
  { className: "top-[10%] left-[44%]", size: 4, color: "#5A1020", speed: 300, shape: "dot" },
  { className: "bottom-[30%] left-[78%]", size: 6, color: "#CCA681", speed: 210, shape: "dot" },
];

// Hero background photos — rotate continuously with a crossfade.
// Clean ASCII copies of the source images (renamed to avoid the
// unicode "…" in the originals) live in /public/images/hero/.
const heroImages = [
  "/images/hero/hero-1.jpeg", // wooden wall clock on wall
  "/images/hero/hero-2.jpeg", // wooden silhouette ultrasound art
  "/images/hero/hero-3.jpeg", // wooden valentine cards in a box
  "/images/hero/hero-4.jpeg",
  "/images/hero/hero-5.jpeg",
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

  // Auto-rotating background — advances every 5s, never pauses.
  const [bgIndex, setBgIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setBgIndex((i) => (i + 1) % heroImages.length),
      5000
    );
    return () => clearInterval(id);
  }, []);

  // Section-scoped progress: 0 while the hero is at the top of the
  // viewport, 1 once it has fully scrolled past.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Depth layers — far (big) layers move slowly, near layers fast.
  const orbFarY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const orbMidY = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const orbNearY = useTransform(scrollYProgress, [0, 1], [0, -360]);

  const gridY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const gridScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  // Content lags behind the scroll and gently fades out.
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.2]);

  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  // Background controls fade out once the hero scrolls away.
  const controlsOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 100,
      },
    },
  };

  // Word-by-word reveal for the headline
  const wordVariants = {
    hidden: { y: 20, opacity: 0, filter: "blur(4px)" },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: 0.4 + i * 0.12,
        duration: 0.5,
        ease: "easeOut" as const,
      },
    }),
  };

  // Each line is a phrase; accent words sit on their own line
  const headlineLines = [
    { words: ["Designed", "with"], accent: "Passion," },
    { words: ["Crafted", "with"], accent: "Precision" },
  ];

  // Running word index across all lines for the stagger animation
  let globalWordIndex = 0;

  return (
    <div
      id="home"
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-[#030712]"
    >
      {/* ── Background: only the active photo is mounted, crossfading
          via AnimatePresence — one full-screen image in the DOM at a
          time (plus the briefly-exiting slide) instead of all five
          eager-loaded at once, so the hero doesn't download the
          whole rotation before first paint. ── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={bgIndex}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{
            opacity: 1,
            // Gentle Ken Burns zoom while a photo is on stage.
            scale: reduceMotion ? 1 : 1.08,
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.2, ease: "easeInOut" },
            scale: { duration: 7, ease: "linear" },
          }}
        >
          <Image
            src={heroImages[bgIndex]}
            alt=""
            fill
            sizes="100vw"
            priority={bgIndex === 0}
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Hidden preload of the upcoming photo — fetched while the
          current slide is on stage (5s) so the rotation crossfade
          never waits on a fresh download. Invisible + inert. */}
      <Image
        src={heroImages[(bgIndex + 1) % heroImages.length]}
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0"
      />

      {/* ── Depth layer: far orbs (slowest) ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ y: reduceMotion ? 0 : orbFarY }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#5A1020]/5 blur-[150px]" />
      </motion.div>

      {/* ── Depth layer: mid orbs ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ y: reduceMotion ? 0 : orbMidY }}
      >
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-[#685558]/8 blur-[120px]" />
        <div className="absolute top-[12%] right-[18%] h-[180px] w-[180px] rounded-full bg-[#CCA681]/5 blur-[70px]" />
      </motion.div>

      {/* ── Depth layer: near orbs (fastest) ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ y: reduceMotion ? 0 : orbNearY }}
      >
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[#5A1020]/8 blur-[100px]" />
        <div className="absolute bottom-[8%] left-[16%] h-[140px] w-[140px] rounded-full bg-[#0E8C7B]/5 blur-[60px]" />
      </motion.div>

      {/* ── Depth layer: grid pattern (slow drift + subtle zoom) ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          y: reduceMotion ? 0 : gridY,
          scale: reduceMotion ? 1 : gridScale,
        }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(rgba(90, 16, 32, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(90, 16, 32, 0.5) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </motion.div>

      {/* ── Dark fade from the screen's left edge — readability behind the text ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(3,7,18,0.9)_0%,rgba(3,7,18,0.5)_30%,transparent_62%)]"
      />

      {/* ── Depth layer: floating particles ── */}
      {particles.map((config, index) => (
        <ParallaxParticle
          key={index}
          config={config}
          progress={scrollYProgress}
        />
      ))}

      {/* ── Main Hero Content (parallax wrapper) ── */}
      <motion.div
        style={{
          y: reduceMotion ? 0 : contentY,
          opacity: reduceMotion ? 1 : contentOpacity,
        }}
        className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pb-24 pt-24 lg:px-8 lg:pb-28 lg:pt-28"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6 lg:gap-8"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="h-[1px] w-10 bg-[#CCA681]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
              Art of Frames
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
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
                        style={{ marginRight: "0.25em" }}
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
                  className="inline-block whitespace-nowrap bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-[1.15em] text-transparent"
                  style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
                >
                  {line.accent}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-md text-base leading-relaxed text-gray-400 lg:text-lg"
          >
            Art of Frames transforms your memories into premium keepsakes
            through laser-cutting, engraving, and bespoke artistry.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <Button variant="primary" size="lg" href="/shop">
              Shop Now
            </Button>

            <Button variant="outline" size="lg" href="#quote">
              Bulk Order
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Background controls: prev/next + dots (right center) ── */}
      <motion.div
        style={{ opacity: reduceMotion ? 1 : controlsOpacity }}
        className="absolute top-1/2 right-6 z-20 flex -translate-y-1/2 flex-col items-center gap-3 lg:right-8"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() =>
            setBgIndex((i) => (i - 1 + heroImages.length) % heroImages.length)
          }
          aria-label="Previous background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-colors hover:border-[#CCA681]/50 hover:bg-[#CCA681]/10 hover:text-[#CCA681]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 15l-6-6-6 6"
            />
          </svg>
        </motion.button>

        {/* Dots — one per image, click to jump */}
        <div
          role="group"
          aria-label="Background image selection"
          className="flex flex-col items-center gap-2"
        >
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              aria-label={`Show background image ${i + 1} of ${heroImages.length}`}
              aria-current={i === bgIndex || undefined}
              className={`h-2 rounded-full transition-all duration-300 ${i === bgIndex
                  ? "w-6 bg-[#CCA681]"
                  : "w-2 bg-white/40 hover:bg-white/70"
                }`}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setBgIndex((i) => (i + 1) % heroImages.length)}
          aria-label="Next background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-colors hover:border-[#CCA681]/50 hover:bg-[#CCA681]/10 hover:text-[#CCA681]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </motion.button>

      </motion.div>

      {/* ── Scroll Indicator (fades out as you scroll) ── */}
      <motion.div
        style={{ opacity: reduceMotion ? 1 : indicatorOpacity }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 lg:bottom-8"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-widest text-gray-500">SCROLL</span>
          <motion.div
            className="flex h-8 w-5 items-start justify-center rounded-full border-2 border-white/20 p-1.5 lg:h-10 lg:w-6"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="h-2 w-1 rounded-full bg-[#CCA681] lg:h-3 lg:w-1.5" />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Hero;
