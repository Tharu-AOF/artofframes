// ============================================================
// CHAT STATE — structured memory of what we know about this
// customer, rebuilt from the conversation on every request
// (stateless: nothing is persisted; the widget's history is the
// source of truth). The extracted block is handed to the model
// as working memory so it never re-asks for known facts and can
// resolve follow-ups like "අනිත් ඒවා?", "එකේ price?", or
// "මේ දෙකෙන් හොඳ එක?" against earlier turns.
// ============================================================

import {
  detectRecipient,
  extractBudget,
  findMentionedProducts,
  findProductsByNames,
} from "@/lib/chat/products";
import type { ChatTurn } from "@/lib/gemini";
import type { ProductHit } from "@/lib/chat/types";

/** The customer's immediate goal — drives how the reply is shaped. */
export type CustomerGoal =
  | "browse"
  | "discover"
  | "compare"
  | "detail"
  | "quote"
  | "order"
  | "support"
  | "track"
  | "smalltalk";

export interface CustomerState {
  /** Who the gift is for (Sinhala label, e.g. "අම්මාට"). */
  recipient?: string;
  /** Occasion the gift is for (birthday, anniversary…). */
  occasion?: string;
  /** Latest budget in rupees mentioned in the conversation. */
  budget?: number;
  /** What kind of product they're after (photo frame, keytag, clock…). */
  productType?: string;
  /** Products the assistant most recently recommended (matched by name). */
  lastRecommended: ProductHit[];
  /** Sinhala / English / mixed — the model matches the customer. */
  language: "si" | "en" | "mixed";
  /** Set by the mode router after detection. */
  goal?: CustomerGoal;
}

// ─── Occasion detection ─────────────────────────────────────────────────────

