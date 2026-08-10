"use client";

import React, { useEffect, useState } from "react";
import { Check, Plus, Ruler, Save, Trash2 } from "lucide-react";
import {
  AButton,
  AInput,
  ACard,
  PageHeader,
} from "@/components/admin/ui";
import {
  getSignboardSettings,
  newId,
  saveSignboardSettings,
} from "@/lib/admin-db";
import type { SignboardSettings } from "@/lib/settings";

// ============================================================
// SIGN BOARDS — pricing used by the sign board price calculator
// on /services/sign-boards: per-material rates and layer fees,
// a minimum charge and rounding. Stored in the `settings` table
// and read server-side by the calculator page.
// ============================================================

interface MaterialDraft {
  id: string;
  name: string;
  rate: string;
  layerPrice: string;
}

const toDrafts = (s: SignboardSettings): MaterialDraft[] =>
  s.materials.map((m) => ({
    id: m.id,
    name: m.name,
    rate: String(m.ratePerSqft),
    layerPrice: String(m.layerPrice),
  }));

export default function AdminSignBoards() {
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [minCharge, setMinCharge] = useState("");
  const [roundTo, setRoundTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const s = await getSignboardSettings();
        if (!active) return;
        setMaterials(toDrafts(s));
        setMinCharge(String(s.minCharge));
        setRoundTo(String(s.roundTo));
        setSaved(false);
        setError(null);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Parse a non-negative whole number; null when invalid.
  const num = (v: string) => {
    const n = Number(v.trim());
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  const parsedMaterials = materials.map((m) => ({
    ...m,
    rateNum: num(m.rate),
  }));

  const valid =
    parsedMaterials.length > 0 &&
    parsedMaterials.every(
      (m) =>
        m.name.trim() !== "" &&
        m.rateNum !== null &&
        m.rateNum > 0 &&
        num(m.layerPrice) !== null
    ) &&
    num(minCharge) !== null &&
    num(roundTo) !== null &&
    (roundTo.trim() === "" || (num(roundTo) ?? 0) >= 1);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await saveSignboardSettings({
        materials: parsedMaterials.map((m) => ({
          id: m.id,
          name: m.name.trim(),
          ratePerSqft: m.rateNum ?? 0,
          layerPrice: num(m.layerPrice) ?? 0,
        })),
        minCharge: num(minCharge) ?? 0,
        roundTo: (num(roundTo) ?? 1) >= 1 ? (num(roundTo) ?? 1) : 1,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateMaterial = (
    id: string,
    patch: Partial<Pick<MaterialDraft, "name" | "rate" | "layerPrice">>
  ) => {
    setMaterials((list) =>
      list.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Sign Boards"
        subtitle="Pricing used by the sign board price calculator on the shop."
      />

      <ACard className="mt-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCA681]/10 shadow-[inset_0_0_0_1px_rgba(204,166,129,0.3)]">
            <Ruler size={18} strokeWidth={1.9} style={{ color: "#CCA681" }} />
          </span>
          <div>
            <h2
              className="text-sm text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Pricing
            </h2>
            <p className="text-xs text-gray-500">
              Estimate = sq ft × material rate + extra layers × sq ft × layer
              fee, rounded, never below the minimum charge.
            </p>
          </div>
        </div>

        {/* ── Materials ── */}
        <div className="mt-6">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Materials, rates &amp; layer fees
          </span>
          <div className="flex flex-col gap-2.5">
            {parsedMaterials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <input
                  value={m.name}
                  onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
                  placeholder="Material name"
                  aria-label="Material name"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
                />
                <div className="flex w-36 shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={m.rate}
                    onChange={(e) =>
                      updateMaterial(m.id, { rate: e.target.value })
                    }
                    placeholder="1500"
                    aria-label={`${m.name || "Material"} rate per sq ft`}
                    className="h-10 w-full rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
                  />
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Rs/sq ft
                  </span>
                </div>
                <div className="flex w-36 shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={m.layerPrice}
                    onChange={(e) =>
                      updateMaterial(m.id, { layerPrice: e.target.value })
                    }
                    placeholder="0"
                    aria-label={`${m.name || "Material"} layer price`}
                    className="h-10 w-full rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
                  />
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Rs/sq ft/layer
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${m.name || "material"}`}
                  onClick={() =>
                    setMaterials((list) => list.filter((x) => x.id !== m.id))
                  }
                  disabled={materials.length <= 1}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-all duration-200 hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Layer fee is per sq ft of the board, charged for extra layers
            only — the first layer is always free (0 = no layer fee).
          </p>
          <AButton
            variant="outline"
            className="mt-3"
            onClick={() =>
              setMaterials((list) => [
                ...list,
                { id: newId(), name: "", rate: "", layerPrice: "" },
              ])
            }
          >
            <Plus size={13} strokeWidth={2} />
            Add material
          </AButton>
        </div>

        {/* ── Other pricing fields ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AInput
            label="Minimum charge (Rs.)"
            type="number"
            value={minCharge}
            onChange={(v) => {
              setMinCharge(v);
              setSaved(false);
            }}
            placeholder="0"
            hint="Lowest possible estimate. 0 = none."
          />
          <AInput
            label="Round to nearest (Rs.)"
            type="number"
            value={roundTo}
            onChange={(v) => {
              setRoundTo(v);
              setSaved(false);
            }}
            placeholder="50"
            hint="1 = no rounding."
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <AButton variant="gold" onClick={() => void save()} disabled={saving || !valid}>
            <Save size={13} strokeWidth={2} />
            {saving ? "Saving…" : "Save"}
          </AButton>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check size={13} />
              Saved
            </span>
          )}

          {!saving && valid && parsedMaterials[0] && (
            <span className="text-xs text-gray-500">
              First material:{" "}
              <span className="font-semibold text-gray-300">
                {parsedMaterials[0].name || "Unnamed"} · Rs.{" "}
                {parsedMaterials[0].rateNum?.toLocaleString("en-US")}/sq ft
              </span>
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {error}
          </p>
        )}
      </ACard>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">Loading settings…</p>
      )}
    </div>
  );
}
