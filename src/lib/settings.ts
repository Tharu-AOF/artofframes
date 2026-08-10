// ============================================================
// SETTINGS — store-wide configuration shared by the shop
// (server reads) and the admin panel (client reads/writes).
// Values live in the `settings` table as JSON under a fixed key.
// ============================================================

/** Row key in the `settings` table holding delivery configuration. */
export const DELIVERY_SETTINGS_KEY = "delivery";

export interface ShopSettings {
  /** Flat delivery charge in rupees per order. 0 = free delivery. */
  deliveryCharge: number;
}

export const DEFAULT_SETTINGS: ShopSettings = { deliveryCharge: 0 };

/** Coerce an unknown stored value into a valid ShopSettings object. */
export const normalizeSettings = (raw: unknown): ShopSettings => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const charge =
    typeof obj.deliveryCharge === "number" && Number.isFinite(obj.deliveryCharge)
      ? Math.max(0, Math.round(obj.deliveryCharge))
      : 0;
  return { deliveryCharge: charge };
};

// ── Sign board pricing (admin "Sign Boards" page) ─────────────

/** Row key in the `settings` table holding sign board pricing. */
export const SIGNBOARD_SETTINGS_KEY = "signboard";

/** One selectable sign board material with its own per-sq-ft rate. */
export interface SignboardMaterial {
  id: string;
  name: string;
  ratePerSqft: number;
  /** Fee per extra layer per sq ft (2nd onwards); 0 = none. The first layer is free. */
  layerPrice: number;
}

export interface SignboardSettings {
  /** Materials the calculator offers, each with its own per-sq-ft rate and layer fee. */
  materials: SignboardMaterial[];
  /** Minimum estimate regardless of size (0 = none). */
  minCharge: number;
  /** Round the estimate to the nearest multiple (1 = no rounding). */
  roundTo: number;
}

export const DEFAULT_SIGNBOARD_SETTINGS: SignboardSettings = {
  materials: [
    { id: "standard", name: "Standard", ratePerSqft: 1500, layerPrice: 0 },
  ],
  minCharge: 0,
  roundTo: 50,
};

const toNonNegative = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback;

/** Coerce an unknown stored value into a valid SignboardSettings object. */
export const normalizeSignboardSettings = (raw: unknown): SignboardSettings => {
  const out: SignboardSettings = {
    materials: [],
    minCharge: 0,
    roundTo: DEFAULT_SIGNBOARD_SETTINGS.roundTo,
  };
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SIGNBOARD_SETTINGS };
  const obj = raw as Record<string, unknown>;

  // Legacy shape had a single store-wide layer fee; carry it into each
  // material so existing admin pricing survives the per-material move.
  const legacyLayerPrice = toNonNegative(obj.layerPrice, 0);

  if (Array.isArray(obj.materials) && obj.materials.length) {
    out.materials = obj.materials
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m, i) => ({
        id: typeof m.id === "string" && m.id ? m.id : `material-${i + 1}`,
        name:
          typeof m.name === "string" && m.name.trim() ? m.name.trim() : "Material",
        ratePerSqft: toNonNegative(m.ratePerSqft, 0),
        layerPrice: toNonNegative(m.layerPrice, legacyLayerPrice),
      }))
      .filter((m) => m.ratePerSqft > 0);
  } else if (toNonNegative(obj.ratePerSqft, 0) > 0) {
    // Legacy single-rate shape ({ ratePerSqft }) → one material.
    out.materials = [
      {
        id: "standard",
        name: "Standard",
        ratePerSqft: toNonNegative(obj.ratePerSqft, 1500),
        layerPrice: legacyLayerPrice,
      },
    ];
  }
  if (!out.materials.length) out.materials = [...DEFAULT_SIGNBOARD_SETTINGS.materials];

  out.minCharge = toNonNegative(obj.minCharge, 0);
  const roundTo = toNonNegative(obj.roundTo, DEFAULT_SIGNBOARD_SETTINGS.roundTo);
  out.roundTo = roundTo >= 1 ? roundTo : DEFAULT_SIGNBOARD_SETTINGS.roundTo;
  return out;
};
