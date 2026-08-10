"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Circle,
  CheckCircle2,
  Truck,
  GitBranch,
  Navigation,
  Package,
  MapPin,
  Clock,
  XCircle,
  Warehouse,
  Send,
  Search,
  PackageSearch,
} from "lucide-react";

// ============================================================
// TRACK ORDER — search a Royal Express waybill number and show
// the order's delivery journey on a form-styled panel (the same
// background treatment as the product modal).
//
//   form   → POST /api/track (server proxy to Curfox) → data
//   top    : current status hero (prominent, colour-coded)
//   body   : order details + vertical delivery timeline
// ============================================================

// ─── Types (mirror the live Curfox public response) ─────────────────────────

interface TrackingStatus {
  name: string;
  color?: string;
  icon?: string;
}

interface TrackingEvent {
  status: TrackingStatus;
  date_time: string;
  date_time_ago?: string;
  proofs?: unknown[];
  // Status-specific extras ride along as extra keys, e.g.
  // "Assigned Rider", "Received Branch", "Dispatched Warehouse".
  [key: string]: unknown;
}

interface TrackingOrder {
  waybill_number?: string;
  weight?: number;
  cod?: number;
  customer_name?: string;
  merchant?: string;
}

interface TrackingData {
  timeline?: TrackingEvent[];
  order?: TrackingOrder;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const formatRs = (n: number) => `Rs ${n.toLocaleString("en-US")}`;

// Curfox returns its own icon names ("TruckIcon", "CheckCircleIcon"…).
// Match the closest lucide icon by name; fall back to a plain dot.
// Returns JSX (never a component instance), so it's safe inside render.
function StatusGlyph({
  name,
  color,
  size = 15,
  strokeWidth = 2,
}: {
  name?: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const n = (name ?? "").toLowerCase();
  const common = { size, strokeWidth, style: { color } };
  if (n.includes("truck")) return <Truck {...common} />;
  if (n.includes("navigation")) return <Navigation {...common} />;
  if (n.includes("gitbranch")) return <GitBranch {...common} />;
  if (n.includes("package")) return <Package {...common} />;
  if (n.includes("check")) return <CheckCircle2 {...common} />;
  if (n.includes("warehouse") || n.includes("store"))
    return <Warehouse {...common} />;
  if (n.includes("home") || n.includes("mappin") || n.includes("location"))
    return <MapPin {...common} />;
  if (n.includes("clock")) return <Clock {...common} />;
  if (n.includes("cancel") || n.includes("xcircle"))
    return <XCircle {...common} />;
  if (n.includes("send")) return <Send {...common} />;
  return <Circle {...common} />;
}

// Extra per-event fields worth surfacing as labelled rows.
const EXTRA_FIELD_KEYS = [
  "Assigned Rider",
  "Received Branch",
  "Dispatched Warehouse",
  "Source Branch",
  "Destination Branch",
  "Rider",
  "Branch",
];

const proofUrl = (p: unknown): string | null => {
  if (typeof p === "string") return p;
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    for (const k of ["url", "image_url", "path", "image", "file_url", "src"]) {
      const v = o[k];
      if (typeof v === "string") return v;
    }
  }
  return null;
};

// Map a proxy failure to a friendly customer-facing message.
const friendlyError = (status: number, data: unknown): string => {
  if (status === 400)
    return "We couldn't find an order with that waybill number. Double-check it and try again.";
  if (status === 422) return "Please enter a waybill number first.";
  if (status === 502)
    return "We couldn't reach the tracking service right now. Please try again in a moment.";
  const msg = (data as { message?: string } | null)?.message;
  return msg || "Something went wrong while tracking this order. Please try again.";
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrackOrderView() {
  const [waybill, setWaybill] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = waybill.trim().toUpperCase();
    if (!value) {
      setError("Please enter a waybill number.");
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waybill_number: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setData(null);
        setError(friendlyError(res.status, json));
        return;
      }
      const payload = json as { data?: TrackingData } | null;
      setData(payload?.data ?? null);
      if (!payload?.data) {
        setError("No tracking details were returned for this waybill.");
      }
    } catch {
      setData(null);
      setError(
        "We couldn't reach the tracking service right now. Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const timeline = data?.timeline ?? [];
  const order = data?.order;
  const current = timeline[0];
  const currentColor = current?.status.color ?? "#CCA681";

  return (
    <section className="relative overflow-hidden bg-[#030712] pb-24 pt-28 lg:pb-32 lg:pt-36">
      {/* Ambient orbs — depth, matching the rest of the site */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/12 blur-[160px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full bg-[#0E8C7B]/6 blur-[150px]"
      />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8">
        {/* ══ Header ══ */}
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <div className="h-[1px] w-10 bg-[#CCA681]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
              Royal Express
            </span>
            <div className="h-[1px] w-10 bg-[#CCA681]" />
          </div>
          <h1
            className="text-4xl tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Track Your Order
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
            Enter the waybill number you received when your order was
            dispatched to see its live delivery journey.
          </p>
        </div>

        {/* ══ Form-styled panel ══ */}
        <div className="relative mt-10 rounded-3xl border border-[#CCA681]/20 bg-[#06060f]/70 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
          {/* Search */}
          <form
            role="search"
            onSubmit={search}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="waybill" className="sr-only">
              Waybill number
            </label>
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/15 bg-black/25 px-4 transition-colors duration-300 focus-within:border-[#CCA681] focus-within:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]">
              <Search size={18} className="shrink-0 text-gray-500" />
              <input
                id="waybill"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. RM03445496"
                value={waybill}
                onChange={(e) => setWaybill(e.target.value.toUpperCase())}
                className="h-12 w-full bg-transparent font-sans text-base tracking-widest text-white placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5A1020] px-7 text-sm font-semibold uppercase tracking-wide text-[#CCA681] transition-all duration-300 hover:bg-[#6d1528] hover:shadow-[0_0_30px_rgba(90,16,32,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#CCA681]/30 border-t-[#CCA681]" />
                  Tracking
                </>
              ) : (
                "Track"
              )}
            </button>
          </form>
          <p className="mt-3 text-center text-[11px] tracking-wide text-gray-600 sm:text-left">
            The waybill number is printed on your receipt — no account needed.
          </p>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-[#5A1020]/40 bg-[#5A1020]/10 px-5 py-4 text-center"
            >
              <p className="text-sm leading-relaxed text-[#e8b4bf]">{error}</p>
            </div>
          )}

          {/* Results */}
          {!error && data && (
            <div aria-live="polite" className="mt-8 border-t border-white/5 pt-8">
              {/* ── Current status — prominent ── */}
              {current && (
                <div
                  className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
                  style={{
                    border: `1px solid ${currentColor}40`,
                    background: `linear-gradient(135deg, ${currentColor}1c, transparent 65%)`,
                  }}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20"
                      style={{
                        background: `${currentColor}1f`,
                        boxShadow: `inset 0 0 0 1px ${currentColor}45, 0 0 44px ${currentColor}26`,
                      }}
                    >
                      <StatusGlyph
                        name={current.status.icon}
                        color={currentColor}
                        size={30}
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                        Current status
                      </p>
                      <h2
                        className="mt-1 text-3xl leading-tight tracking-tight sm:text-4xl"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          color: currentColor,
                        }}
                      >
                        {titleCase(current.status.name)}
                      </h2>
                      <p className="mt-1.5 text-sm text-gray-400">
                        {formatDateTime(current.date_time)}
                        {current.date_time_ago
                          ? ` · ${current.date_time_ago}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-6 h-[2px] w-full rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${currentColor}59, ${currentColor}0d 70%)`,
                    }}
                  />
                </div>
              )}

              {/* ── Order details ── */}
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                    Waybill
                  </p>
                  <p className="mt-1 font-sans text-base font-semibold tracking-widest text-[#CCA681]">
                    {order?.waybill_number ?? "—"}
                  </p>
                </div>
                {order?.customer_name && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                      Customer
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {order.customer_name}
                    </p>
                  </div>
                )}
                {order?.weight != null && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                      Weight
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {order.weight} kg
                    </p>
                  </div>
                )}
                {order?.cod != null && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                      Cash on delivery
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {formatRs(order.cod)}
                    </p>
                  </div>
                )}
                {order?.merchant && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                      Merchant
                    </p>
                    <p className="mt-1 text-sm text-white">{order.merchant}</p>
                  </div>
                )}
              </div>

