// ============================================================
// CHAT TRACKING — live order status for a Royal Express waybill.
// Calls the same upstream the /api/track proxy uses, server-side,
// and normalizes the response so OpenRouter summarizes facts it was
// given — it never invents an order status.
// ============================================================

import type { TrackingHit } from "@/lib/chat/types";

const API_URL =
  process.env.ROYAL_EXPRESS_API_URL ?? "https://v1.api.curfox.com";
const TENANT = process.env.ROYAL_EXPRESS_TENANT ?? "royalexpress";

interface CurfoxEvent {
  status: { name?: string; color?: string };
  date_time: string;
  date_time_ago?: string;
  [key: string]: unknown;
}

interface CurfoxOrder {
  waybill_number?: string;
  weight?: number;
  cod?: number;
  customer_name?: string;
  merchant?: string;
}

export function extractWaybill(text: string): string | null {
  const m = text.toUpperCase().match(/\b[A-Z]{2}\d{5,}\b/);
  return m ? m[0] : null;
}

/** True when the message looks like an order-tracking request. */
export function isTrackingIntent(text: string): boolean {
  return (
    /\b(track|waybill|parcel|shipment)\b/i.test(text) ||
    /ට්රැක්|ලැබුණ|ආවද|ගියාද|පාර්සල|ෂිප්මන්ට්/i.test(text) ||
    /\b(my order|order status|order එක|order එකෙ)\b/i.test(text) ||
    /මගේ order|order එක කොහෙද|order එක track/i.test(text)
  );
}

/** Friendly customer-facing message when the waybill wasn't found. */
const notFoundMessage = (waybill: string): string =>
  `ඒ waybill number එක (${waybill}) එක්ක order එකක් හම්බුනේ නැහැ. ඒක ආයෙ check කරලා බලන්න, නැත්නම් අපේ team එකෙන් අහන්න 😊`;

export async function getOrderStatus(
  waybill: string
): Promise<TrackingHit> {
  const normalized = waybill.trim().toUpperCase();

  try {
    const res = await fetch(`${API_URL}/api/public/order/tracking-info`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-tenant": TENANT,
      },
      body: JSON.stringify({ waybill_number: normalized }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as {
      data?: { timeline?: CurfoxEvent[]; order?: CurfoxOrder };
    } | null;

    if (!res.ok || !data?.data) {
      return { found: false, waybill: normalized, events: [], message: notFoundMessage(normalized) };
    }

    const timeline = data.data.timeline ?? [];
    const order = data.data.order;
    const current = timeline[0];
    const statusName = current?.status.name;
    const lastUpdated = current?.date_time;

    // Normalize the timeline down to the fields we want OpenRouter to see.
    const events = timeline
      .slice(0, 5)
      .map((e) => ({
        name: e.status.name ?? "Update",
        dateTime: e.date_time,
        ago: e.date_time_ago,
      }));

    if (!statusName) {
      return {
        found: false,
        waybill: normalized,
        events: [],
        message: notFoundMessage(normalized),
      };
    }

    return {
      found: true,
      waybill: normalized,
      statusName,
      lastUpdated,
      customerName: order?.customer_name,
      merchant: order?.merchant,
      weight: order?.weight,
      cod: order?.cod,
      events,
    };
  } catch {
    return {
      found: false,
      waybill: normalized,
      events: [],
      message:
        "මට tracking service එකට connect වෙන්න බැරි උනා දැන්. ටිකක් වෙලාවකින් ආයෙ try කරන්න, නැත්නම් අපේ team එකෙන් අහන්න 😊",
    };
  }
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Friendly status summary built from the live data — no AI call,
 * so order tracking keeps working even when the AI quota is exhausted.
 * The full journey lives on the tracking page, so the reply is kept
 * short (status + key facts) and the widget renders a "Track full
 * journey" button below it (see the trackingLink field on the reply).
 */
export function trackingSummary(t: TrackingHit): string {
  if (!t.found) return t.message ?? "ඒ waybill එක ගැන තොරතුරු හම්බුනේ නැහැ.";
  const status = t.statusName ? titleCase(t.statusName) : "Update";
  const parts: string[] = [
    `ඔයාගේ order එක (${t.waybill}) දැනට **${status}** තත්ත්වයේ තියෙන්නේ 😊`,
  ];

  // Key facts — each only once, no repeated status/date.
  const facts: string[] = [];
  if (t.customerName) facts.push(`- **Customer:** ${t.customerName}`);
  if (t.cod != null) facts.push(`- **COD:** රු. ${t.cod.toLocaleString("en-US")}`);
  const latest = t.events[0];
  if (latest) {
    facts.push(
      `- **Last update:** ${formatDateTime(latest.dateTime)}${
        latest.ago ? ` (${latest.ago})` : ""
      }`
    );
  }
  if (facts.length) parts.push(facts.join("\n"));

  return parts.filter(Boolean).join("\n\n");
}

/** Compact status block handed to OpenRouter — facts only. */
export function trackingToContext(t: TrackingHit): string {
  if (!t.found) return `ORDER TRACKING: ${t.message}`;
  const lines = [
    `ORDER TRACKING (waybill ${t.waybill} — live from Royal Express):`,
    `- Current status: ${t.statusName}${t.lastUpdated ? ` (as of ${t.lastUpdated})` : ""}`,
  ];
  if (t.customerName) lines.push(`- Customer: ${t.customerName}`);
  if (t.merchant) lines.push(`- Merchant: ${t.merchant}`);
  if (t.weight != null) lines.push(`- Weight: ${t.weight} kg`);
  if (t.cod != null) lines.push(`- Cash on delivery: Rs. ${t.cod.toLocaleString("en-US")}`);
  if (t.events.length) {
    lines.push(
      "- Journey: " +
        t.events
          .map((e) => `${e.name} (${e.dateTime}${e.ago ? `, ${e.ago}` : ""})`)
          .join(" → ")
    );
  }
  return lines.join("\n");
}