const OCCASIONS: { label: string; pattern: RegExp }[] = [
  {
    label: "birthday",
    pattern: /(birthday|උපන්දින|උපන් දින|බර්ත්ඩේ|උපන්දිනය)/i,
  },
  {
    label: "anniversary",
    pattern: /(anniversary|සංවත්සර|සංවත්සරය)/i,
  },
  {
    label: "valentine",
    pattern: /(valentine|වැලන්ටයින්|වැලන්ටයින්ස්)/i,
  },
  {
    label: "wedding",
    pattern: /(wedding|මංගල|විවාහ|මංගල්ය|වෙඩිං)/i,
  },
  {
    label: "mothers day",
    pattern: /(mother'?s ?day|මව්වරුන්ගේ දිනය|මව් දින)/i,
  },
  {
    label: "fathers day",
    pattern: /(father'?s ?day|පියවරුන්ගේ දිනය)/i,
  },
  {
    label: "new baby",
    pattern: /(baby shower|new born|newborn|අලුත් උපන්|බබෙක් ඉපදුණ)/i,
  },
];

/** The first occasion mentioned in a text, or null. */
export function detectOccasion(text: string): string | null {
  for (const o of OCCASIONS) {
    if (o.pattern.test(text)) return o.label;
  }
  return null;
}

// ─── Product type detection ────────────────────────────────────────────────

const PRODUCT_TYPES: { label: string; pattern: RegExp }[] = [
  {
    label: "photo frame",
    pattern: /(photo ?frame|frame|රාමු|මල්කඩ|ඡායාරූප රාමු)/i,
  },
  {
    label: "mommy frame",
    pattern: /(mommy ?frame|මමී)/i,
  },
  {
    label: "baby frame",
    pattern: /(baby ?frame|බබා රාමු)/i,
  },
  {
    label: "keytag / key chain",
    pattern: /(key ?tag|key ?chain|යතුරු පුවරුව|කී ටැග්)/i,
  },
  {
    label: "clock",
    pattern: /(wall ?clock|clock|ඔරලෝසු|ක්ලොක්)/i,
  },
  {
    label: "wall art",
    pattern: /(wall ?art|poster|වෝල් ආට්|පෝස්ටර්)/i,
  },
  {
    label: "sign board",
    pattern: /(sign ?board|signage|ලකුණු පුවරුව|සයින් බෝඩ්)/i,
  },
  {
    label: "hotel / business item",
    pattern: /(hotel|හෝටල්|restaurant|ආපනශාලා|business|menu card|coaster|serviette|table number)/i,
  },
];

/** The first product type mentioned in a text, or null. */
export function detectProductType(text: string): string | null {
  for (const t of PRODUCT_TYPES) {
    if (t.pattern.test(text)) return t.label;
  }
  return null;
}

// ─── Language detection ─────────────────────────────────────────────────────

const SINHALA_RE = /[\u0D80-\u0DFF]/;

/** Sinhala / English / mixed, from the char mix of a text. */
export function detectLanguage(text: string): "si" | "en" | "mixed" {
  let sinhala = 0;
  let latin = 0;
  for (const ch of text) {
    if (SINHALA_RE.test(ch)) sinhala += 1;
    else if (/[a-zA-Z]/.test(ch)) latin += 1;
  }
  if (sinhala > 0 && latin > 0) return "mixed";
  if (sinhala > 0) return "si";
  return "en";
}

// ─── Field extraction (synchronous, no data layer) ─────────────────────────

/**
 * Latest-wins extraction of the stable facts (recipient, occasion,
 * budget, product type, language). The most recent mention of each
 * fact overrides earlier ones — e.g. "not for mom, for my sister"
 * keeps the sister. lastRecommended starts empty — it is resolved
 * separately by resolveLastRecommended (it needs the catalog).
 */
export function extractStateFields(
  history: ChatTurn[],
  current: string
): CustomerState {
  const userMessages = [
    ...history.filter((t) => t.role === "user").map((t) => t.content),
    current,
  ];

  const state: CustomerState = {
    lastRecommended: [],
    language: detectLanguage(
      [...userMessages, ...history.filter((t) => t.role === "model").map((t) => t.content)].join(
        " "
      )
    ),
  };

  // Newest → oldest so the most recent mention wins.
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const text = userMessages[i];
    if (!state.recipient) {
      const r = detectRecipient(text);
      if (r) state.recipient = r.label;
    }
    if (!state.occasion) {
      const o = detectOccasion(text);
      if (o) state.occasion = o;
    }
    if (!state.budget) {
      const b = extractBudget(text);
      if (b !== null) state.budget = b;
    }
    if (!state.productType) {
      const t = detectProductType(text);
      if (t) state.productType = t;
    }
  }

  return state;
}

// ─── Last-recommended resolution (needs the catalog) ───────────────────────

/**
 * Find the products the assistant most recently recommended by
 * matching product names inside the latest assistant reply. This is
 * what lets "අනිත් options?" and "එකේ price?" point at real items.
 * Returns [] when there is no assistant reply yet or no catalog match.
 */
export async function resolveLastRecommended(
  history: ChatTurn[]
): Promise<ProductHit[]> {
  const lastAssistant = [...history]
    .reverse()
    .find((t) => t.role === "model");
  if (!lastAssistant) return [];
  const content = lastAssistant.content;

  const names =
    content
      .match(/\*\*([^*]+)\*\*/g)
      ?.map((m) => m.replace(/\*\*/g, "").trim())
      .filter((n) => n.length > 1) ?? [];

  try {
    if (names.length) {
      const exact = await findProductsByNames(names);
      if (exact.length) return exact.slice(0, 6);
    }
    // Fallback: the reply didn't bold the product names (or wrote
    // them loosely) — match any catalog product the reply mentions.
    const mentioned = await findMentionedProducts(content);
    return mentioned.slice(0, 6);
  } catch {
    return [];
  }
}

/** Full state: stable fields + the resolved last-recommended products. */
export async function extractState(
  history: ChatTurn[],
  current: string
): Promise<CustomerState> {
  const fields = extractStateFields(history, current);
  const lastRecommended = await resolveLastRecommended(history);
  return { ...fields, lastRecommended };
}

// ─── Context block for the model ───────────────────────────────────────────

/**
 * Compact working-memory block attached to the CONTEXT. The model is
 * told to treat it as memory and never re-ask for anything in it.
 */
export function stateToContext(state: CustomerState): string {
  const lines: string[] = ["CUSTOMER STATE (what you already know — never re-ask for these):"];
  if (state.recipient) lines.push(`- Recipient: ${state.recipient}`);
  if (state.occasion) lines.push(`- Occasion: ${state.occasion}`);
  if (state.budget !== undefined) {
    lines.push(`- Budget: Rs. ${state.budget.toLocaleString("en-US")}`);
  }
  if (state.productType) lines.push(`- Product type: ${state.productType}`);
  if (state.lastRecommended.length) {
    lines.push(
      `- Last recommended: ${state.lastRecommended.map((p) => p.name).join(", ")}`
    );
  }
  lines.push(`- Language: ${state.language}`);

  if (state.recipient) {
    lines.push(
      `- GIFT RECIPIENT RULE: match products to ${state.recipient}. Never recommend romantic/couple items unless they are a romantic partner (girlfriend/boyfriend/wife/husband) or the occasion is a wedding/anniversary/valentine.`
    );
  }
  return lines.join("\n");
}
