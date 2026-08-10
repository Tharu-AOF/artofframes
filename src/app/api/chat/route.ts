// ============================================================
// POST /api/chat — the chatbot's single entry point.
//
//   validate → rate-limit → branch (waybill / greeting / normal)
//   → retrieve trusted data (Supabase + kb_chunks + Royal Express)
//   → OpenRouter formulates the friendly reply → log → respond
//
// OpenRouter never sees the whole database — only the retrieved facts.
// The OPENROUTER_API_KEY and Supabase service role stay server-side.
// ============================================================

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  searchProducts,
  productsToContext,
  toProductCards,
  detectRecipient,
  hasProductSignal,
} from "@/lib/chat/products";
import { searchKnowledge, chunksToContext } from "@/lib/chat/knowledge";
import { getBusinessInfo, businessToContext } from "@/lib/chat/business";
import { tryDeterministicAnswer } from "@/lib/chat/deterministic";
import {
  extractStateFields,
  resolveLastRecommended,
  stateToContext,
  type CustomerState,
} from "@/lib/chat/state";
import { detectMode, modeToInstruction, type ChatMode } from "@/lib/chat/modes";
import {
  extractWaybill,
  getOrderStatus,
  isTrackingIntent,
  trackingSummary,
} from "@/lib/chat/tracking";
import {
  chatOpenRouter,
  OpenRouterError,
  OpenRouterNotConfiguredError,
  OpenRouterQuotaError,
  type ChatTurn,
} from "@/lib/gemini";
import type { ProductCard } from "@/lib/chat/types";

export const runtime = "nodejs";

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_MESSAGE = 500;
const MAX_HISTORY = 10;
const MAX_HISTORY_MESSAGE = 1000;
const HANDOFF_MARKER = "[[HANDOFF]]";

const BUSY_MESSAGE =
  "අපේ chat assistant එක මේ වෙලාවේ ටිකක් busy 😊 ඔයාට ඕන නම් පහළින් WhatsApp එකෙන් chat කරන්න හෝ message එකක් leave කරන්න — අපේ team එකෙන් reply කරන්නම්.";
const WAYBILL_REQUEST =
  "ඔයාගේ order එක check කරන්න ඔයාගේ waybill number එක දෙන්න 😊 (receipt එකේ තියෙනවා — උදා: RM03445496).";
const GREETING_REPLY =
  "Hi! 👋 මම නිෂී. අපේ products, prices, delivery ගැන විස්තර දැනගන්න හෝ ඔයාගේ order එක track කරලා විස්තර දෙන්නත් පුළුවන්. ඔයාට මගෙන් දැනගන්න ඕනේ මොනවද?";

// ─── Rate limiting (in-memory, single process) ───────────────────────────────

const WINDOW_MS = 60_000;
const MAX_PER_MINUTE = 30;
const DAY_MS = 86_400_000;
const MAX_PER_DAY = 300;
const buckets = new Map<
  string,
  { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }
>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Prune stale buckets so the map can't grow forever.
  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) {
      if (now - b.dayStart > DAY_MS) buckets.delete(k);
    }
  }

  let b = buckets.get(ip);
  if (!b || now - b.minuteStart > WINDOW_MS) {
    b = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  } else if (now - b.dayStart > DAY_MS) {
    b.dayStart = now;
    b.dayCount = 0;
  }
  b.minuteCount += 1;
  b.dayCount += 1;
  buckets.set(ip, b);
  return b.minuteCount <= MAX_PER_MINUTE && b.dayCount <= MAX_PER_DAY;
}

// ─── Logging (service role, server-side only, never blocks a reply) ─────────

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Fire-and-forget: run a Supabase write, ignoring failures. */
function silently(p: PromiseLike<unknown>): void {
  Promise.resolve(p).then(() => {}).catch(() => {});
}

function logSession(sessionId: string): void {
  const db = serviceClient();
  if (!db) return;
  silently(
    db.from("chat_sessions").upsert(
      { session_id: sessionId, updated_at: new Date().toISOString() },
      { onConflict: "session_id" }
    )
  );
}

function logMessage(sessionId: string, role: string, message: string): void {
  const db = serviceClient();
  if (!db) return;
  silently(db.from("chat_messages").insert({ session_id: sessionId, role, message }));
}

