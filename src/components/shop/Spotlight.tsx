"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import { WHATSAPP_NUMBER } from "@/components/shop/data";

// ============================================================
// SPOTLIGHT — editorial split feature for custom signboards.
// Left: the piece itself, floating over a warm glow ring with a
// "design consultation" chip. Right: the story, checklist and
// actions (WhatsApp order + bulk quote).
// ============================================================

const highlights = [
  "Free design consultation — we refine your artwork with you",
  "Storefronts, weddings, events & corporate signage",
  "Backlit LED upgrade for after-dark presence",
];

const Spotlight = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [140, -180]);
  const imageY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const orderWhatsApp = () => {
    const message =
      "Hello Art of Frames! I'd like a custom signboard — could we discuss the design?";
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* ── Ambient orbs — parallax drift ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 right-1/4 h-[520px] w-[520px] rounded-full bg-[#5A1020]/12 blur-[170px]"
        style={{ y: reduceMotion ? 0 : orbY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-[#E9A23B]/6 blur-[140px]"
        style={{ y: reduceMotion ? 0 : orbY }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* ══ Left — the piece ══ */}
          {/* Parallax on the outer layer, entrance animation on the
              inner layer — kept separate so they don't fight over
              the same transform (matches the codebase pattern). */}
          <motion.div className="relative" style={{ y: reduceMotion ? 0 : imageY }}>
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
            {/* Warm glow ring behind the piece */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E9A23B]/15"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/8"
            />

            <div className="group card-shimmer relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <Image
                src="/images/signboard.webp"
                alt="Custom laser-cut wooden signboard"
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8 drop-shadow-[0_30px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105 sm:p-12"
              />
            </div>

              {/* Floating chip */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="absolute -bottom-5 left-6 flex items-center gap-2.5 rounded-2xl border border-[#CCA681]/25 bg-[#0a0a14]/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur"
              >
                <Sparkles size={16} className="text-[#CCA681]" />
                <p className="text-xs font-semibold uppercase tracking-widest text-white">
                  Free design consultation
                </p>
              </motion.div>
            </motion.div>
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
                The Signature Piece
              </span>
            </div>

            <h2>
              <span
                className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
              >
                Make an entrance
              </span>
              <span
                className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                that lasts
              </span>
            </h2>

            <p className="max-w-md text-base leading-relaxed text-gray-400 lg:text-lg">
              From storefront statements to wedding-day centerpieces, custom
              signboards are where craft meets character — cut to size, lit
              to impress, and made entirely to order.
            </p>

            <ul className="flex flex-col gap-3">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCA681]/15 text-[#CCA681] shadow-[inset_0_0_0_1px_rgba(204,166,129,0.3)]">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-gray-300">{h}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <Button
                variant="light"
                size="lg"
                icon={<MessageCircle size={16} strokeWidth={2.2} />}
                onClick={orderWhatsApp}
              >
                Order on WhatsApp
              </Button>
              <Button variant="outline" size="lg" href="#quote">
                Get a Quote
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Spotlight;
