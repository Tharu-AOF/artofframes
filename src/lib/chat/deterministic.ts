// ============================================================
// DETERMINISTIC ANSWERS — the chatbot's no-AI fast path.
//
// Product, price, budget, size and gift questions are answered
// straight from Supabase with warm templates, so common questions
// never consume the free AI quota and keep working when the AI
// provider is down or rate-limited. Only used when the question is
// clearly product intent; everything else still goes to OpenRouter.
// ============================================================

import {
  searchProducts,
  queryMatchesProduct,
  significantTokens,
  cheapestProductPrice,
  extractBudget,
  detectRecipient,
  getNextOptions,
} from "@/lib/chat/products";
import { searchKnowledge } from "@/lib/chat/knowledge";
import {
  BROWSE_PATTERN,
  COMPARE_PATTERN,
  EXISTENCE_WORD,
  ORDER_PATTERN,
  OTHER_OPTIONS_PATTERN,
  PRICE_WORD,
  PRONOUN_PATTERN,
  SIZE_PATTERN,
} from "@/lib/chat/modes";
import type { CustomerState } from "@/lib/chat/state";
import type { ProductHit } from "@/lib/chat/types";
import type { ScoredChunk } from "@/lib/kb";

const WHATSAPP = "0750 350 109";

// ─── Intent detection ────────────────────────────────────────────────────────

/** Questions the deterministic path must NOT answer (services etc.). */
const EXCLUDED = /(engraving|engrav|කැටයම්|laser|ලේසර්|cutting|cut |sign ?board|ලකුණු|bulk|තොග|service|සේවා|logo|ලෝගෝ|delivery|shipping|කුරියර්|ඩිලිවරි|track|waybill|order)/i;

// PRICE_WORD / EXISTENCE_WORD / BROWSE_PATTERN come from
// src/lib/chat/modes.ts (shared with the mode router).
const BUDGET_WORD =
  /(ඇතුලත|අඩුවෙන්|අඩු|under|below|budget|ගැලපෙන|recommend|හොඳ|ඕන|ඕනෙ|දෙන්න|කියලා|wanna|want|athulath|athula|less)/i;
/**
 * Gift/occasion words in any language. A gift ask may name no product
 * ("birthday ekakata denna monawada hondda") — these words trigger the
 * recipient-aware gift path (or a clarifying question when no recipient
 * is given) instead of letting the AI guess wrong products.
 */
const OCCASION_WORD =
  /(gift|gifts|birthday|valentine|anniversary|wedding|තෑගි|ගිෆ්ට්|උපන්දින|වැලන්ටයින්|සංවත්සර|මංගල|විවාහ)/i;
/** Product-type words — a recipient + one of these is a product ask, not a gift ask. */
const PRODUCT_TYPE_WORD =
  /(frame|keytag|key chain|clock|wall art|sign ?board|poster|රාමු|මල්කඩ|ඡායාරූප|ක්ලොක්)/i;

/** "12 x 18" / "12x18" — a size query (never a budget). */
// SIZE_PATTERN now lives in src/lib/chat/modes.ts (shared with the
// mode router) and is imported above.

/** "What does the business do" — a short intro from the site's services. */
const INTRO_PATTERN =
  /(මොනවද කරන්නේ|මොකද කරන්නේ|මොනවද කරන|what do you do|what do you make|what do you sell|about (the )?business|about (the )?company)/i;
/** Bare "recommend something" with no details — ask what they want. */
const RECO_PATTERN =
  /\b(recommend|suggest)\b|මොනවද හොඳ|හොඳම දේ|(monawada|mokak|monawa) (hondda|honda|hondai|labai)/i;