              {/* ── Delivery journey timeline ── */}
              {timeline.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                  <PackageSearch
                    size={32}
                    className="mx-auto text-gray-600"
                  />
                  <p className="mt-4 text-sm text-gray-400">
                    No tracking events for this waybill yet. Check back soon.
                  </p>
                </div>
              ) : (
                <div className="mt-9">
                  <p className="mb-6 flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                      Delivery journey
                    </span>
                    <span className="h-px flex-1 bg-white/5" />
                    <span className="text-xs text-gray-600">
                      {timeline.length}{" "}
                      {timeline.length === 1 ? "event" : "events"}
                    </span>
                  </p>

                  <ol className="relative">
                    {/* Vertical rail */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-2 left-[15px] top-2 w-px bg-linear-to-b from-[#CCA681]/35 via-white/10 to-transparent"
                    />
                    {timeline.map((event, i) => {
                      const color = event.status.color ?? "#CCA681";
                      const isCurrent = i === 0;
                      const extras = EXTRA_FIELD_KEYS.filter(
                        (k) =>
                          typeof event[k] === "string" &&
                          (event[k] as string).trim().length > 0
                      );
                      const proofs = (event.proofs ?? [])
                        .map(proofUrl)
                        .filter((u): u is string => !!u);

                      return (
                        <li
                          key={`${event.date_time}-${i}`}
                          className="relative flex gap-5 pb-7 last:pb-0"
                        >
                          {/* Dot */}
                          <div className="relative z-10 mt-0.5 shrink-0">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur"
                              style={{
                                borderColor: `${color}55`,
                                background: isCurrent
                                  ? `${color}26`
                                  : "rgba(255,255,255,0.03)",
                                boxShadow: isCurrent
                                  ? `0 0 0 4px ${color}14, 0 0 24px ${color}33`
                                  : undefined,
                              }}
                            >
                              <StatusGlyph
                                name={event.status.icon}
                                color={color}
                                size={15}
                                strokeWidth={2}
                              />
                            </span>
                          </div>

                          {/* Event card — shimmer sweeps the card on hover */}
                          <div
                            className={`card-shimmer relative min-w-0 flex-1 overflow-hidden rounded-2xl border p-5 transition-colors duration-300 sm:p-6 ${
                              isCurrent
                                ? "border-white/20 bg-white/[0.05]"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3
                                  className="text-base text-white sm:text-lg"
                                  style={{
                                    fontFamily: "var(--font-display)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {titleCase(event.status.name)}
                                </h3>
                                <p className="mt-1 text-xs text-gray-500">
                                  {formatDateTime(event.date_time)}
                                </p>
                              </div>
                              {event.date_time_ago && (
                                <span
                                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                                  style={{
                                    backgroundColor: `${color}14`,
                                    color,
                                  }}
                                >
                                  {event.date_time_ago}
                                </span>
                              )}
                            </div>

                            {/* Status-specific extras */}
                            {extras.length > 0 && (
                              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-white/5 pt-4 sm:grid-cols-2">
                                {extras.map((key) => (
                                  <div key={key}>
                                    <dt className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
                                      {key}
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-gray-200">
                                      {event[key] as string}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            )}

                            {/* Proofs */}
                            {proofs.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-3 border-t border-white/5 pt-4">
                                {proofs.map((url, pi) => (
                                  <a
                                    key={pi}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group overflow-hidden rounded-lg border border-white/10"
                                    aria-label={`Delivery proof ${pi + 1}`}
                                  >
                                    <Image
                                      src={url}
                                      alt=""
                                      width={96}
                                      height={96}
                                      unoptimized
                                      className="h-24 w-24 object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ Footer note ══ */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Tracking powered by Royal Express ·{" "}
          <a
            href="https://www.royalexpress.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#CCA681] transition-colors duration-300 hover:underline"
          >
            royalexpress.lk
          </a>
        </p>
      </div>
    </section>
  );
}
