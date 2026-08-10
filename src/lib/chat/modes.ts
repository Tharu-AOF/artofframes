// ============================================================
// CHAT MODES — deterministic conversation-mode classifier.
// Every message is classified BEFORE any AI call so the reply
// shape (and the retrieval feeding it) matches what the customer
// actually wants: browsing categories, discovering gifts,
// comparing items, asking about one product, requesting a quote,
// ordering help, or support. The mode is passed to the model as
// an instruction and returned to the widget so it can render
// contextual actions.
// ============================================================

import { extractWaybill, isTrackingIntent } from "@/lib/chat/tracking";
import type { CustomerState } from "@/lib/chat/state";

export type ChatMode =
  | "track"
  | "greeting"
  | "order"
  | "quote"
  | "compare"
  | "support"
  | "detail"
  | "discover"
  | "browse"
  | "smalltalk";

// ─── Shared patterns (also imported by the deterministic path) ──────────────

/** "12 x 18" / "12x18" — a size query (never a budget). */
export const SIZE_PATTERN = /\d+\s*[xX×]\s*\d+/;

/** Explicitly asking HOW to order/buy — steps, never a sales pitch. */
export const ORDER_PATTERN =
  /how (do|to|can) (i )?(order|buy|purchase)|how (do )?i order|order (karanna|karanne|kohomada|kohomad|ekak danna)|buy karanna|මම order කරන්න|order කරන්න ඕන|order ekak|cart eken (order|buy)|place an order/i;

/** Custom size / design / quote requests — made-to-order, WhatsApp quote. */
export const QUOTE_PATTERN =
  /custom (quote|size|design)|quote (ekak|එකක්|karanna)|specific size|size (ekak|එකක්|awan)?|sizes? tiyenawada|customize|පුද්ගලික|මටම වෙනස්|made ?to ?order/i;

/** Comparing two or more products. */
export const COMPARE_PATTERN =
  /(compare|comparison|difference|which (is|one)|which is better|which better|better between|between (the|these|this)|මේ දෙකෙන්|දෙකෙන්|මොකක්ද හොඳ|මොකක්ද වඩා හොඳ|කවුද හොඳ|hondama|kawada|kenekda hondda|better)/i;

/** "Show me other / more options" — follow-up to a recommendation. */
export const OTHER_OPTIONS_PATTERN =
  /(අනිත්|අනික්|අනිකුත්|වෙනත්|ඊට වඩා|other|others|more options|any more|anything else|අනිත් ඒවා|options tiyenawada|options තියෙනවද|different)/i;

/**
 * "එකේ price?" / "that one?" — a pronoun pointing at the last item.
 * Only the "ක" forms and explicit "that one"-style phrases: bare
 * vowels (ඒ/එ) or bare "it/that" would misfire on "ඒත්", "ඒ නිසා",
 * "it's a good price" etc.
 */
export const PRONOUN_PATTERN =
  /^(එක|ඒක|එකේ|ඒකේ|එකෙ|ඒකෙ|that one|this one|the first|the second|first one|second one|1st|2nd)/i;

/** "What do you have" — open-ended browse. */
export const BROWSE_PATTERN =
  /(මොනවද තියෙනවා|මොනවද තියෙන්නේ|මොනවද තියෙන දේවල්|what do you have|what products|what do you sell|products තියෙනවද|products මොනවද)/i;

/** Price / existence / budget / recommendation words — product intent. */
export const PRICE_WORD =
  /(කීයද|කීය|price|prices|how much|cost|වටිනවද|ගන්න පුළුවන්ද|kiyada|kiyadd|kiyad)/i;
export const EXISTENCE_WORD =
  /(තියෙනවද|තියෙනවා|ඇතිද|do you have|have you|got any|you have|sell|විකුණනවද|හදනවද|thiyenawada|thiyenawa|thiyenavad|tiyenawada)/i;
const DISCOVER_WORD =
  /(gift|gifts|birthday|valentine|anniversary|wedding|තෑගි|ගිෆ්ට්|උපන්දින|වැලන්ටයින්|සංවත්සර|මංගල|විවාහ|recommend|suggest|මොනවද හොඳ|හොඳම|ඕන|ඕනෙ|ඇතුලත|අඩුවෙන්|athulath|budget)/i;
const SUPPORT_WORD =
  /(delivery|shipping|කුරියර්|ඩිලිවරි|policy|policies|warranty|return|exchange|care|clean|refund|payment|how long|lead time|track|waybill)/i;
