// ============================================================
// CHAT GOLDEN CASES — the quality set that guards every prompt
// and retrieval change. Two flavours:
//   - unitChecks:      pure, no database (mode, language, state
//                      extraction, patterns).
//   - deterministicCases: real catalog, no AI — drive the fast
//                      path (tryDeterministicAnswer) exactly as
//                      the /api/chat route does.
// The live runner (run-live.ts) reuses the same Expectation
// shape against the real /api/chat endpoint with looser checks,
// so AI variance can't false-fail.
//
// Run with:  npm run chat:test          (fast — no AI cost)
//            npm run chat:test:live      (needs the dev server)
// ============================================================

import { searchProducts } from "@/lib/chat/products";
import {
  COMPARE_PATTERN,
  detectMode,
  ORDER_PATTERN,
  OTHER_OPTIONS_PATTERN,
  PRONOUN_PATTERN,
  SIZE_PATTERN,
  type ChatMode,
} from "@/lib/chat/modes";
import {
  detectLanguage,
  detectOccasion,
  detectProductType,
  extractStateFields,
} from "@/lib/chat/state";
import type { ChatTurn } from "@/lib/gemini";

// ─── Shared assertion shape ─────────────────────────────────────────────────

export interface Expectation {
  /** All of these substrings must appear (case-insensitive). */
  contains?: string[];
  /** None of these may appear (case-insensitive). */
  excludes?: string[];
  /** Card-count expectation: "none" | "some" | exact number. */
  products?: "none" | "some" | number;
  /** Deterministic path must return null (fall through to the AI). */
  expectNull?: boolean;
  /** The reply must (not) carry a shop-page button link. */
  shopLink?: boolean;
}

/** Check a reply + card list against an Expectation. Returns error strings. */
export function checkExpectation(
  reply: string,
  cards: unknown[],
  expect: Expectation
): string[] {
  const errors: string[] = [];
  const lower = reply.toLowerCase();

  for (const c of expect.contains ?? []) {
    if (!lower.includes(c.toLowerCase())) {
      errors.push(`missing "${c}"`);
    }
  }
  for (const e of expect.excludes ?? []) {
    if (lower.includes(e.toLowerCase())) {
      errors.push(`unexpected "${e}"`);
    }
  }
  const count = Array.isArray(cards) ? cards.length : 0;
  if (expect.products === "none" && count > 0) {
    errors.push(`expected no cards, got ${count}`);
  }
  if (expect.products === "some" && count === 0) {
    errors.push("expected cards, got none");
  }
  if (typeof expect.products === "number" && count !== expect.products) {
    errors.push(`expected ${expect.products} cards, got ${count}`);
  }
  return errors;
}

// ─── Unit checks (no database) ──────────────────────────────────────────────

export interface UnitCheck {
  name: string;
  fn: () => { pass: boolean; detail?: string };
}

const expectMode = (message: string, want: ChatMode) => ({
  pass: detectMode(message) === want,
  detail: `detectMode("${message}") = ${detectMode(message)}, want ${want}`,
});

const expectPattern = (pattern: RegExp, text: string, want: boolean) => ({
  pass: pattern.test(text) === want,
  detail: `pattern.test("${text}") = ${pattern.test(text)}, want ${want}`,
});

