"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Button from "@/components/Button";

// ============================================================
// SERVICES — spotlight card grid with aurora glow, magnetic 3D
// tilt and focus-dim siblings. Adapted from kokonutui's
// spotlight-cards pattern to the Art of Frames brand.
//
// Parallax: the ambient orbs, dot grid and header lockup all lag
// behind the scroll at different rates.
// ============================================================

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;
const GLOW_SPRING = { stiffness: 180, damping: 22 } as const;

interface ServiceItem {
  title: string;
  description: string;
  color: string;
  /** Optional photo background — rendered below all card effects. */
  image?: string;
}

const services: ServiceItem[] = [
  {
    title: "Custom Products",
    description:
      "Tailored branding solutions that showcase your identity with precision and style.",
    color: "#CCA681",
    image: "/images/custom-products.webp",
  },
  {
    title: "Custom Gifts",
    description:
      "Handcrafted keepsakes designed to make every occasion truly unforgettable.",
    color: "#0E8C7B",
    image: "/images/custom-gifts.png",
  },
  {
    title: "Laser Cutting & Engraving",
    description:
      "Detailed engraving and precision cutting on wood, paper, and cardboard for flawless artistry.",
    color: "#E9A23B",
    image: "/images/laser-engraving.webp",
  },
  {
    title: "Photo Frames",
    description:
      "Premium plymount and glass frames created to preserve and highlight your treasured memories.",
    color: "#C77DA6",
    image: "/images/photo.webp",
  },
];

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  item: ServiceItem;
  dimmed: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function Card({ item, dimmed, onHoverStart, onHoverEnd }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(reduceMotion ? 0 : 1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{
        scale: dimmed ? 0.96 : 1,
        opacity: dimmed ? 0.5 : 1,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group relative flex h-full min-h-[300px] flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-[border-color] duration-300 hover:border-white/20 sm:min-h-[440px] sm:gap-5 sm:p-6"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformPerspective: reduceMotion ? undefined : 900,
      }}
    >
      {/* Background photo — the bottom-most layer, all effects
        (tint, glow, shimmer, text) render above it. */}
      {item.image && (
        <Image
          src={item.image}
          alt=""
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="pointer-events-none object-cover"
        />
      )}

      {/* Bottom fade — darkens the text area for readability while
        keeping the photo visible above; still below the accent
        tint, glow and shimmer. */}
      {item.image && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-t from-black/95 via-black/50 to-transparent"
        />
      )}

      {/* Static accent tint — always visible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}14, transparent 65%)`,
        }}
      />

      {/* Hover glow layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}2e, transparent 65%)`,
        }}
      />

      {/* Shimmer sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[55%] -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[280%]"
      />

      {/* Text — pinned to the bottom-left of the card */}
      <div className="relative z-10 mt-auto flex flex-col gap-2 text-left">
        <h3
          className="text-base tracking-tight text-white sm:text-lg"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {item.title}
        </h3>
        <p className="text-sm leading-relaxed text-gray-400">
          {item.description}
        </p>
      </div>

      {/* Accent bottom line */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{
          background: `linear-gradient(to right, ${item.color}80, transparent)`,
        }}
      />
    </motion.div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Opacity-only reveal for the staggered card entrance.
const cardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { type: "spring" as const, damping: 24, stiffness: 120 },
  },
};

// Wraps each card so the grid's stagger reveal applies per card.
// Cards stay top-aligned — all drift is handled by the header and
// background layers only.
function CardLayer({
  item,
  dimmed,
  onHoverStart,
  onHoverEnd,
}: {
  item: ServiceItem;
  dimmed: boolean;
  onHoverStart: (title: string) => void;
  onHoverEnd: () => void;
}) {
  return (
    <motion.div variants={cardVariants}>
      <Card
        dimmed={dimmed}
        item={item}
        onHoverEnd={onHoverEnd}
        onHoverStart={() => onHoverStart(item.title)}
      />
    </motion.div>
  );
}

const Services = () => {
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Section-scoped progress: 0 while entering, 1 after leaving.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Background layers lag behind the scroll at different rates.
  const orbTopY = useTransform(scrollYProgress, [0, 1], [160, -220]);
  const orbBottomY = useTransform(scrollYProgress, [0, 1], [-140, 240]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -70]);

  // The header block lags behind the scroll for a soft depth feel.
  const headerY = useTransform(scrollYProgress, [0, 1], [80, -40]);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* Ambient orbs — parallax drift */}
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
        {/* Header — eyebrow + headline on the left, Explore on the right */}
        <motion.div
          style={{ y: reduceMotion ? 0 : headerY }}
          className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex max-w-2xl flex-col items-start gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-[1px] w-10 bg-[#CCA681]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
              Our Services
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span
              className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
              style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
            >
              The art of
            </span>
            <span
              className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Expertise
            </span>
          </motion.h2>

          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:shrink-0"
          >
            <Button variant="outline" size="md" href="#services-grid">
              Explore More
            </Button>
          </motion.div>
        </motion.div>

        {/* Card grid */}
        <motion.div
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          id="services-grid"
          className="relative mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-14 lg:grid-cols-4"
        >
          {services.map((item) => (
            <CardLayer
              key={item.title}
              item={item}
              dimmed={hoveredTitle !== null && hoveredTitle !== item.title}
              onHoverEnd={() => setHoveredTitle(null)}
              onHoverStart={(title) => setHoveredTitle(title)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