const GREETING_WORD =
  /^(hi|hii+|hello|hey|yo|good (morning|afternoon|evening)|ආයුබෝවන්|හලෝ|කොහොමද|kohomada|kohomad|kohomade|how (are|r) you)/i;
const HUMAN_WORD =
  /(human|person|agent|support|speak to|talk to|call (you|me)|කෙනෙක්|සපෝට්|හියුමන්)/i;

/** Classify the current message into a conversation mode. */
export function detectMode(
  message: string,
  state?: Pick<CustomerState, "lastRecommended"> | null
): ChatMode {
  if (isTrackingIntent(message) || extractWaybill(message)) return "track";
  if (message.length <= 40 && GREETING_WORD.test(message)) return "greeting";
  if (message.length <= 80 && HUMAN_WORD.test(message)) return "support";
  if (ORDER_PATTERN.test(message)) return "order";
  if (SIZE_PATTERN.test(message) || QUOTE_PATTERN.test(message)) return "quote";

  // "අනිත් options?" is a continuation of product discovery — checked
  // before compare so "ඊට වඩා හොඳ" (better than that) classifies the
  // same way the deterministic path answers it.
  if (OTHER_OPTIONS_PATTERN.test(message)) return "discover";

  if (COMPARE_PATTERN.test(message)) {
    // Compare needs two items to act on — without them it's still a
    // compare-style ask, so keep the mode (retrieval resolves items).
    return "compare";
  }

  // Delivery / policy / warranty / return questions are support —
  // checked before product intent so "delivery කීයද" isn't treated
  // as a product-detail ask.
  if (SUPPORT_WORD.test(message)) return "support";

  // "මොනවද තියෙනවා" is open-ended browsing, not a product detail
  // ask — must win over the generic existence-word check below.
  if (BROWSE_PATTERN.test(message)) return "browse";

  // Gratitude and tiny acknowledgements are small talk, not a follow-up
  // on the last recommended product.
  if (message.length <= 40 && /(thank|thanks|sthooti|ස්තූතියි|තැන්ක්ස්)/i.test(message)) {
    return "smalltalk";
  }

  const lastRecommended = state?.lastRecommended?.length ?? 0;
  const priceOrExists = PRICE_WORD.test(message) || EXISTENCE_WORD.test(message);
  // A price/existence ask, or a SHORT referential follow-up after a
  // recommendation ("එකේ price?", "ඒක?"), is a product-detail ask.
  const shortFollowUp = lastRecommended > 0 && message.trim().length <= 30;
  if (priceOrExists || shortFollowUp) return "detail";

  if (DISCOVER_WORD.test(message)) return "discover";
  return "smalltalk";
}

/** Short instruction block telling the model how to shape a reply per mode. */
export function modeToInstruction(mode: ChatMode): string {
  switch (mode) {
    case "track":
      return "MODE: ORDER TRACKING — report the waybill status from the CONTEXT only.";
    case "greeting":
      return "MODE: GREETING — welcome them and ask what they need.";
    case "order":
      return "MODE: ORDER HELP — the customer asked how to order. Explain the steps: open the item on the shop page → add to cart → use the cart's WhatsApp checkout. Custom sizes go via WhatsApp. No other selling.";
    case "quote":
      return "MODE: CUSTOM QUOTE — do NOT list catalog products. Everything is made to order; collect the size/design they need, then point them to WhatsApp for an exact quote.";
    case "compare":
      return "MODE: COMPARE — compare only the specific products discussed (2–3 max): price, materials, and what each is best for. End with [[PRODUCTS:…]] listing the compared items.";
    case "support":
      return "MODE: SUPPORT — answer from the BUSINESS FACTS and WEBSITE KNOWLEDGE in the CONTEXT; for tracking use the order status shown.";
    case "detail":
      return "MODE: PRODUCT DETAIL — answer about the one specific product named: exact price, materials, and options from the PRODUCTS list. End with [[PRODUCTS:1]] when you name it.";
    case "discover":
      return "MODE: DISCOVER — recommend 2–4 relevant products and briefly say why the best 1–2 fit. End with [[PRODUCTS:…]] for the ones you recommend.";
    case "browse":
      return "MODE: BROWSE — outline the product categories (frames, keytags, clocks, wall art, sign boards, hotel items…) and ask ONE question about what they're looking for.";
    case "smalltalk":
      return "MODE: SMALL TALK — respond briefly and warmly, then steer back to the business.";
    default:
      return "";
  }
}
