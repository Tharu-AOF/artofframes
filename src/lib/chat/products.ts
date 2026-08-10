// ============================================================
// CHAT PRODUCTS — the chatbot's product retrieval. Everything
// comes from Supabase via the existing shop data layer
// (getShopData, cached 60s server-side) — OpenRouter never supplies
// product facts. Prices are parsed with the shop's parsePrice so
// "Custom Price" products are handled the same way as the site.
// ============================================================

import { getShopData } from "@/lib/shop-db";
import {
  getCategoryPathName,
  parsePrice,
  type ShopProduct,
} from "@/components/shop/data";
import type { ProductCard, ProductHit } from "@/lib/chat/types";

// ─── Tokenizing ──────────────────────────────────────────────────────────────

/** Split text into lowercased word tokens (handles Sinhala + English). */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Words that carry no matching signal — dropped before scoring. */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "do",
  "does",
  "for",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "with",
  "me",
  "my",
  "i",
  "we",
  "you",
  "your",
  "how",
  "what",
  "want",
  "need",
  "have",
  "has",
  "can",
  "please",
  "there",
  "this",
  "that",
  "some",
  "about",
  "කීයද",
  "කීය",
  "එක",
  "එකක්",
  "තියෙනවද",
  "තියෙනවා",
  "ඕන",
  "ඕනෙ",
  "මොන",
  "මොකද",
  "වගේ",
  "ඇති",
  "හොඳ",
  "ගැන",
  "ද",
  "නැද්ද",
]);

/** Numbers ≥ 100 in the question are treated as a budget (LKR). */
export function extractBudget(query: string): number | null {
  const nums = query.match(/\d{3,}/g) ?? [];
  // Long numeric references (waybills, invoice numbers, timestamps) are not
  // realistic product budgets and must not drive recommendations.
  const valid = nums
    .map(Number)
    .filter((n) => n >= 100 && n <= 100_000);
  return valid.length ? Math.min(...valid) : null;
}

// ─── Recipient-aware steering ────────────────────────────────────────────────
// A gift query for a specific person must never surface mismatched
// categories (e.g. romance items for a teacher). When a recipient is
// detected, its boost/penalize lists replace the generic gift boost.
// Order matters: family/professional recipients are checked before
// occasion words so "අම්මාට anniversary gift" means mom, not romance.

export interface Recipient {
  pattern: RegExp;
  /** Sinhala label used in deterministic replies, e.g. "teacher කෙනෙක්ට". */
  label: string;
  /** Category ids that suit this recipient — get a boost. */
  boost: string[];
  /** Category ids that clash with this recipient — get a penalty. */
  penalize: string[];
}

