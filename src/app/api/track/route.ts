import { NextResponse } from "next/server";

// ============================================================
// POST /api/track — server proxy for the Royal Express public
// tracking endpoint.
//
//   Upstream : POST https://v1.api.curfox.com/api/public/order/tracking-info
//   Headers  : Accept, Content-Type, X-tenant
//   Body     : { "waybill_number": "..." }
//
// The proxy keeps the tenant config server-side (env vars) and
// shields the browser from CORS. The upstream status + body are
// passed through verbatim so the client can distinguish the two
// documented error cases (missing waybill vs. unknown waybill).
// ============================================================

export const runtime = "nodejs";

const API_URL =
  process.env.ROYAL_EXPRESS_API_URL ?? "https://v1.api.curfox.com";
const TENANT = process.env.ROYAL_EXPRESS_TENANT ?? "royalexpress";

export async function POST(request: Request) {
  let body: { waybill_number?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const waybill =
    typeof body.waybill_number === "string" ? body.waybill_number.trim() : "";
  if (!waybill) {
    return NextResponse.json(
      { message: "The given data was invalid.", errors: { waybill_number: ["The waybill number field is required."] } },
      { status: 422 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/api/public/order/tracking-info`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-tenant": TENANT,
      },
      body: JSON.stringify({ waybill_number: waybill }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    return NextResponse.json(
      data ?? { message: "Unexpected response from the tracking service." },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      {
        error: true,
        message: "Could not reach the tracking service. Please try again.",
      },
      { status: 502 }
    );
  }
}