function logUnanswered(
  sessionId: string,
  question: string,
  reason: string
): void {
  const db = serviceClient();
  if (!db) return;
  silently(
    db.from("chat_unanswered").insert({ session_id: sessionId, question, reason })
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** The customer's own last few messages — used to widen retrieval. */
function recentUserQuestions(history: ChatTurn[], current: string): string {
  const prev = history
    .filter((t) => t.role === "user")
    .slice(-2)
    .map((t) => t.content);
  return [...prev, current].join(" ");
}

/** Requested a human? Logs an unanswered entry with a clear reason. */
function isHandoffRequest(message: string): boolean {
  return (
    message.length <= 80 &&
    /(human|person|agent|support|speak to|talk to|call (you|me)|කෙනෙක්|සපෝට්|හියුමන්)/i.test(
      message
    )
  );
}

async function geminiReply(
  history: ChatTurn[],
  userMessage: string,
  context: string
): Promise<string> {
  const turns: ChatTurn[] = [
    ...history,
    {
      role: "user",
      content: `CONTEXT (the only facts you may use):\n${context}\n\nCustomer: ${userMessage}`,
    },
  ];
  // Generous budget: OpenRouter free models retry across providers.
  return chatOpenRouter(turns, AbortSignal.timeout(35_000));
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { message?: unknown; sessionId?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ error: "Session is required" }, { status: 400 });
  }

  if (!checkRateLimit(clientIp(request))) {
    return NextResponse.json(
      { error: "rate_limited", reply: BUSY_MESSAGE, needsHandoff: true },
      { status: 429 }
    );
  }

  let history: ChatTurn[] = [];
  if (Array.isArray(body.history)) {
    history = body.history.slice(-MAX_HISTORY).flatMap((h) => {
      if (!h || typeof h !== "object") return [];
      const { role, content } = h as { role?: unknown; content?: unknown };
      if (
        (role === "user" || role === "model") &&
        typeof content === "string" &&
        content.length <= MAX_HISTORY_MESSAGE
      ) {
        return [{ role, content }];
      }
      return [];
    });
  }

  // Log what the customer asked (best-effort, never blocks the reply).
  logSession(sessionId);
  logMessage(sessionId, "user", message);

  // ── Customer state + conversation mode ─────────────────────
  // Structured memory (recipient, budget, occasion, product type)
  // rebuilt from the conversation — the model is told never to
  // re-ask for these — plus the mode that shapes retrieval and
  // the reply (browse / discover / compare / detail / quote /
  // order / support / track).
  const stateFields = extractStateFields(history, message);
  const mode = detectMode(message, stateFields);

  // ── Branch 1: order tracking (waybill) ───────────────────────
  // A bare waybill number (e.g. "RM03445496") IS a tracking request,
  // even without words like "track" around it.
  const waybill = extractWaybill(message);
  if (isTrackingIntent(message) || waybill !== null) {
    if (!waybill) {
      logMessage(sessionId, "assistant", WAYBILL_REQUEST);
      return NextResponse.json({ reply: WAYBILL_REQUEST, needsWaybill: true, mode });
    }
    const tracking = await getOrderStatus(waybill);
    // Deterministic summary — no AI call, so tracking keeps working
    // even when the free-tier AI quota is exhausted.
    const reply = trackingSummary(tracking);
    logMessage(sessionId, "assistant", reply);
    return NextResponse.json({ reply, mode });
  }

  // ── Branch 2: plain greeting (no AI call needed) ─────────
  if (
    message.length <= 40 &&
    /^(hi|hii+|hello|hey|yo|good (morning|afternoon|evening)|ආයුබෝවන්|හලෝ|කොහොමද|kohomada|kohomad|kohomade|how (are|r) you)/i.test(
      message
    )
  ) {
    logMessage(sessionId, "assistant", GREETING_REPLY);
    return NextResponse.json({ reply: GREETING_REPLY, mode });
  }

  // ── Branch 2b: delivery question (deterministic — no AI) ──
  // Short delivery queries get the charge straight from settings so
  // they never consume the AI quota.
  if (
    /(delivery|shipping|කුරියර්|ඩිලිවරි)/i.test(message) &&
    message.length <= 50 &&
    !/\bto\b/i.test(message)
  ) {
    try {
      const business = await getBusinessInfo();
      const reply =
        business.deliveryCharge === 0
          ? "අපේ delivery එක free! 😊 ඕනම order එකක් නිවසටම බෙදලා දෙනවා."
          : `අපේ delivery charge එක Rs. ${business.deliveryCharge.toLocaleString(
              "en-US"
            )} per order 😊 Orders එවන්නේ Royal Express මාර්ගයෙන්.`;
      logMessage(sessionId, "assistant", reply);
      return NextResponse.json({ reply, mode });
    } catch {
      // Fall through to OpenRouter if settings are unavailable.
    }
  }

  // ── Branch 2c: deterministic product answers (no AI needed) ──
  // Price, budget, size, gift, compare, "other options", order-help
  // and named-product questions are answered straight from Supabase
  // with warm templates — instant, and they never consume the free
  // AI quota. The query includes the recent conversation so follow-ups
  // keep the recipient/budget context; the state resolves follow-ups
  // that point at the last recommended products.
  const state: CustomerState = {
    ...stateFields,
    lastRecommended: await resolveLastRecommended(history),
  };
  const det = await tryDeterministicAnswer(
    message,
    recentUserQuestions(history, message),
    state
  ).catch(() => null);
  if (det) {
    logMessage(sessionId, "assistant", det.reply);
    return NextResponse.json({
      reply: det.reply,
      products: toProductCards(det.products, 4),
      mode,
      ...(det.shopLink ? { shopLink: det.shopLink } : {}),
    });
  }

  // ── Branch 3: everything else — retrieve + OpenRouter ────────
  const query = recentUserQuestions(history, message);
  // Retrieval is recipient-aware too, so even the AI's product list
  // never surfaces romance items for a teacher/family member.
  const recipient = detectRecipient(query);
  const [products, chunks, business] = await Promise.all([
    searchProducts(query, 6, recipient),
    searchKnowledge(query, 3),
    getBusinessInfo(),
  ]);

  // Confidence gate: for product-intent modes with no real catalog
  // match, don't hand the model a weak product list to force — the
  // prompt tells it to ask one clarifying question instead of dumping
  // unrelated cards.
  const productModes: ChatMode[] = ["discover", "detail", "compare"];
  const noProductSignal =
    productModes.includes(mode) && !hasProductSignal(query, products);
  const productsForContext = noProductSignal ? [] : products;

  const context = [
    businessToContext(business),
    stateToContext(state),
    modeToInstruction(mode),
    productsToContext(productsForContext),
    chunksToContext(chunks),
  ]
    .filter(Boolean)
    .join("\n\n");

  let raw: string;
  try {
    raw = await geminiReply(history, message, context);
  } catch (e) {
    // AI unavailable — retry the deterministic no-AI path before
    // degrading to the busy message, so the chat keeps answering.
    const det = await tryDeterministicAnswer(message, query, state).catch(
      () => null
    );
    if (det) {
      logMessage(sessionId, "assistant", det.reply);
      return NextResponse.json({
        reply: det.reply,
        products: toProductCards(det.products, 4),
        mode,
        ...(det.shopLink ? { shopLink: det.shopLink } : {}),
      });
    }
    return handleOpenRouterFailure(e, sessionId, message, mode);
  }

  const needsHandoff = raw.includes(HANDOFF_MARKER);
  const reply = raw
    .replaceAll(HANDOFF_MARKER, "")
    .replace(/\[\[PRODUCTS[^\]]*\]\]/g, "")
    .trim();

  // Cards render ONLY for products the answer actually recommended AND
  // named in the reply. The model's [[PRODUCTS:1,3]] indices are honored
  // only when that product's name actually appears in the reply text —
  // this is the deterministic guarantee that "plymount?" or "custom
  // engraving?" can never show unrelated cards.
  const lower = reply.toLowerCase();
  const named = productsForContext.filter((p) =>
    lower.includes(p.name.toLowerCase())
  );
  let cards: ProductCard[] = [];
  const indexMarker = raw.match(/\[\[PRODUCTS:([\d,\s]+)\]\]/);
  if (indexMarker) {
    const selected = indexMarker[1]
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter(
        (n) => Number.isInteger(n) && n >= 1 && n <= productsForContext.length
      )
      .map((i) => productsForContext[i - 1])
      .filter((p) => lower.includes(p.name.toLowerCase()));
    cards = toProductCards(selected, 4);
  }
  if (!cards.length) {
    cards = toProductCards(named, 4);
  }

  logMessage(sessionId, "assistant", reply);
  if (needsHandoff) {
    logUnanswered(
      sessionId,
      message,
      isHandoffRequest(message) ? "requested_human" : "no_confident_answer"
    );
  }

  return NextResponse.json({ reply, products: cards, needsHandoff, mode });
}

