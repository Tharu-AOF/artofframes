"use client";

import React, { useEffect, useState } from "react";
import { Check, Save, Truck } from "lucide-react";
import {
  AButton,
  AInput,
  ACard,
  PageHeader,
} from "@/components/admin/ui";
import { getSettings, saveSettings } from "@/lib/admin-db";
import type { ShopSettings } from "@/lib/settings";

// ============================================================
// GENERAL — store-wide settings (delivery charge). Saved to the
// `settings` table and read by the cart page on the shop.
// ============================================================

const rs = (n: number) => "Rs. " + n.toLocaleString("en-US");

export default function AdminGeneral() {
  const [charge, setCharge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const s: ShopSettings = await getSettings();
        if (!active) return;
        setCharge(s.deliveryCharge === 0 ? "" : String(s.deliveryCharge));
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

  const parsed = (() => {
    const trimmed = charge.trim();
    if (trimmed === "") return 0;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  })();

  const save = async () => {
    if (parsed === null) return;
    setSaving(true);
    setError(null);
    try {
      await saveSettings({ deliveryCharge: parsed });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="General"
        subtitle="Store-wide settings — applied across the shop."
      />

      <ACard className="mt-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCA681]/10 shadow-[inset_0_0_0_1px_rgba(204,166,129,0.3)]">
            <Truck size={18} strokeWidth={1.9} style={{ color: "#CCA681" }} />
          </span>
          <div>
            <h2
              className="text-sm text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Delivery charge
            </h2>
            <p className="text-xs text-gray-500">
              Flat per-order fee shown in the cart summary.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xs">
          <AInput
            label="Delivery charge (Rs.)"
            type="number"
            value={charge}
            onChange={(v) => {
              setCharge(v);
              setSavedAt(null);
            }}
            placeholder="0"
            hint={
              "Leave at 0 to show \u201cCalculate at checkout\u201d on the cart. Otherwise the total includes this amount."
            }
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <AButton
            variant="gold"
            onClick={() => void save()}
            disabled={saving || parsed === null}
          >
            <Save size={13} strokeWidth={2} />
            {saving ? "Saving…" : "Save"}
          </AButton>

          {savedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Check size={13} />
              Saved
            </span>
          )}

          {!saving && parsed !== null && (
            <span className="text-xs text-gray-500">
              Cart will show{" "}
              <span className="font-semibold text-gray-300">
                {parsed === 0
                  ? "\u201cCalculate at checkout\u201d for delivery"
                  : `${rs(parsed)} delivery`}
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
