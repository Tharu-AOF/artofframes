"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import reviews from "@/data/reviews.json";

// ============================================================
// REVIEWS — infinite marquee of customer testimonials.
//
// Two rows scrolling in opposite directions (CSS keyframes in
// globals.css), with soft edge fades. Each card shows only the
// customer's photo, name and review text — no stars.
// ============================================================

interface Review {
  name: string;
  photo: string;
  review: string;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="card-shimmer relative flex h-[200px] w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-white/20 sm:w-[400px]">
      {/* Review text on top — clamped so nothing clips at the fixed height */}
      <p className="line-clamp-4 text-sm leading-relaxed text-gray-400">
        {review.review}
      </p>

      {/* Photo + name pinned to the bottom */}
      <div className="mt-auto flex items-center gap-3 pt-4">
        <div
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"
          style={{
            boxShadow: "0 0 0 2px rgba(204,166,129,0.35)",
          }}
        >
          <Image
            src={review.photo}
            alt={review.name}
            fill
            loading="lazy"
            sizes="48px"
            className="object-cover"
          />
        </div>
        <p
          className="text-base tracking-tight text-white"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {review.name}
        </p>
        <Quote
          aria-hidden="true"
          size={20}
          strokeWidth={1.5}
          className="ml-auto text-[#CCA681]/25"
        />
      </div>
    </div>
  );
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: Review[];
  reverse?: boolean;
}) {
  // Each card is wrapped in a uniform "card + gap" unit, and the
  // track is an even number of identical copies. The -50% keyframe
  // shift therefore lands exactly on a copy boundary — a seamless,
  // endless loop at any screen width. Extra copies beyond the
  // first are hidden from screen readers.
  //
  // Duration scales with the number of items so both rows scroll
  // at the same visual speed (14s per half-copy of one item).
  const copies = 4;
  return (
    <div className="marquee-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`marquee-track flex w-max ${
          reverse ? "reverse" : ""
        }`}
        style={
          {
            "--marquee-duration": `${items.length * 14}s`,
          } as React.CSSProperties
        }
      >
        {Array.from({ length: copies * items.length }).map((_, i) => {
          const review = items[i % items.length];
          const copy = Math.floor(i / items.length);
          return (
            <div key={`${review.name}-${i}`} aria-hidden={copy > 0} className="pr-4">
              <ReviewCard review={review} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Reviews = () => {
  const firstRow = reviews.slice(0, 3);
  const secondRow = reviews.slice(3);

  return (
    <section id="reviews" className="relative overflow-hidden bg-[#06060f] py-24 lg:py-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto mb-14 flex max-w-7xl flex-col items-start gap-5 px-6 lg:mb-16 lg:px-8"
      >
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-10 bg-[#CCA681]" />
          <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
            Testimonials
          </span>
        </div>

        <h2>
          <span
            className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
            style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
          >
            Words from
          </span>
          <span
            className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Our Customers
          </span>
        </h2>
      </motion.div>

      {/* Marquee rows — opposite directions */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, delay: 0.15 }}
        className="flex flex-col gap-4"
      >
        <MarqueeRow items={firstRow} />
        <MarqueeRow items={secondRow} reverse />
      </motion.div>
    </section>
  );
};

export default Reviews;
