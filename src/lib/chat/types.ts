// ============================================================
// CHAT TYPES — shapes the retrieval layer returns and the
// /api/chat route turns into OpenRouter context + widget payloads.
// ============================================================

/** A product the bot can recommend — always from Supabase, never from OpenRouter. */
export interface ProductHit {
  id: string;
  name: string;
  /** Formatted base price, e.g. "Rs. 2,500" */
  price: string;
  /** Numeric base price (null when unpriceable, e.g. "Custom Price") */
  priceNumeric: number | null;
  /** Cheapest option when variations exist: "From Rs. 1,800" */
  startingPrice: string;
  image: string;
  /** Category id used for a filtered related-products link. */
  categoryId: string;
  description: string;
  categoryName: string;
  materials: string[];
  features: string[];
  customizable: boolean;
  badge?: string;
  discountLabel?: string;
  variations: { label: string; price: string }[];
  /** Deep link that opens the product on the shop page. */
  url: string;
}

/** A passage from the site's knowledge base (kb_chunks). */
export interface KnowledgeHit {
  page: string;
  section: string;
  title: string;
  content: string;
  sourceUrl: string;
}

/** Live order status resolved from the Royal Express tracking service. */
export interface TrackingHit {
  found: boolean;
  waybill: string;
  statusName?: string;
  lastUpdated?: string;
  customerName?: string;
  merchant?: string;
  weight?: number;
  cod?: number;
  events: { name: string; dateTime: string; ago?: string }[];
  /** Friendly customer-facing message when the waybill wasn't found. */
  message?: string;
}

/** Store-wide facts the bot may quote verbatim. */
export interface BusinessInfo {
  /** Flat delivery charge in rupees; 0 = free delivery. */
  deliveryCharge: number;
  /** WhatsApp number customers use to order. */
  whatsapp: string;
  signboard: {
    materials: { name: string; ratePerSqft: number; layerPrice: number }[];
    minCharge: number;
    roundTo: number;
  } | null;
}

/** Product card payload sent to the widget for rendering. */
export interface ProductCard {
  id: string;
  name: string;
  price: string;
  image: string;
  url: string;
  relatedUrl: string;
  relatedLabel: string;
}
