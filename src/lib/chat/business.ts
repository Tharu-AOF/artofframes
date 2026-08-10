// ============================================================
// CHAT BUSINESS — store-wide facts the bot may quote verbatim,
// read from the `settings` table (via the cached shop layer) and
// the shop's shared constants. OpenRouter never invents these.
// ============================================================

import { getShopSettings, getShopSignboardSettings } from "@/lib/shop-db";
import { WHATSAPP_NUMBER } from "@/components/shop/data";
import type { BusinessInfo } from "@/lib/chat/types";

export async function getBusinessInfo(): Promise<BusinessInfo> {
  const [settings, signboard] = await Promise.all([
    getShopSettings(),
    getShopSignboardSettings(),
  ]);

  return {
    deliveryCharge: settings.deliveryCharge,
    whatsapp: WHATSAPP_NUMBER,
    signboard: {
      materials: signboard.materials.map((m) => ({
        name: m.name,
        ratePerSqft: m.ratePerSqft,
        layerPrice: m.layerPrice,
      })),
      minCharge: signboard.minCharge,
      roundTo: signboard.roundTo,
    },
  };
}

/** Compact fact block handed to OpenRouter along with the retrieved data. */
export function businessToContext(b: BusinessInfo): string {
  const lines: string[] = [
    "BUSINESS FACTS (quote these exactly):",
    `- Delivery: ${
      b.deliveryCharge === 0
        ? "free"
        : `Rs. ${b.deliveryCharge.toLocaleString("en-US")} per order`
    }.`,
    `- Orders are placed via WhatsApp (${b.whatsapp}) and delivered by Royal Express.`,
    `- All products are MADE TO ORDER — the site lists a base price per design but NO per-size prices. Sizes are custom; there is no fixed 12x18 price or any other size price.`,
    `- For a specific size or a custom quote, customers can message WhatsApp (${b.whatsapp}) or use the "Talk to a person" form — the team confirms the exact quote.`,
  ];
  if (b.signboard?.materials.length) {
    lines.push(
      `- Sign boards: ${b.signboard.materials
        .map(
          (m) =>
            `${m.name} Rs. ${m.ratePerSqft.toLocaleString("en-US")}/sq ft` +
            (m.layerPrice > 0
              ? ` + Rs. ${m.layerPrice.toLocaleString("en-US")}/layer`
              : "")
        )
        .join("; ")}` +
        (b.signboard.minCharge > 0
          ? `; minimum Rs. ${b.signboard.minCharge.toLocaleString("en-US")}`
          : "") +
        ". The on-site calculator at /services/sign-boards gives exact quotes."
    );
  }
  return lines.join("\n");
}
