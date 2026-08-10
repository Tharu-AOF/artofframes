"use client";

import React, { useState } from "react";
import { Minus, MessageCircle, Plus, Ruler } from "lucide-react";
import Button from "@/components/Button";
import { WHATSAPP_NUMBER } from "@/components/shop/data";
import {
  DEFAULT_SIGNBOARD_SETTINGS,
  type SignboardSettings,
} from "@/lib/settings";

// ============================================================
// SIGNBOARD CALCULATOR — estimate for custom sign boards.
//   material cost = sq ft × material rate      (first layer only)
//   layer fee     = extra layers × sq ft × material.layerPrice
//                   (layers beyond the 1st, same area as the board)
//   estimate      = material cost + layer fee, rounded to roundTo,
//                   never below minCharge.            (if set)
// 1 ft = 12 in = 30.48 cm. Approximate — the final quote is
// confirmed on WhatsApp. All pricing comes from the admin panel
// (Admin → Sign Boards), falling back to sane defaults.
// ============================================================

/** Round the estimate to a clean figure (nearest 50). */
const CM_PER_FT = 30.48;
const MAX_LAYERS = 10;

type Unit = "ft" | "in" | "cm";

const UNITS: { value: Unit; label: string; long: string }[] = [
  { value: "ft", label: "ft", long: "feet" },
  { value: "in", label: "in", long: "inches" },
  { value: "cm", label: "cm", long: "cm" },
];

const rs = (n: number) => "Rs. " + n.toLocaleString("en-US");

const toSqft = (w: number, h: number, unit: Unit): number => {
  if (unit === "ft") return w * h;
  if (unit === "in") return (w / 12) * (h / 12);
  return (w / CM_PER_FT) * (h / CM_PER_FT);
};

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]";

export default function SignboardCalculator({
  settings = DEFAULT_SIGNBOARD_SETTINGS,
}: {
  /** Pricing from the admin Sign Boards settings. */
  settings?: SignboardSettings;
}) {
  const [unit, setUnit] = useState<Unit>("ft");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [layers, setLayers] = useState(1);
  const [materialId, setMaterialId] = useState(
    settings.materials[0]?.id ?? "standard"
  );

  const material =
    settings.materials.find((m) => m.id === materialId) ??
    settings.materials[0] ??
    DEFAULT_SIGNBOARD_SETTINGS.materials[0];
  const rate = material?.ratePerSqft ?? 1500;

  const w = parseFloat(width);
  const h = parseFloat(height);
  const valid = Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0;

  const sqft = valid ? toSqft(w, h, unit) : 0;
  const raw = valid
    ? sqft * rate +
      Math.max(0, layers - 1) * sqft * (material?.layerPrice ?? 0)
    : 0;
  const rounded = valid
    ? settings.roundTo > 1
      ? Math.round(raw / settings.roundTo) * settings.roundTo
      : Math.round(raw)
    : 0;
  const estimate = valid ? Math.max(rounded, settings.minCharge) : 0;

  const unitLong = UNITS.find((u) => u.value === unit)?.long ?? unit;
  const materialName = material?.name ?? "Standard";

  const waMessage = valid
    ? [
        "Hello Art of Frames! I'd like a quote for a custom sign board:",
        "",
        `Size: ${width} ${unitLong} × ${height} ${unitLong} (${sqft.toFixed(2)} sq ft)`,
        `Material: ${materialName}`,
        `Layers: ${layers}`,
        `Estimated price: ≈ ${rs(estimate)}`,
        "",
        "Please confirm the final quote.",
      ].join("\n")
    : "";
  const waHref = valid
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`
    : "";

  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        {/* ── Inputs ── */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCA681]/10 shadow-[inset_0_0_0_1px_rgba(204,166,129,0.3)]">
              <Ruler size={18} strokeWidth={1.9} className="text-[#CCA681]" />
            </span>
            <div>
              <h3
                className="text-lg text-white"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Board dimensions
              </h3>
              <p className="text-xs text-gray-500">
                Width and height of the signboard face.
              </p>
            </div>
          </div>

          {/* Unit selector */}
          <div className="mt-5 flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] p-1">
            {UNITS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUnit(u.value)}
                aria-pressed={unit === u.value}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                  unit === u.value
                    ? "bg-[#CCA681] text-[#5A1020]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* Material selector */}
          <div className="mt-5">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Material
            </span>
            <div className="flex flex-wrap gap-2">
              {settings.materials.map((m) => {
                const selected = m.id === material?.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMaterialId(m.id)}
                    aria-pressed={selected}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      selected
                        ? "border-[#CCA681] bg-[#CCA681]/15 text-[#CCA681]"
                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/25 hover:text-white"
                    }`}
                  >                      {m.name}
                    </button>
                );
              })}
            </div>
          </div>

          {/* Width / Height */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Width ({unitLong})
              </span>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder={`e.g. ${unit === "ft" ? "2" : unit === "in" ? "24" : "60"}`}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Height ({unitLong})
              </span>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={`e.g. ${unit === "ft" ? "3" : unit === "in" ? "36" : "90"}`}
                className={inputClass}
              />
            </label>
          </div>

          {/* Layers */}
          <div className="mt-6">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Number of layers
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full border border-white/15 bg-white/5">
                <button
                  type="button"
                  aria-label="Decrease layers"
                  onClick={() => setLayers((l) => Math.max(1, l - 1))}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                >
                  <Minus size={15} strokeWidth={2.2} />
                </button>
                <span
                  aria-live="polite"
                  className="w-8 text-center text-base font-semibold text-white"
                >
                  {layers}
                </span>
                <button
                  type="button"
                  aria-label="Increase layers"
                  onClick={() => setLayers((l) => Math.min(MAX_LAYERS, l + 1))}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center text-gray-300 transition-colors hover:text-[#CCA681]"
                >
                  <Plus size={15} strokeWidth={2.2} />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                Layers of stacked material add depth — a flat board is 1
                layer, a 3D sign with raised lettering is usually 2–3.
              </p>
            </div>
          </div>
        </div>

        {/* ── Estimate ── */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-black/20 p-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Estimated price
          </span>
          <p
            className="mt-2 bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-4xl leading-none text-transparent sm:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {valid ? `≈ ${rs(estimate)}` : "—"}
          </p>

          {valid ? (
            <dl className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex items-center justify-between text-gray-400">
                <dt>Material</dt>
                <dd className="font-semibold text-white">{materialName}</dd>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <dt>Area</dt>
                <dd className="font-semibold text-white">
                  {sqft.toFixed(2)} sq ft
                </dd>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <dt>Layers</dt>
                <dd className="font-semibold text-white">× {layers}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Enter the width and height to see an estimate.
            </p>
          )}

          <div className="mt-auto pt-6">
            <Button
              variant="light"
              size="lg"
              fullWidth
              target="_blank"
              rel="noopener noreferrer"
              href={valid ? waHref : undefined}
              disabled={!valid}
              icon={<MessageCircle size={15} strokeWidth={2.2} />}
            >
              Order on WhatsApp
            </Button>
            <p className="mt-4 text-[11px] leading-relaxed text-gray-600">
              This is an approximate estimate. We&apos;ll confirm the exact
              quote on WhatsApp — materials, finishing and artwork included.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