export const unitChecks: UnitCheck[] = [
  { name: "mode: greeting", fn: () => expectMode("ආයුබෝවන් කොහොමද", "greeting") },
  { name: "mode: order help", fn: () => expectMode("how do i order?", "order") },
  { name: "mode: custom size → quote", fn: () => expectMode("12x18 කීයද", "quote") },
  { name: "mode: compare", fn: () => expectMode("මේ දෙකෙන් හොඳ එක?", "compare") },
  { name: "mode: delivery → support", fn: () => expectMode("delivery Kandy කීයද", "support") },
  { name: "mode: product detail", fn: () => expectMode("mommy frame කීයද", "detail") },
  { name: "mode: discover (gift)", fn: () => expectMode("gift ekak one", "discover") },
  { name: "mode: browse", fn: () => expectMode("මොනවද තියෙනවා", "browse") },
  { name: "mode: track", fn: () => expectMode("track my order RM03445496", "track") },
  { name: "mode: small talk", fn: () => expectMode("what's the weather like", "smalltalk") },
  { name: "mode: thanks after a recommendation", fn: () => expectMode("thank you!", "smalltalk") },
  { name: "pattern: size 12x18", fn: () => expectPattern(SIZE_PATTERN, "12x18 frame", true) },
  { name: "pattern: size 12 x 18", fn: () => expectPattern(SIZE_PATTERN, "12 x 18 size", true) },
  { name: "pattern: order", fn: () => expectPattern(ORDER_PATTERN, "how can i order", true) },
  { name: "pattern: other options", fn: () => expectPattern(OTHER_OPTIONS_PATTERN, "අනිත් ඒවා", true) },
  { name: "pattern: compare", fn: () => expectPattern(COMPARE_PATTERN, "මේ දෙකෙන් හොඳ එක", true) },
  { name: "pattern: pronoun එකේ", fn: () => expectPattern(PRONOUN_PATTERN, "එකේ price කීයද", true) },
  { name: "pattern: pronoun ඒ නිසා must NOT match", fn: () => expectPattern(PRONOUN_PATTERN, "ඒ නිසා price එක අඩු කරන්න", false) },
  { name: "pattern: pronoun ඒත් must NOT match", fn: () => expectPattern(PRONOUN_PATTERN, "ඒත් price එක ගැන කියන්න", false) },
  { name: "pattern: pronoun that's must NOT match", fn: () => expectPattern(PRONOUN_PATTERN, "that's a good price", false) },
  { name: "language: Sinhala", fn: () => ({ pass: detectLanguage("ආයුබෝවන්, කොහොමද") === "si" }) },
  { name: "language: English", fn: () => ({ pass: detectLanguage("hi, how are you") === "en" }) },
  { name: "language: mixed", fn: () => ({ pass: detectLanguage("gift ekak ඕන karanna") === "mixed" }) },
  { name: "language: Singlish counts as English", fn: () => ({ pass: detectLanguage("gift ekak one karanna") === "en" }) },
  {
    name: "state: recipient latest-wins",
    fn: () => {
      const s = extractStateFields(
        [{ role: "user", content: "gift for teacher" }],
        "no wait, for my girlfriend"
      );
      return { pass: s.recipient === "your loved one", detail: `recipient=${s.recipient}` };
    },
  },
  {
    name: "state: budget latest-wins",
    fn: () => {
      const s = extractStateFields(
        [{ role: "user", content: "gift ekak 5000" }],
        "no, 3000 athulath"
      );
      return { pass: s.budget === 3000, detail: `budget=${s.budget}` };
    },
  },
  {
    name: "state: occasion + product type",
    fn: () => {
      const s = extractStateFields([], "anniversary wall clock balanna");
      return {
        pass: s.occasion === "anniversary" && s.productType === "clock",
        detail: `occasion=${s.occasion} type=${s.productType}`,
      };
    },
  },
  {
    name: "state: hotel product type",
    fn: () => {
      const s = extractStateFields([], "hotel ekakata items");
      return { pass: s.productType === "hotel / business item", detail: `type=${s.productType}` };
    },
  },
  {
    name: "state: detectOccasion wedding",
    fn: () => ({ pass: detectOccasion("wedding gift ekak") === "wedding" }),
  },
  {
    name: "state: detectProductType frame",
    fn: () => ({ pass: detectProductType("photo frame ekak") === "photo frame" }),
  },
];

// ─── Deterministic golden conversations (need the real catalog) ─────────────

export interface DeterministicCase {
  name: string;
  expect: Expectation;
  /** Build the conversation + the current message (catalog available). */
  run: () => Promise<{ turns: ChatTurn[]; message: string }>;
}

/** A realistic assistant gift reply naming real catalog products. */
async function giftReplyTurns(count = 3): Promise<ChatTurn[]> {
  const hits = await searchProducts("gift", count);
  const list = hits.map((h, i) => `${i + 1}. **${h.name}** — ${h.startingPrice}`).join("\n");
  return [
    { role: "user" as const, content: "gift ekak one" },
    { role: "model" as const, content: `ඔව් 😊 අපේ gift options මෙන්න:\n${list}` },
  ];
}

