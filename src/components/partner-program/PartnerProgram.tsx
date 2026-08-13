"use client";

// ============================================================
// PARTNER PROGRAM — bilingual page with a page-local language
// toggle.
//
// Language state lives entirely inside this component (a plain
// `useState` seeded with "si"), so switching only affects THIS
// page — every other page keeps its own language behavior. The
// default on every visit is Sinhala.
//
// Copy is read from @/data/partner-program. Fonts follow the
// global system: headings use Montserrat (--font-display) and
// body inherits Lato (--font-sans); the Sinhala font is loaded
// with the Sinhala subset ONLY, so when the page is in Sinhala
// mode the stack "var(--font-sinhala), var(--font-display/sans)"
// renders Sinhala glyphs in Noto Sans Sinhala while every Latin
// word falls through to the global fonts — Noto Sans is never
// used for English text.
//
// Visual treatment is the site's card language (the Shop by
// Category / Expertise cards): card-shimmer sweep, brand-tinted
// radial glow, a tinted icon badge, an accent bottom line and
// sibling cards dimming on hover.
// ============================================================

import React, { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Coins,
  Languages,
  Megaphone,
  MessageCircle,
  Package,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/Button";
import {
  partnerProgramContent,
  type ComparisonModel,
  type Lang,
  type PartnerModel,
} from "@/data/partner-program";

// Business WhatsApp number — same channel used across the site
// (Footer, ContactUs, Cart). Opens the conversation pre-filled.
const WHATSAPP_NUMBER = "94750350109";

// Partner model → icon mapping (lucide, no emoji — site rule).
const MODEL_ICONS: Record<string, LucideIcon> = {
  sales: Megaphone,
  reseller: Package,
};

// Tinted icon badge — identical treatment to the Shop by
// Category cards (colored bg + inset ring).
function IconBadge({
  icon: Icon,
  color,
  size = "md",
}: {
  icon: LucideIcon;
  color: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-2xl ${
        size === "lg" ? "h-14 w-14" : "h-11 w-11"
      }`}
      style={{
        background: `${color}18`,
        boxShadow: `inset 0 0 0 1px ${color}30`,
      }}
    >
      <Icon
        size={size === "lg" ? 24 : 20}
        strokeWidth={1.9}
        style={{ color }}
      />
    </div>
  );
}

// Eyebrow + two-line title — the site's section-header lockup.
// The script (accent) line is Great Vibes in English; in
// Sinhala it falls back to the heading stack (Great Vibes has
// no Sinhala glyphs) and stays distinguished by the gradient.
function SectionTitle({
  eyebrow,
  accent,
  title,
  center = false,
  headStack,
  accentStack,
  uiStack,
  accentWeight = 400,
}: {
  eyebrow: string;
  accent: string;
  title: string;
  center?: boolean;
  headStack: string;
  accentStack: string;
  uiStack: string;
  accentWeight?: number;
}) {
  return (
    <div
      className={`flex flex-col ${center ? "items-center text-center" : "items-start"}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-[1px] w-10 bg-[#CCA681]" />
        <span
          className="text-xs font-medium uppercase tracking-widest text-[#CCA681]"
          style={{ fontFamily: uiStack }}
        >
          {eyebrow}
        </span>
        {center && <div className="h-[1px] w-10 bg-[#CCA681]" />}
      </div>
      <h2 className="mt-4">
        <span
          className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
          style={{ fontFamily: accentStack, fontWeight: accentWeight }}
        >
          {accent}
        </span>
        <span
          className="mt-1 block text-4xl leading-none tracking-tight text-white sm:text-5xl"
          style={{ fontFamily: headStack, fontWeight: 500 }}
        >
          {title}
        </span>
      </h2>
    </div>
  );
}

const PartnerProgram = () => {
  const [lang, setLang] = useState<Lang>("si");
  const isSi = lang === "si";
  const content = partnerProgramContent[lang];
  // Sibling-dim on hover — same focus treatment as the
  // Shop by Category / Expertise cards.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Font stacks. In Sinhala mode the Sinhala font sits first so
  // its glyphs render — Latin words fall through to the global
  // fonts (Montserrat for headings, Lato for body). In English
  // mode the global fonts are used directly and accent script
  // lines switch to Great Vibes.
  const headStack = isSi
    ? "var(--font-sinhala), var(--font-display)"
    : "var(--font-display)";
  const bodyStack = isSi ? "var(--font-sinhala), var(--font-sans)" : undefined;
  const accentStack = isSi
    ? "var(--font-sinhala), var(--font-display)"
    : "var(--font-accent)";
  const uiStack = "var(--font-sinhala), var(--font-sans)";

  const toggleLang = () => setLang((l) => (l === "si" ? "en" : "si"));

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    content.cta.whatsappMessage
  )}`;

  return (
    <main className="min-h-screen bg-[#030712]">
      {/* ────────────────────────── HERO ────────────────────────── */}
      <section className="relative overflow-clip bg-[#06060f] pb-24 pt-28 lg:pb-32 lg:pt-36">
        {/* Ambient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/12 blur-[160px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/6 blur-[150px]"
        />
        {/* Dot grid */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.22]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* Header row — eyebrow + language toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-10 bg-[#CCA681]" />
              <span
                className="text-xs font-medium uppercase tracking-widest text-[#CCA681]"
                style={{ fontFamily: uiStack }}
              >
                {content.hero.eyebrow}
              </span>
            </div>

            {/* Page-local language switch — Sinhala (default) ⇄ English */}
            <button
              type="button"
              onClick={toggleLang}
              aria-pressed={lang === "en"}
              aria-label={isSi ? "Switch to English" : "සිංහලට මාරු වෙන්න"}
              className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#CCA681]/40 bg-[#CCA681]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#CCA681] transition-all duration-300 hover:border-[#CCA681] hover:bg-[#CCA681]/20"
            >
              <Languages size={14} className="transition-transform duration-300 group-hover:rotate-12" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={lang}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  style={{ fontFamily: uiStack }}
                >
                  {isSi ? "English" : "සිංහල"}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Hero copy — crossfades when the language changes */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lang}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-12 max-w-3xl"
            >
              <h1>
                <span
                  className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                  style={{ fontFamily: accentStack, fontWeight: isSi ? 500 : 400 }}
                >
                  {content.hero.titleAccent}
                </span>
                <span
                  className="mt-2 block text-4xl leading-none tracking-tight text-white sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: headStack, fontWeight: 500 }}
                >
                  {content.hero.title}
                </span>
              </h1>
              <p
                className="mt-6 max-w-2xl text-base leading-relaxed text-gray-400 lg:text-lg"
                style={{ fontFamily: bodyStack }}
              >
                {content.hero.intro}
              </p>
              <p
                className="mt-6 text-sm uppercase tracking-[0.2em] text-gray-500"
                style={{ fontFamily: bodyStack }}
              >
                {content.hero.choose}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─────────────────── PARTNER MODEL CARDS ─────────────────── */}
      <section className="py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={lang}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8"
              >
                {content.models.map((m: PartnerModel) => {
                  const Icon = MODEL_ICONS[m.id] ?? Package;
                  const dimmed = hoveredId !== null && hoveredId !== m.id;
                  return (
                    <motion.article
                      key={m.id}
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      animate={{
                        scale: dimmed ? 0.97 : 1,
                        opacity: dimmed ? 0.55 : 1,
                      }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="card-shimmer group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-[border-color] duration-300 hover:border-white/20"
                    >
                      {/* Static accent tint */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-2xl"
                        style={{
                          background: `radial-gradient(ellipse at 20% 20%, ${m.accent}14, transparent 65%)`,
                        }}
                      />

                      {/* Hover glow layer */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(ellipse at 20% 20%, ${m.accent}2e, transparent 65%)`,
                        }}
                      />

                      {/* Header — icon badge + number */}
                      <div className="relative z-10 flex items-start justify-between">
                        <IconBadge icon={Icon} color={m.accent} size="lg" />
                        <span
                          className="text-5xl font-bold leading-none text-white/10"
                          style={{ fontFamily: headStack }}
                          aria-hidden="true"
                        >
                          {m.number}
                        </span>
                      </div>

                      <h2
                        className="relative z-10 mt-6 text-2xl tracking-tight text-white"
                        style={{ fontFamily: headStack, fontWeight: 600 }}
                      >
                        {m.name}
                      </h2>
                      <p
                        className="relative z-10 mt-1 text-sm font-semibold tracking-wide"
                        style={{ fontFamily: bodyStack, color: m.accent }}
                      >
                        {m.tagline}
                      </p>

                      <p
                        className="relative z-10 mt-4 text-sm leading-relaxed text-gray-400"
                        style={{ fontFamily: bodyStack }}
                      >
                        {m.body}
                      </p>

                      {m.note && (
                        <p
                          className="relative z-10 mt-5 rounded-xl px-4 py-3 text-sm leading-relaxed"
                          style={{
                            fontFamily: bodyStack,
                            background: `${m.accent}12`,
                            boxShadow: `inset 0 0 0 1px ${m.accent}30`,
                            color: m.accent,
                          }}
                        >
                          {m.note}
                        </p>
                      )}

                      {m.earn && (
                        <p
                          className="relative z-10 mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-white"
                          style={{ fontFamily: bodyStack }}
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                            style={{ background: `${m.accent}18` }}
                          >
                            <Coins size={13} strokeWidth={2.2} style={{ color: m.accent }} />
                          </span>
                          <span className="font-semibold">{m.earn}</span>
                        </p>
                      )}

                      {/* What you get */}
                      <div className="relative z-10 mt-6 flex flex-1 flex-col border-t border-white/10 pt-6">
                        <h3
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ fontFamily: uiStack, color: m.accent }}
                        >
                          {m.benefitsTitle}
                        </h3>
                        <ul className="mt-4 flex flex-col gap-2.5">
                          {m.benefits.map((b) => (
                            <li
                              key={b}
                              className="flex items-start gap-2.5 text-sm text-gray-300"
                              style={{ fontFamily: bodyStack }}
                            >
                              <span
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                style={{ background: `${m.accent}18` }}
                              >
                                <Check size={12} strokeWidth={3} style={{ color: m.accent }} />
                              </span>
                              {b}
                            </li>
                          ))}
                        </ul>

                        {/* Investment */}
                        <div className="mt-6 flex flex-wrap items-baseline gap-x-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <span
                            className="text-xs font-semibold uppercase tracking-widest"
                            style={{ fontFamily: uiStack, color: m.accent }}
                          >
                            {m.investmentLabel}:
                          </span>
                          <span
                            className="text-sm font-semibold text-white"
                            style={{ fontFamily: bodyStack }}
                          >
                            {m.investment}
                          </span>
                        </div>

                        {/* Who is this for */}
                        <h3
                          className="mt-6 text-xs font-semibold uppercase tracking-widest text-gray-500"
                          style={{ fontFamily: uiStack }}
                        >
                          {m.whoForTitle}
                        </h3>
                        <p
                          className="mt-2 text-sm leading-relaxed text-gray-400"
                          style={{ fontFamily: bodyStack }}
                        >
                          {m.whoFor}
                        </p>
                      </div>

                      {/* Accent bottom line */}
                      <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
                        style={{
                          background: `linear-gradient(to right, ${m.accent}80, transparent)`,
                        }}
                      />
                    </motion.article>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────── WHICH MODEL IS RIGHT FOR YOU ─────────────────── */}
      <section className="relative overflow-clip bg-[#06060f] py-24 lg:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#5A1020]/10 blur-[160px]"
        />
        <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <SectionTitle
              center
              eyebrow={content.compareEyebrow}
              accent={content.compareTitleAccent}
              title={content.compareTitle}
              headStack={headStack}
              accentStack={accentStack}
              uiStack={uiStack}
              accentWeight={isSi ? 500 : 400}
            />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lang}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {content.compare.map((c: ComparisonModel) => {
                const Icon = MODEL_ICONS[c.id] ?? Package;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="card-shimmer group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors duration-300 hover:border-white/20"
                  >
                    {/* Static accent tint */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background: `radial-gradient(ellipse at 20% 20%, ${c.accent}14, transparent 65%)`,
                      }}
                    />

                    <div className="relative z-10 flex items-center gap-4">
                      <IconBadge icon={Icon} color={c.accent} />
                      <div>
                        <h3
                          className="text-lg tracking-tight text-white"
                          style={{ fontFamily: headStack, fontWeight: 600 }}
                        >
                          {c.name}
                        </h3>
                        <p
                          className="mt-0.5 text-sm leading-relaxed"
                          style={{ fontFamily: bodyStack, color: c.accent }}
                        >
                          {c.headline}
                        </p>
                      </div>
                    </div>

                    {/* Step chain */}
                    <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2">
                      {c.steps.map((s, i) => (
                        <Fragment key={s}>
                          {i > 0 && (
                            <ArrowRight
                              size={14}
                              strokeWidth={2}
                              className="shrink-0 text-gray-500"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-gray-200"
                            style={{ fontFamily: bodyStack }}
                          >
                            {s}
                          </span>
                        </Fragment>
                      ))}
                    </div>

                    {/* Accent bottom line */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
                      style={{
                        background: `linear-gradient(to right, ${c.accent}80, transparent)`,
                      }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ───────────────────── CTA — BECOME A PARTNER ───────────────────── */}
      <section className="relative overflow-hidden bg-[#030712] pb-28 pt-24 lg:pb-32 lg:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5A1020]/18 blur-[170px]"
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lang}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <h2>
                <span
                  className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                  style={{ fontFamily: accentStack, fontWeight: isSi ? 500 : 400 }}
                >
                  {content.cta.titleAccent}
                </span>
                <span
                  className="mt-2 block text-4xl leading-none tracking-tight text-white sm:text-5xl"
                  style={{ fontFamily: headStack, fontWeight: 500 }}
                >
                  {content.cta.title}
                </span>
              </h2>
              <p
                className="max-w-xl text-base leading-relaxed text-gray-300 lg:text-lg"
                style={{ fontFamily: bodyStack }}
              >
                {content.cta.text}
              </p>
              <p
                className="text-lg font-semibold tracking-wide text-white lg:text-xl"
                style={{ fontFamily: bodyStack }}
              >
                {content.cta.line}
              </p>

              <Button
                variant="light"
                size="lg"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                icon={<MessageCircle size={16} strokeWidth={2.2} />}
                iconPosition="left"
              >
                {content.cta.button}
              </Button>

              <p className="text-xs tracking-wide text-gray-500" style={{ fontFamily: bodyStack }}>
                {content.cta.terms}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
};

export default PartnerProgram;
