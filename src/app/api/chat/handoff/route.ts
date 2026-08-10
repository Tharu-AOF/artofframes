// ============================================================
// POST /api/chat/handoff — saves a "talk to a person" request
// (name, contact, message) to the chat_handoffs table with the
// service role. The browser never reads chat data — it only ever
// inserts its own handoff through this server route.
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_NAME = 100;
const MAX_CONTACT = 200;
const MAX_MESSAGE = 2000;

export async function POST(request: Request) {
  let body: {
    sessionId?: unknown;
    name?: unknown;
    contact?: unknown;
    message?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: "A message is required" },
      { status: 400 }
    );
  }
  if (name.length > MAX_NAME || contact.length > MAX_CONTACT) {
    return NextResponse.json(
      { error: "Name or contact is too long" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }
  const db = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await db.from("chat_handoffs").insert({
    session_id: sessionId,
    name: name || null,
    contact: contact || null,
    message,
    source: "chat",
    status: "new",
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save the request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