export const deterministicCases: DeterministicCase[] = [
  {
    name: "gift, no recipient → clarify (never guess)",
    expect: { contains: ["කාටද"], products: "none" },
    run: async () => ({ turns: [], message: "gift ekak one" }),
  },
  {
    name: "gift for girlfriend → romantic options",
    expect: { contains: ["ඔව්"], products: "some" },
    run: async () => ({ turns: [{ role: "user", content: "gift ekak one" }], message: "girlfriendta" }),
  },
  {
    name: "gift for girlfriend within budget",
    expect: { contains: ["budget"], products: "some" },
    run: async () => ({
      turns: [
        { role: "user", content: "gift ekak one" },
        { role: "user", content: "girlfriendta" },
      ],
      message: "3000 athulath",
    }),
  },
  {
    name: "'අනිත් options?' → next catalog options",
    expect: { contains: ["තව options"], products: "some" },
    run: async () => ({ turns: await giftReplyTurns(), message: "අනිත් options තියෙනවද?" }),
  },
  {
    name: "'මේ දෙකෙන් හොඳ එක?' → short compare",
    expect: { contains: ["compare"], products: "some" },
    run: async () => ({ turns: await giftReplyTurns(), message: "මේ දෙකෙන් හොඳ එක?" }),
  },
  {
    name: "'එකේ price?' → last recommended price",
    expect: { contains: ["Rs."], products: "some" },
    run: async () => ({ turns: await giftReplyTurns(2), message: "එකේ price කීයද" }),
  },
  {
    name: "price question on a named product",
    expect: { contains: ["Rs."], products: "some" },
    run: async () => ({ turns: [], message: "mommy frame කීයද" }),
  },
  {
    name: "budget-only ask → what kind of item?",
    expect: { contains: ["හොයන්නේ"], products: "none" },
    run: async () => ({ turns: [], message: "රු 3000 ඇතුලත" }),
  },
  {
    name: "existence: wall clock තියෙනවද",
    expect: { contains: ["ඔව්"], products: "some" },
    run: async () => ({ turns: [], message: "wall clock තියෙනවද" }),
  },
  {
    name: "browse: what do you have",
    expect: { contains: ["photo frames"], products: "none" },
    run: async () => ({ turns: [], message: "මොනවද තියෙනවා" }),
  },
  {
    name: "order help → steps, no AI",
    expect: { contains: ["Cart"], products: "none" },
    run: async () => ({ turns: [], message: "how to order?" }),
  },
  {
    name: "size ask → made-to-order quote",
    expect: { contains: ["made to order"], products: "none" },
    run: async () => ({ turns: [], message: "12x18 frame එකක් කීයද" }),
  },
  {
    name: "compare with no prior recommendation → clarify or fall through",
    expect: { contains: ["compare"] },
    run: async () => ({ turns: [], message: "compare karanna" }),
  },
  {
    name: "products & prices → shop page button",
    expect: { contains: ["shop"], shopLink: true },
    run: async () => ({ turns: [], message: "Products & prices බලන්න" }),
  },
];

// ─── Live conversation scripts (against /api/chat) ─────────────────────────

export interface LiveCase {
  name: string;
  expect: Expectation;
  /** Optional preceding conversation (alternating user/model). */
  turns?: ChatTurn[];
  /** Or build it at run time (e.g. to name real catalog products). */
  buildTurns?: () => Promise<ChatTurn[]>;
  message: string;
}

export const liveCases: LiveCase[] = [
  {
    name: "greeting introduces Nishi",
    expect: { contains: ["නිෂී"] },
    message: "hi",
  },
  {
    name: "delivery question",
    expect: { contains: ["delivery"] },
    message: "delivery Kandy වෙනකොට කීයද?",
  },
  {
    name: "tracking asks for waybill",
    expect: { contains: ["waybill"] },
    message: "මගේ order එක track කරන්න",
  },
  {
    name: "how to order",
    expect: { contains: ["Cart"], products: "none" },
    message: "how to order?",
  },
  {
    name: "gift flow starts with a clarifying question",
    expect: { contains: ["කාටද"], products: "none" },
    message: "gift ekak one",
  },
  {
    name: "wall clock redirect from frames",
    expect: { contains: ["clock"] },
    message: "eka nemei wall clock balanna",
  },
  {
    name: "custom size → quote guidance",
    expect: { contains: ["made to order"] },
    message: "12x18 custom size ekak ganna one",
  },
  {
    name: "price of a named product (never invented)",
    expect: { contains: ["Rs."] },
    message: "keytag ekak kiyada",
  },
  {
    name: "budget filter",
    expect: { contains: ["budget"] },
    message: "3000 athulath gift ekak one",
  },
  {
    name: "follow-up: other options after a recommendation",
    // The LAST assistant reply names REAL catalog products, so the
    // state's "last recommended" resolves and the deterministic path
    // answers without the AI.
    buildTurns: () => giftReplyTurns(2),
    expect: { contains: ["options"] },
    message: "අනිත් options tiyenawada?",
  },
  {
    name: "mixed language price ask",
    expect: { contains: ["Rs."] },
    message: "photo frame ekak price?",
  },
  {
    name: "unclear ask never dumps a card wall",
    expect: { products: "none" },
    message: "මොනවද කරන්නේ",
  },
  {
    // Genuine typo + mixed language — the route must still return a
    // reply (the AI resolves it when available; the deterministic
    // layers degrade gracefully when not).
    name: "typo + mixed language",
    expect: {},
    message: "photo fram ekak want, pric?",
  },
  {
    name: "products & prices → shop button",
    expect: { contains: ["shop"], shopLink: true },
    message: "Products & prices බලන්න",
  },
];