export const RECIPIENTS: Recipient[] = [
  // Sinhala customers commonly attach romanized case endings directly to an
  // English relationship word, e.g. "girlfriendta". Match those variants
  // before the broader recipient rules so a clear answer is never re-asked.
  {
    pattern: /\b(girlfriend|boyfriend|wife|husband|fiance|fiancée)(?:ta|te|ge|ekata)?\b/i,
    label: "your loved one",
    boost: ["love-gifts"],
    penalize: [],
  },
  {
    pattern: /(මම්මා|අම්මා|මව|\b(mom|mummy|mother|mum|amma)\b)/i,
    label: "අම්මාට",
    boost: ["mommy-frames"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(තාත්තා|පියා|\b(dad|daddy|father|papa|thaththa|taththa)\b)/i,
    label: "තාත්තාට",
    boost: ["clocks", "common"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(ආච්චි|සීයා|\b(grandma|grandpa|grandmother|grandfather|achchi|seeya)\b)/i,
    label: "ආච්චි/සීයාට",
    boost: ["clocks", "common", "keytag", "keytags"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(අයියා|අක්කා|මල්ලි|නංගි|\b(brother|sister|aiya|akka|malli|nangi)\b)/i,
    label: "සහෝදරයෙක්ට",
    boost: ["clocks", "common", "keytag", "keytags"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(ගුරු|\bteacher\b)/i,
    label: "teacher කෙනෙක්ට",
    boost: ["clocks", "common", "keytag", "keytags"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(බබා|බේබි|අලුත් උපන්|\b(baby|newborn)\b)/i,
    label: "baby කෙනෙක්ට",
    boost: ["baby-frames"],
    penalize: ["love-gifts"],
  },
  {
    pattern: /(යාලු|මිතුර|\b(friend|bestie)\b)/i,
    label: "friend කෙනෙක්ට",
    boost: ["clocks", "common", "keytag", "keytags"],
    penalize: [],
  },
  {
    pattern: /(කපල්|\bcouple\b)/i,
    label: "couple කෙනෙක්ට",
    boost: ["love-gifts"],
    penalize: [],
  },
  {
    pattern: /(වයිෆ්|හස්බන්ඩ්|පෙම්වත|ආදරය|\b(girlfriend|boyfriend|wife|husband|fiancé|fiance)\b)/i,
    label: "ඔයාගේ ආදරය කරන කෙනෙක්ට",
    boost: ["love-gifts"],
    penalize: [],
  },
  {
    pattern: /(වැලන්ටයින්|සංවත්සර|\b(valentine|anniversary)\b)/i,
    label: "ආදරය කරන කෙනෙක්ට",
    boost: ["love-gifts"],
    penalize: [],
  },
  {
    pattern: /(මංගල|විවාහ|\bwedding\b)/i,
    label: "මංගල තෑග්ගකට",
    boost: ["love-gifts"],
    penalize: [],
  },
];

/** First recipient detected in the query, or null for a generic gift. */
export function detectRecipient(query: string): Recipient | null {
  return RECIPIENTS.find((r) => r.pattern.test(query)) ?? null;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

interface Scored {
  product: ShopProduct;
  categoryName: string;
  score: number;
  inBudget: boolean;
}

function scoreProduct(
  p: ShopProduct,
  categoryName: string,
  tokens: string[],
  budget: number | null,
  queryText: string,
  recipientOverride?: Recipient | null
): Scored {
  let score = 0;
  const name = tokenize(p.name);
  const materials = p.materials.flatMap(tokenize);
  const features = p.features.flatMap(tokenize);
  const desc = tokenize(p.description);
  const cat = tokenize(categoryName);
  const badge = tokenize(p.badge ?? "");

  for (const t of tokens) {
    if (name.includes(t)) score += 4;
    if (materials.includes(t)) score += 2.5;
    if (features.includes(t)) score += 1.5;
    if (cat.includes(t)) score += 1.5;
    if (desc.includes(t)) score += 1;
    if (badge.includes(t)) score += 1;
  }

  // A specific recipient replaces the generic gift boost: fitting
  // categories get a boost, clashing ones are pushed below the rest.
  // When an override is passed (deterministic path), it wins so the
  // ranking always matches who the customer just asked about.
  const recipient =
    recipientOverride !== undefined ? recipientOverride : detectRecipient(queryText);
  if (recipient) {
    if (recipient.boost.includes(p.categoryId)) score += 3;
    if (recipient.penalize.includes(p.categoryId)) score -= 5;
  } else if (/\b(gift|birthday|anniversary|wedding|valentine|උපන්දින|විවාහ|තෑගි)\b/i.test(
    queryText
  )) {
    if (/^(love-gifts|baby-frames|mommy-frames|clocks)$/.test(p.categoryId))
      score += 2;
  }

  // Budget: priceable items within budget rank first; anything else
  // keeps its organic score so OpenRouter can mention near-misses.
  let inBudget = false;
  if (budget !== null) {
    const prices = [
      parsePrice(p.price),
      ...p.variations.map((v) => parsePrice(v.price)),
    ].filter((n): n is number => n !== null);
    inBudget = prices.length > 0 && Math.min(...prices) <= budget;
    if (inBudget) score += 3;
  }

  return { product: p, categoryName, score, inBudget };
}

// ─── Mapping ────────────────────────────────────────────────────────────────

function toHit(s: Scored): ProductHit {
  const p = s.product;
  const variationPrices = p.variations
    .map((v) => parsePrice(v.price))
    .filter((n): n is number => n !== null);
  const minVariation = variationPrices.length
    ? Math.min(...variationPrices)
    : null;
  const base = parsePrice(p.price);
  const cheapest =
    minVariation !== null && (base === null || minVariation < base)
      ? minVariation
      : base;

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    priceNumeric: base,
    startingPrice:
      cheapest !== null
        ? `Rs. ${cheapest.toLocaleString("en-US")}`
        : "Custom Price",
    image: p.image,
    categoryId: p.categoryId,
    description: p.description,
    categoryName: s.categoryName,
    materials: p.materials,
    features: p.features,
    customizable: p.customizable,
    badge: p.badge ?? undefined,
    discountLabel: p.discount?.label,
    variations: p.variations.map((v) => ({ label: v.label, price: v.price })),
    url: `/shop?product=${p.id}`,
  };
}

// ─── Match signal (confidence) ──────────────────────────────────────────────

/** How strongly a query matched the retrieved products. */
export type MatchSignal = "exact" | "category" | "material" | "none";

/**
 * Classify the strongest match signal of a query against the top
 * hits — name (exact), category, materials/features, or none.
 * The callers use this to gate product cards: when the signal is
 * "none", dumping cards would be noise, so they ask a clarifying
 * question instead.
 */
export function bestMatchSignal(
  query: string,
  hits: ProductHit[],
  topN = 3
): MatchSignal {
  const tokens = significantTokens(query);
  if (!tokens.length || !hits.length) return "none";
  for (const h of hits.slice(0, topN)) {
    const name = new Set(tokenize(h.name));
    const category = new Set(tokenize(h.categoryName));
    const materials = new Set(h.materials.flatMap(tokenize));
    const features = new Set(h.features.flatMap(tokenize));
    if (tokens.some((t) => name.has(t))) return "exact";
    if (tokens.some((t) => category.has(t))) return "category";
    if (tokens.some((t) => materials.has(t) || features.has(t))) {
      return "material";
    }
  }
  return "none";
}

/** True when the query has any real overlap with the retrieved hits. */
export function hasProductSignal(
  query: string,
  hits: ProductHit[],
  topN = 3
): boolean {
  return bestMatchSignal(query, hits, topN) !== "none";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search products by relevance to the question. Ranked by keyword
 * overlap on name/materials/features/category/description, with a
 * budget boost when the question mentions rupees.
 */
export async function searchProducts(
  query: string,
  limit = 6,
  recipientOverride?: Recipient | null
): Promise<ProductHit[]> {
  const { products, categories } = await getShopData();
  const tokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  const budget = extractBudget(query);

  const scored = products.map((p) =>
    scoreProduct(
      p,
      getCategoryPathName(p.categoryId, categories),
      tokens,
      budget,
      query,
      recipientOverride
    )
  );

  // No meaningful tokens ("products & prices?") → newest first.
  const ordered = tokens.length
    ? scored.sort((a, b) => b.score - a.score)
    : scored.sort(
        (a, b) =>
          new Date(b.product.createdAt).getTime() -
          new Date(a.product.createdAt).getTime()
      );

  const hits = ordered.map(toHit);

  // Budget: keep in-budget items at the front, then top up with the
  // rest (cheapest-near-misses) so the bot can say "closest we have".
  if (budget !== null) {
    const inBudget = scored.filter((s) => s.inBudget).map(toHit);
    const rest = hits.filter((h) => !inBudget.some((b) => b.id === h.id));
    return [...inBudget, ...rest].slice(0, limit);
  }

  return hits.slice(0, limit);
}

/** Compact text block handed to OpenRouter — facts only, no editorializing. */
export function productsToContext(hits: ProductHit[]): string {
  if (!hits.length) return "";
  return (
    "PRODUCTS (from the store's live catalog — quote these exactly):\n" +
    hits
      .map(
        (h, i) =>
          `${i + 1}. ${h.name} — ${h.startingPrice}${
            h.discountLabel ? ` (${h.discountLabel})` : ""
          } — ${h.categoryName}${
            h.customizable ? ", customizable" : ""
          }. ${h.description.slice(0, 140)}` +
          (h.materials.length ? ` Materials: ${h.materials.join(", ")}.` : "") +
          (h.features.length ? ` Features: ${h.features.join(", ")}.` : "") +
          (h.variations.length
            ? ` Options: ${h.variations
                .map((v) => `${v.label} ${v.price}`)
                .join("; ")}.`
            : "")
      )
      .join("\n")
  );
}

/** Card payloads for the widget (image/name/price/link), max `limit`. */
export function toProductCards(hits: ProductHit[], limit = 4): ProductCard[] {
  return hits.slice(0, limit).map((h) => ({
    id: h.id,
    name: h.name,
    price: h.startingPrice,
    image: h.image,
    url: h.url,
    relatedUrl: `/shop?category=${encodeURIComponent(h.categoryId)}`,
    relatedLabel: `See more ${h.categoryName}`,
  }));
}

/** Significant (non-stopword) tokens of a query. */
export function significantTokens(query: string): string[] {
  return tokenize(query).filter((t) => !STOPWORDS.has(t) && t.length > 1);
}

/**
 * True when any of the query's significant tokens clearly matches one
 * of the top-ranked hits — by name, material, feature or category
 * (e.g. "plymount" matches photo-frame descriptions, "mommy" matches
 * the Mommy Frames category). Used to decide that a deterministic
 * (no-AI) answer is safe.
 */
export function queryMatchesProduct(
  query: string,
  hits: ProductHit[],
  topN = 3
): boolean {
  const tokens = significantTokens(query);
  if (!tokens.length) return false;
  return hits.slice(0, topN).some((h) => {
    const haystack = new Set([
      ...tokenize(h.name),
      ...h.materials.flatMap(tokenize),
      ...h.features.flatMap(tokenize),
      ...tokenize(h.categoryName),
    ]);
    return tokens.some((t) => haystack.has(t));
  });
}

/**
 * Catalog hits whose names match exactly — used to resolve which
 * products the assistant mentioned in its own reply (the
 * "last recommended" memory), so follow-ups like "අනිත් ඒවා?"
 * or "එකේ price?" point at real items.
 */
export async function findProductsByNames(
  names: string[]
): Promise<ProductHit[]> {
  const { products, categories } = await getShopData();
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  return products
    .filter((p) => wanted.has(p.name.toLowerCase()))
    .map((p) =>
      toHit({
        product: p,
        categoryName: getCategoryPathName(p.categoryId, categories),
        score: 0,
        inBudget: false,
      })
    );
}

/**
 * Catalog products whose names appear anywhere in the text — the
 * fallback when a reply doesn't wrap product names in **bold** (or
 * writes them slightly differently). Only reasonably long names are
 * matched so short generic words can't create false hits.
 */
export async function findMentionedProducts(
  text: string,
  limit = 6
): Promise<ProductHit[]> {
  const { products, categories } = await getShopData();
  const lower = text.toLowerCase();
  const hits: ProductHit[] = [];
  for (const p of products) {
    const name = p.name.toLowerCase();
    if (name.length >= 5 && lower.includes(name)) {
      hits.push(
        toHit({
          product: p,
          categoryName: getCategoryPathName(p.categoryId, categories),
          score: 0,
          inBudget: false,
        })
      );
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

/**
 * Next catalog options beyond the ones already shown — used by the
 * deterministic "අනිත් options?" follow-up. Prefers the category of
 * the last recommendation, then tops up from the general gift pool.
 */
export async function getNextOptions(
  exclude: ProductHit[],
  limit = 3
): Promise<ProductHit[]> {
  if (!exclude.length) return [];
  const excludeIds = new Set(exclude.map((h) => h.id));
  const seenCategory = exclude[0].categoryName;
  const next: ProductHit[] = [];

  if (seenCategory) {
    const inCategory = await searchProducts(seenCategory, 20);
    for (const h of inCategory) {
      if (next.length >= limit) break;
      if (!excludeIds.has(h.id)) next.push(h);
    }
  }
  if (next.length < limit) {
    const broader = await searchProducts("gift", 30);
    for (const h of broader) {
      if (next.length >= limit) break;
      if (!excludeIds.has(h.id) && !next.some((n) => n.id === h.id)) {
        next.push(h);
      }
    }
  }
  return next.slice(0, limit);
}

/** Cheapest priceable product in the whole catalog (null when none). */
export async function cheapestProductPrice(): Promise<number | null> {
  const { products } = await getShopData();
  let cheapest: number | null = null;
  for (const p of products) {
    const prices = [
      parsePrice(p.price),
      ...p.variations.map((v) => parsePrice(v.price)),
    ].filter((n): n is number => n !== null);
    if (prices.length) {
      const min = Math.min(...prices);
      if (cheapest === null || min < cheapest) cheapest = min;
    }
  }
  return cheapest;
}
