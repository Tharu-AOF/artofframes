import React from "react";
import { Sparkles } from "lucide-react";

// ============================================================
// MATERIALS MARQUEE — an infinite strip of the materials and
// finishes used in the studio. Reuses the global marquee CSS
// (.marquee-row / .marquee-track) from globals.css.
// ============================================================

const materials = [
  "Walnut Wood",
  "Bamboo",
  "MDF",
  "Acrylic",
  "Plywood",
  "Acrylic Glass",
  "LED Neon",
  "Oak Edging",
];

const MaterialsMarquee = () => {
  return (
    <section
      aria-label="Materials and finishes"
      className="relative border-y border-white/5 bg-[#06060f] py-9"
    >
      <div className="marquee-row overflow-hidden">
        <div
          className="marquee-track flex w-max items-center"
          style={{ "--marquee-duration": "40s" } as React.CSSProperties}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? "true" : undefined}
              className="flex items-center"
            >
              {materials.map((m) => (
                <span
                  key={m}
                  className="flex items-center whitespace-nowrap"
                >
                  <span className="px-7 text-sm font-semibold uppercase tracking-[0.22em] text-white/50 transition-colors duration-300 hover:text-[#CCA681]">
                    {m}
                  </span>
                  <Sparkles
                    size={13}
                    className="shrink-0 text-[#CCA681]/40"
                    aria-hidden="true"
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">
        Materials used: {materials.join(", ")}.
      </p>
    </section>
  );
};

export default MaterialsMarquee;
