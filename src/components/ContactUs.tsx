"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  MessageCircle,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/Button";

// ============================================================
// CONTACT US — closing contact section.
//
//   Left  : call / WhatsApp / email rows (clickable).
//   Right : name, email, message form. Without a backend the
//           submit opens the visitor's email app with the
//           message pre-filled to CONTACT_EMAIL.
// ============================================================

const CONTACT_EMAIL = "artofframes@gmail.com";
const CALL_LINK = "tel:0750350109";
// WhatsApp number in international format (digits only).
// 0750 350 109 → +94 (Sri Lanka), confirmed with the client.
const WHATSAPP_LINK = "https://wa.me/94750350109";

interface ContactItem {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
}

const contactItems: ContactItem[] = [
  { icon: Phone, label: "Call Us", value: "0750 350 109", href: CALL_LINK },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "0750 350 109",
    href: WHATSAPP_LINK,
  },
  { icon: Mail, label: "Email", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
];

const emptyForm = { name: "", email: "", subject: "", message: "" };

const ContactUs = () => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Ambient parallax — same depth language as the other sections.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const orbTopY = useTransform(scrollYProgress, [0, 1], [140, -200]);
  const orbBottomY = useTransform(scrollYProgress, [0, 1], [-120, 220]);

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    const subject = form.subject.trim()
      ? `${form.subject.trim()} — contact request from ${form.name.trim()}`
      : `Contact request from ${form.name.trim()}`;
    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      form.subject.trim() ? `Subject: ${form.subject.trim()}` : "",
      "",
      form.message.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
    setForm(emptyForm);
    setError("");
  };

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-[#CCA681] focus:bg-black/40 focus:shadow-[0_0_0_3px_rgba(204,166,129,0.15)]";
  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[#CCA681]";

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32"
    >
      {/* ── Ambient orbs — parallax drift ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/4 h-[480px] w-[480px] rounded-full bg-[#5A1020]/10 blur-[160px]"
        style={{ y: reduceMotion ? 0 : orbTopY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/5 blur-[150px]"
        style={{ y: reduceMotion ? 0 : orbBottomY }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ══ Left — header pinned to top, cards pinned to bottom ══ */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex h-full flex-col"
          >
            {/* Section header — top of the left column */}
            <div className="flex flex-col items-start gap-5">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-10 bg-[#CCA681]" />
                <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                  Get in Touch
                </span>
              </div>

              <h2>
                <span
                  className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                  style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
                >
                  We&rsquo;d love to
                </span>
                <span
                  className="mt-2 block text-4xl leading-none tracking-tight text-white sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  Hear From You
                </span>
              </h2>
            </div>

            {/* Intro + contact cards — pinned to the bottom */}
            <div className="mt-auto flex flex-col gap-4 pt-12">
              <p className="max-w-md text-base leading-relaxed text-gray-400 lg:text-lg">
                Questions about an order, a custom project, or a bulk quote —
                reach us however works best for you. We usually reply within a
                day.
              </p>

              {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group card-shimmer relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-[border-color,background-color] duration-300 hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CCA681]/10 transition-colors duration-300 group-hover:bg-[#CCA681]/20"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(204,166,129,0.25)" }}
                  >
                    <Icon size={19} strokeWidth={1.9} className="text-[#CCA681]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      {item.label}
                    </p>
                    <p
                      className="truncate text-base tracking-tight text-white"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                    >
                      {item.value}
                    </p>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2}
                    className="ml-auto shrink-0 text-gray-500 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#CCA681]"
                  />
                </a>
              );
              })}
            </div>
          </motion.div>

          {/* ══ Right — form ══ */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="card-shimmer relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
          >
            <h3
              className="text-xl tracking-tight text-white sm:text-2xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Send a Message
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Fill in the form and we&rsquo;ll get back to you shortly.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor="contact-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className={labelClass}>
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  placeholder="What is it about?"
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-message" className={labelClass}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Tell us about your project…"
                  value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
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

              {sent && (
                <p
                  role="status"
                  className="rounded-lg border border-[#CCA681]/30 bg-[#CCA681]/10 px-3 py-2 text-xs text-[#CCA681]"
                >
                  Thank you! Your email app has been opened with your message
                  ready to send.
                </p>
              )}

              <div className="mt-1">
                <Button
                  variant="light"
                  size="lg"
                  fullWidth
                  icon={<Send size={16} strokeWidth={2.2} />}
                >
                  Send Message
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
