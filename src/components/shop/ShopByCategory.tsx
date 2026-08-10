"use client";

import { useRef, useState, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Baby,
  Clock,
  Crown,
  Frame,
  Heart,
  Hotel,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./data";

// ============================================================
// SHOP BY CATEGORY — a single-row strip of the browse categories,
// shown on the shop page right below the offers carousel. The
// cards borrow the Expertise section's look: magnetic 3D tilt,
// brand-tinted glow, shimmer sweep, a tinted icon badge and an
// accent bottom line, with sibling cards dimming on hover. Each
// card is just an icon + the category title; clicking jumps into
// the filtered collection (same handler as the sidebar). On
// mobile the strip scrolls horizontally; from sm up it spreads
// across one full row. Pure UI — derives everything from the
// category tree the collection already receives.
// ============================================================

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;
const GLOW_SPRING = { stiffness: 180, damping: 22 } as const;

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  "hotel-items": { icon: Hotel, color: "#CCA681" },
  "wall-arts": { icon: Frame, color: "#0E8C7B" },
  "baby-frames": { icon: Baby, color: "#E9A23B" },
  clocks: { icon: Clock, color: "#5A8FE3" },
  "love-gifts": { icon: Heart, color: "#E85D75" },
  "mommy-frames": { icon: Crown, color: "#C77DA6" },
};
const FALLBACK_STYLE = { icon: Package, color: "#CCA681" };

// ─── Card — same treatment as the Expertise cards ────────────────────────────

function CategoryCard({
  cat,
  dimmed,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: {
  cat: Category;
  dimmed: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect: (id: string) => void;
}) {
  const { icon: Icon, color } = CATEGORY_STYLE[cat.id] ?? FALLBACK_STYLE;
  const cardRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rotateX = useSpring(
    useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]),
    TILT_SPRING
  );
  const rotateY = useSpring(
    useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]),
    TILT_SPRING
  );
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <motion.button
      type="button"
      ref={cardRef}
      onClick={() => onSelect(cat.id)}
      aria-label={`Shop ${cat.name}`}
      onMouseEnter={() => {
        glowOpacity.set(reduceMotion ? 0 : 1);
        onHoverStart();
      }}
      onMouseLeave={() => {
        normX.set(0.5);
        normY.set(0.5);
        glowOpacity.set(0);
        onHoverEnd();
      }}
      onMouseMove={handleMouseMove}
      animate={{
        scale: dimmed ? 0.96 : 1,
        opacity: dimmed ? 0.5 : 1,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformPerspective: reduceMotion ? undefined : 900,
      }}
      className="group relative flex min-h-[170px] min-w-[132px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-[border-color] duration-300 hover:border-white/20 sm:min-h-[180px] sm:min-w-0 sm:shrink sm:p-5"
    >
      {/* Static accent tint — always visible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, ${color}14, transparent 65%)`,
        }}
      />

      {/* Hover glow layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${color}2e, transparent 65%)`,
        }}
      />

      {/* Shimmer sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[55%] -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[280%]"
      />

      {/* Icon badge */}
      <div
        aria-hidden="true"
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10"
        style={{
          background: `${color}18`,
          boxShadow: `inset 0 0 0 1px ${color}30`,
        }}
      >
        <Icon size={16} strokeWidth={1.9} style={{ color }} />
      </div>

      {/* Title — pinned to the bottom-left of the card */}
      <div className="relative z-10 mt-auto flex flex-col gap-2 text-left">
        <h3
          className="text-base tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {cat.name}
        </h3>
      </div>

      {/* Accent bottom line */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{
          background: `linear-gradient(to right, ${color}80, transparent)`,
        }}
      />
    </motion.button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ShopByCategory({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const tiles = categories.filter((c) => c.id !== "all" && c.active !== false);

  return (
    <section aria-label="Shop by category" className="mt-14 lg:mt-20">
      {/* ── Header ── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-10 bg-[#CCA681]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
              Browse the Collections
            </span>
          </div>
          <h2>
            <span
              className="block text-4xl leading-none tracking-tight text-white sm:text-5xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              Shop by Category
            </span>
          </h2>
        </div>
        <p className="max-w-md text-base leading-relaxed text-gray-400">
          From hotel essentials to wall-worthy keepsakes — pick a
          collection and browse what the studio makes by hand.
        </p>
      </div>

      {/* ── Single-row strip: icon + title only ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-8 flex gap-3 overflow-x-auto pb-2 thin-scroll snap-x snap-mandatory sm:grid sm:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0"
      >
        {tiles.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            dimmed={hoveredId !== null && hoveredId !== cat.id}
            onHoverStart={() => setHoveredId(cat.id)}
            onHoverEnd={() => setHoveredId(null)}
            onSelect={onSelect}
          />
        ))}
      </motion.div>
    </section>
  );
}