function handleOpenRouterFailure(
  e: unknown,
  sessionId: string,
  question: string,
  mode: ChatMode
): Response {
  console.error(
    `[chat] OpenRouter failure: ${e instanceof Error ? e.message : String(e)}`
  );
  if (e instanceof OpenRouterNotConfiguredError) {
    // Misconfiguration is a developer concern — surface it plainly.
    return NextResponse.json(
      {
        reply:
          "The chat assistant isn't configured yet (OPENROUTER_API_KEY missing). Please add it to .env.local and restart.",
        needsHandoff: true,
        mode,
      },
      { status: 200 }
    );
  }
  if (e instanceof OpenRouterQuotaError) {
    logUnanswered(sessionId, question, "assistant_unavailable");
    return NextResponse.json(
      { reply: BUSY_MESSAGE, needsHandoff: true, mode },
      { status: 200 }
    );
  }
  if (e instanceof OpenRouterError) {
    logUnanswered(sessionId, question, "assistant_unavailable");
    return NextResponse.json(
      { reply: BUSY_MESSAGE, needsHandoff: true, mode },
      { status: 200 }
    );
  }
  logUnanswered(sessionId, question, "assistant_unavailable");
  return NextResponse.json(
    { reply: BUSY_MESSAGE, needsHandoff: true, mode },
    { status: 200 }
  );
}
