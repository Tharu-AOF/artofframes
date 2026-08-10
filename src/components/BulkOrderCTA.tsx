"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Send, Sparkles, Truck, X, Zap, type LucideIcon } from "lucide-react";
import Button from "@/components/Button";

// ============================================================
// BULK ORDER CTA — closing call-to-action for wholesale orders.
//
// A framed panel with a rich bordeaux gradient. Clicking
// "Get a Quote" slides an animated quote form into the right
// side of the panel (name, WhatsApp number, item, qty, details).
// Submitting opens WhatsApp with the request pre-filled.
//
// The real contact section (id="contact") lives further down the
// page — the Hero's "Bulk Order" button and navbar's Contact link
// land there.
// ============================================================

// Business WhatsApp number (international format, digits only) —
// swap this placeholder for the real number.
const WHATSAPP_NUMBER = "2340000000000";

const ITEM_OPTIONS = [
  "Keytags",
  "Photo Frames",
  "Signboards",
  "Slide Cards",
  "Wall Art",
  "Other",
];

interface Highlight {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const highlights: Highlight[] = [
  {
    icon: Truck,
    title: "Wholesale Pricing",
    description: "Volume discounts on every order, big or small.",
    color: "#CCA681",
  },
  {
    icon: Zap,
    title: "Fast Turnaround",
    description: "Quick quotes and on-schedule delivery.",
    color: "#E9A23B",
  },
  {
    icon: Sparkles,
    title: "Fully Custom",
    description: "Your logo, your design, your materials.",
    color: "#0E8C7B",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 26, stiffness: 130 },
  },
};

const emptyForm = {
  name: "",
  whatsapp: "",
  item: ITEM_OPTIONS[0],
  qty: "",
  details: "",
};

const BulkOrderCTA = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Ambient parallax — same depth language as the other sections.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [120, -160]);

  // Close the form with Escape.
  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFormOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.whatsapp.trim() || !form.qty.trim()) {
      setError("Please add your name, WhatsApp number and quantity.");
      return;
    }
    const message = [
      "Hello Art of Frames! I'd like a bulk order quote.",
      "",
      `Name: ${form.name.trim()}`,
      `WhatsApp: ${form.whatsapp.trim()}`,
      `Item: ${form.item}`,
      `Quantity: ${form.qty.trim()}`,
      form.details.trim() ? `Details: ${form.details.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setFormOpen(false);
    setForm(emptyForm);
    setError("");
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-[#CCA681] focus:bg-black/40 focus:shadow-[0_0_0_3px_rgba(204,166,129,0.15)] [&>option]:text-black";
  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]";

  return (
    <section
      id="quote"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* ── Ambient orbs — parallax drift ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5A1020]/15 blur-[170px]"
        style={{ y: reduceMotion ? 0 : orbY }}
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-14"
        >
            {/* ══ Left — copy ══ */}
          <motion.div
            layout
            className={`flex flex-col items-center gap-6 text-center ${
              formOpen ? "" : "lg:col-span-2"
            }`}
          >
              <motion.div variants={itemVariants} className="flex items-center gap-3">
                <div className="h-[1px] w-10 bg-[#CCA681]" />
                <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                  For Businesses & Events
                </span>
                <div className="h-[1px] w-10 bg-[#CCA681]" />
              </motion.div>

              <motion.h2 variants={itemVariants}>
                <span
                  className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                  style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
                >
                  Looking for
                </span>
                <span
                  className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Bulk Orders?
                </span>
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="mx-auto max-w-xl text-base leading-relaxed text-gray-300 lg:text-lg"
              >
                Corporate gifts, event branding, and large-scale laser-cut runs —
                enjoy wholesale pricing, fast quotes, and craftsmanship at any
                volume.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="mt-2 flex flex-wrap items-center justify-center gap-4"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {!formOpen && (
                    <motion.div
                      key="quote-btn"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        variant="light"
                        size="lg"
                        onClick={() => setFormOpen(true)}
                      >
                        Get a Quote
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button variant="outline" size="lg" href="/shop">
                  Shop Now
                </Button>
              </motion.div>

              {/* Highlight chips — hidden while the form is open */}
              <AnimatePresence>
                {!formOpen && (
                  <motion.div
                    key="chips"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: 16, transition: { duration: 0.2 } }}
                    className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
                  >
                    {highlights.map((item) => {
                      const Icon = item.icon;
                      return (
                <div
                  key={item.title}
                  className="card-shimmer relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 transition-colors duration-300 hover:border-white/20"
                >
                          <div
                            aria-hidden="true"
                            className="flex h-9 w-9 items-center justify-center rounded-xl"
                            style={{
                              background: `${item.color}18`,
                              boxShadow: `inset 0 0 0 1px ${item.color}30`,
                            }}
                          >
                            <Icon
                              size={16}
                              strokeWidth={1.9}
                              style={{ color: item.color }}
                            />
                          </div>
                          <p
                            className="text-sm tracking-tight text-white"
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 500,
                            }}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs leading-relaxed text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ══ Right — quote form ══ */}
            <AnimatePresence>
              {formOpen && (
                <motion.div
                  key="quote-form"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 64, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : 64, scale: 0.97 }}
                  transition={{
                    type: "spring",
                    damping: 28,
                    stiffness: 220,
                  }}
                  className="card-shimmer relative overflow-hidden rounded-2xl border border-[#CCA681]/30 bg-[#06060f]/70 p-6 backdrop-blur sm:p-8"
                >
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    aria-label="Close quote form"
                    className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>

                  <h3
                    className="text-xl tracking-tight text-white sm:text-2xl"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                  >
                    Request a Quote
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Tell us what you need — we reply fast on WhatsApp.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                    <div>
                      <label htmlFor="quote-name" className={labelClass}>
                        Name
                      </label>
                      <input
                        id="quote-name"
                        type="text"
                        autoFocus
                        placeholder="Your full name"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="quote-whatsapp" className={labelClass}>
                        WhatsApp Number
                      </label>
                      <input
                        id="quote-whatsapp"
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={form.whatsapp}
                        onChange={(e) => setField("whatsapp", e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="quote-item" className={labelClass}>
                          Item
                        </label>
                        <select
                          id="quote-item"
                          value={form.item}
                          onChange={(e) => setField("item", e.target.value)}
                          className={inputClass}
                        >
                          {ITEM_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="quote-qty" className={labelClass}>
                          Quantity
                        </label>
                        <input
                          id="quote-qty"
                          type="number"
                          min={1}
                          placeholder="e.g. 100"
                          value={form.qty}
                          onChange={(e) => setField("qty", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="quote-details" className={labelClass}>
                        Details{" "}
                        <span className="normal-case text-gray-500">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="quote-details"
                        rows={3}
                        placeholder="Size, material, engraving text…"
                        value={form.details}
                        onChange={(e) => setField("details", e.target.value)}
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                      >
                        {error}
                      </p>
                    )}

                    <div className="mt-1">
                      <Button
                        variant="light"
                        size="lg"
                        fullWidth
                        icon={<Send size={16} strokeWidth={2.2} />}
                      >
                        Send Quote Request
                      </Button>
                    </div>

                    <p className="text-center text-[11px] text-gray-500">
                      Submitting opens WhatsApp with your request pre-filled.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
      </div>
    </section>
  );
};

export default BulkOrderCTA;