/** Numeric value of a formatted starting price, e.g. "Rs. 1,590" → 1590. */
function startingNumeric(h: ProductHit): number | null {
  const m = h.startingPrice.match(/Rs\.\s*([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

// ─── Reply templates ─────────────────────────────────────────────────────────

function priceReply(hits: ProductHit[]): string {
  const [a, b] = hits;
  let reply = `**${a.name}** එකේ price එක ${a.startingPrice} 😊`;
  if (b) reply += ` ඒ වගේම **${b.name}** — ${b.startingPrice}.`;
  return reply;
}

function existenceReply(hits: ProductHit[]): string {
  const [a, b] = hits;
  let reply = `ඔව්, අපේ ළඟ **${a.name}** තියෙනවා 😊 ${a.startingPrice}${
    a.description ? ` — ${a.description.slice(0, 90)}` : ""
  }`;
  if (b) reply += `\n\nඒ වගේම **${b.name}** — ${b.startingPrice}.`;
  return reply;
}

function budgetReply(hits: ProductHit[]): string {
  const top = hits.slice(0, 3);
  const list = top
    .map((h, i) => `${i + 1}. **${h.name}** — ${h.startingPrice}`)
    .join("\n");
  return `මේවා ඔයාගේ budget එකට ගැලපෙනවා 😊\n\n${list}`;
}

function nothingInBudgetReply(cheapest: number | null): string {
  if (cheapest === null) {
    return `ඒ budget එක ඇතුලත products නැහැ 😊 අපේ prices ගැන බලන්න WhatsApp (${WHATSAPP}) එකෙන් අහන්න.`;
  }
  return `ඒ budget එක ඇතුලත products නැහැ 😊 අපේ ලාබම එක Rs. ${cheapest.toLocaleString(
    "en-US"
  )} සිට තියෙනවා.`;
}

/** Gift recommendations — recipient-aware products from the catalog. */
function giftReply(hits: ProductHit[], recipientLabel: string | null): string {
  const top = hits.slice(0, 3);
  const list = top
    .map((h, i) => `${i + 1}. **${h.name}** — ${h.startingPrice}`)
    .join("\n");
  const head = recipientLabel
    ? `ඔව් 😊 ${recipientLabel} මේවා ගැලපෙනවා:`
    : `ඔව් 😊 අපේ ගිෆ්ට් items මෙන්න:`;
  return `${head}\n\n${list}`;
}

// ─── Clarifying questions (unclear intent → ask, never guess) ────────────────

function giftClarifyReply(budget: number | null): string {
  const budgetNote =
    budget !== null
      ? ` (රු ${budget.toLocaleString("en-US")} ඇතුලත options තියෙනවා)`
      : "";
  return `ඔව් 😊 අපිට ලස්සන gift items ගොඩක් තියෙනවා${budgetNote}! කාටද gift එක දෙන්න ඕනේ? (උදා: අම්මා, girlfriend, teacher, baby…)`;
}

function budgetClarifyReply(budget: number): string {
  return `රු ${budget.toLocaleString(
    "en-US"
  )} ඇතුලත අපේ products ගොඩක් තියෙනවා 😊 මොන වගේ දෙයක්ද හොයන්නේ? (photo frame, keytag, clock, wall art, gift…)`;
}

const RECO_CLARIFY = `ඔව් 😊 මොන වගේ දෙයක්ද ඕනේ? (gift එකක්, photo frame, keytag, clock, wall art…) — ඒ වගේම කාටද කියලත් කිව්වොත් හොඳම match එක දෙන්න පුළුවන් 😊`;

const BROWSE_REPLY = `අපිට photo frames, mommy & baby frames, clocks, keytags, wall art, gift items, sign boards වගේ දේවල් තියෙනවා 😊 මොන වගේ එකක්ද හොයන්නේ?`;

const INTRO_REPLY = `අපි Art of Frames 😊 laser cutting & engraving, custom gifts, photo frames, sign boards, hotel & business items වගේ දේවල් කරනවා. මොකක් ගැනද අහන්න ඕනේ?`;

/** Quote a knowledge passage (site content) as a short answer. */
function knowledgeReply(chunk: ScoredChunk): string {
  let text = chunk.content.trim();
  if (text.length > 220) {
    text = text.slice(0, 220).replace(/\s+\S*$/, "");
    if (!/[.!?]$/.test(text)) text += "…";
  } else if (!/[.!?]$/.test(text)) {
    text += ".";
  }
  return `${text} 😊\n\nවැඩි විස්තර ඕන නම් WhatsApp (${WHATSAPP}) එකෙන් අහන්න.`;
}

const SIZE_REPLY = `අපේ සියලුම products made to order නිසා size එක අනුව pricing වෙනස් වෙනවා 😊 Specific size එකකට quote එකක් ඕන නම් WhatsApp (${WHATSAPP}) messages එකක් දාන්න — quote එකක් එවන්නම්.`;

const ORDER_HELP_REPLY = `හරි 😊 Order කරන්න මෙහෙම කරන්න:\n\n1. Shop page එකෙන් ඔයාට ඕන item එක තෝරගන්න\n2. Add to Cart කරලා cart එකට යන්න\n3. Cart එකේ WhatsApp order button එකෙන් order එක confirm කරන්න\n\nCustom size / design එකක් ඕන නම් WhatsApp (${WHATSAPP}) එකෙන් අහන්න 😊`;

/** "Products & prices" FAQ — point to the shop page with a button. */
const PRODUCTS_PAGE_PATTERN =
  /products? ?(&|and) ?prices|products? (බලන්න|balanna|prices|page)|prices (බලන්න|balanna)|shop page/i;
const PRODUCTS_PAGE_REPLY = `අපේ සියලුම products & prices බලන්න පුළුවන් shop page එකෙන් 😊 කැමති item එකක් click කරලා price, materials, variations බලන්න පුළුවන්.`;

/** "අනිත් options?" — the next catalog options beyond what was shown. */
function otherOptionsReply(hits: ProductHit[]): string {
  const list = hits
    .slice(0, 3)
    .map((h, i) => `${i + 1}. **${h.name}** — ${h.startingPrice}`)
    .join("\n");
  return `ඔව් 😊 තව options තියෙනවා:\n\n${list}`;
}

/** "මේ දෙකෙන් හොඳ එක?" — a short side-by-side of 2–3 products. */
function compareReply(hits: ProductHit[]): string {
  const rows = hits
    .slice(0, 3)
    .map((h) => {
      const bits: string[] = [];
      if (h.materials.length) bits.push(`Materials: ${h.materials.slice(0, 3).join(", ")}`);
      if (h.features[0]) bits.push(`Best for: ${h.features[0]}`);
      return `- **${h.name}** — ${h.startingPrice}${
        bits.length ? ` — ${bits.join(" · ")}` : ""
      }`;
    })
    .join("\n");

  const [a, b] = hits;
  let verdict = "";
  if (a && b) {
    const aN = startingNumeric(a);
    const bN = startingNumeric(b);
    if (aN !== null && bN !== null && aN !== bN) {
      const cheaper = aN < bN ? a : b;
      verdict = `Budget එක focus කරනවා නම් **${cheaper.name}** එක cheaper (${cheaper.startingPrice}) 😊`;
    } else if (a.customizable !== b.customizable) {
      const c = a.customizable ? a : b;
      verdict = `Customize කරන්න ඕන නම් **${c.name}** එක හොඳයි 😊`;
    }
  }
  return [`මේ දෙක compare කරලා බලමු 😊`, rows, verdict].filter(Boolean).join("\n\n");
}

/** Compare asked but nothing to compare — name two items. */
function compareClarifyReply(): string {
  return `කොයි දෙකද compare කරන්න ඕනේ? (products දෙකක නම් කියන්න, නැත්නම් recommend කරපු ඒවායින් දෙකක් කියන්න) 😊`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface DeterministicReply {
  reply: string;
  products: ProductHit[];
  /** When set, the widget renders a button linking to this page (e.g. the shop). */
  shopLink?: string;
}

/**
 * Answer a clearly product-related question without any AI call.
 * Returns null when the question is ambiguous or not about products —
 * the caller then falls back to OpenRouter (and ultimately to the busy
 * message when the AI is unavailable).
 */
export async function tryDeterministicAnswer(
  message: string,
  contextQuery: string = message,
  state?: CustomerState
): Promise<DeterministicReply | null> {
  // Explicit "how to order/buy" — deterministic steps, no AI needed.
  if (ORDER_PATTERN.test(message)) {
    return { reply: ORDER_HELP_REPLY, products: [] };
  }

  // "Products & prices" FAQ — answer with a shop-page button.
  if (PRODUCTS_PAGE_PATTERN.test(message)) {
    return { reply: PRODUCTS_PAGE_REPLY, products: [], shopLink: "/shop" };
  }

  // Waybills, services, delivery and tracking never go down this path.
  if (EXCLUDED.test(message)) return null;

  // Size questions are answered honestly from the made-to-order policy.
  if (SIZE_PATTERN.test(message)) {
    return { reply: SIZE_REPLY, products: [] };
  }

  // ── Follow-ups that only make sense after a recommendation ──
  // These resolve against the customer state, so a short follow-up
  // like "එකේ price?", "අනිත් ඒවා?", or "මේ දෙකෙන් හොඳ එක?"
  // keeps pointing at the items the assistant just recommended.
  const shortAsk = message.trim().length <= 60;
  if (shortAsk && state && state.lastRecommended.length > 0) {
    if (PRONOUN_PATTERN.test(message) && PRICE_WORD.test(message)) {
      const [first] = state.lastRecommended;
      if (first) return { reply: priceReply([first]), products: [first] };
    }
    if (OTHER_OPTIONS_PATTERN.test(message)) {
      const next = await getNextOptions(state.lastRecommended);
      if (next.length) {
        return { reply: otherOptionsReply(next), products: next.slice(0, 3) };
      }
    }
    if (COMPARE_PATTERN.test(message)) {
      const picks = state.lastRecommended.slice(0, 3);
      if (picks.length >= 2) {
        return { reply: compareReply(picks), products: picks };
      }
    }
  } else if (shortAsk && COMPARE_PATTERN.test(message)) {
    // No prior recommendation — resolve the compared items from the
    // message itself; if we can't, ask which two to compare rather
    // than guessing.
    const hits = await searchProducts(message, 8);
    const named = hits
      .filter((h) => queryMatchesProduct(message, [h]))
      .slice(0, 3);
    if (named.length >= 2) {
      return { reply: compareReply(named), products: named };
    }
    return { reply: compareClarifyReply(), products: [] };
  }


  // Open-ended browsing and business questions are answered (with a
  // follow-up question) rather than left to guess or fail.
  if (BROWSE_PATTERN.test(message) && !PRICE_WORD.test(message)) {
    return { reply: BROWSE_REPLY, products: [] };
  }
  if (INTRO_PATTERN.test(message) && message.length <= 60) {
    return { reply: INTRO_REPLY, products: [] };
  }

  // Ranking runs on the WHOLE conversation (contextQuery), so a
  // follow-up like "රු 3000 ඇතුලත" after "teacher gift" still respects
  // the earlier recipient and budget.
  const query = contextQuery || message;
  const budget = extractBudget(query);
  const isBudget = budget !== null && BUDGET_WORD.test(query);

  // Who the gift is for: the CURRENT message wins over older turns,
  // so the ranking and the reply always match the latest ask.
  const recipient = detectRecipient(message) ?? detectRecipient(query);
  const tokens = significantTokens(message);
  const priceOrExists =
    PRICE_WORD.test(message) || EXISTENCE_WORD.test(message);

  // Gift/occasion words in the current message or the conversation.
  const wordGift =
    (OCCASION_WORD.test(message) || OCCASION_WORD.test(query)) &&
    !priceOrExists;

  let isProduct = priceOrExists && !isBudget;
  // Gift intent wins over a bare mention, so a lone "gift" asks who
  // it's for instead of dumping the first romance item.
  let isGift = !isBudget && wordGift;

  // Whether the message names a real product is decided against the
  // actual catalog hits, so "recommend something" (no product named)
  // clarifies instead of being treated as a product name.
  const hits = await searchProducts(query, 8, recipient);
  const namedProduct =
    hits.length > 0 && queryMatchesProduct(message, hits);

  // A short bare mention ("plymount", "mommy frames", "baby frame")
  // is a product question — unless it's actually a vague "recommend
  // something" that should clarify first.
  const recoAsk =
    RECO_PATTERN.test(message) && !recipient && !namedProduct;
  if (
    !isBudget &&
    !isProduct &&
    !isGift &&
    !recoAsk &&
    tokens.length > 0 &&
    tokens.length <= 4
  ) {
    isProduct = true;
  }

  // Longer messages that still name a real product ("photo frame ekak
  // denna monawada hondda") are product asks too.
  if (!isBudget && !isProduct && !isGift && namedProduct && tokens.length <= 6) {
    isProduct = true;
  }

  // A recipient alone is a gift ask ("amma kenekta denna honda deyak",
  // "teacher kenekta denna monawada hondda", "recommend something for
  // teacher") — the recipient-aware ranking picks fitting items —
  // unless the message names a real product or price ("baby frame",
  // "mommy frame කීයද").
  if (
    !isBudget &&
    !isGift &&
    recipient !== null &&
    !priceOrExists &&
    !namedProduct &&
    !PRODUCT_TYPE_WORD.test(message)
  ) {
    isGift = true;
  }

  // ── Unclear intent → ask a clarifying question, never guess. ──
  if (isGift && !recipient && !isProduct && !isBudget) {
    return { reply: giftClarifyReply(budget), products: [] };
  }
  if (
    isBudget &&
    !isProduct &&
    !isGift &&
    !recipient &&
    !namedProduct &&
    !OCCASION_WORD.test(query)
  ) {
    return { reply: budgetClarifyReply(budget), products: [] };
  }
  if (
    !isBudget &&
    !isProduct &&
    !isGift &&
    recoAsk &&
    tokens.length > 0 &&
    tokens.length <= 6
  ) {
    return { reply: RECO_CLARIFY, products: [] };
  }

  if (!isBudget && !isProduct && !isGift) return null;

  // Only answer deterministically when the customer actually named or
  // described a real product — never for vague questions. A short bare
  // mention that isn't a structured product ("plymount") falls back to
  // the site's knowledge base.
  if (isProduct && (!hits.length || !queryMatchesProduct(message, hits))) {
    if (
      tokens.length > 0 &&
      tokens.length <= 4 &&
      !PRICE_WORD.test(message)
    ) {
      const chunks = await searchKnowledge(message, 1);
      if (chunks.length && chunks[0].score >= 1) {
        return { reply: knowledgeReply(chunks[0]), products: [] };
      }
    }
    return null;
  }

  if (isBudget) {
    const inBudget = hits.filter((h) => {
      const n = startingNumeric(h);
      return n !== null && n <= budget!;
    });
    if (!inBudget.length) {
      const cheapest = await cheapestProductPrice();
      return { reply: nothingInBudgetReply(cheapest), products: [] };
    }
    return { reply: budgetReply(inBudget), products: inBudget };
  }

  if (isGift) {
    // Real, priceable products only (no "Custom Price", no Rs. 0).
    const picks = hits.filter((h) => {
      const n = startingNumeric(h);
      return n !== null && n > 0;
    });
    // Recommendations should offer a useful choice, not stop at one item just
    // because the first search query was narrow. Fill up to three with other
    // recipient-appropriate catalog items, never duplicates.
    if (picks.length < 3) {
      const broader = await searchProducts("gift", 12, recipient);
      for (const candidate of broader) {
        const n = startingNumeric(candidate);
        if (n !== null && n > 0 && !picks.some((p) => p.id === candidate.id)) {
          picks.push(candidate);
          if (picks.length === 3) break;
        }
      }
    }
    return {
      reply: giftReply(picks, recipient?.label ?? null),
      products: picks.slice(0, 3),
    };
  }

  if (PRICE_WORD.test(message)) {
    return { reply: priceReply(hits), products: hits.slice(0, 2) };
  }
  return { reply: existenceReply(hits), products: hits.slice(0, 2) };
}
