// ============================================================
// CART STORE — client-side cart persisted to localStorage.
//
// Each line keeps the identity (productId + variantId + qty)
// PLUS a lightweight display snapshot (name, image, unit price)
// captured at add time. The snapshot powers the navbar cart
// drawer, which must render instantly on every page without a
// data fetch; the /cart page re-resolves each line against the
// live product data, so admin edits (prices, discounts,
// deactivations) are always reflected there.
//
// It is an external store read through useSyncExternalStore, so
// the navbar badge, the drawer and the cart page re-render on
// every change without any setState-in-effect (which this
// project's ESLint config forbids), and SSR hydrates cleanly
// (server sees the empty state).
// ============================================================

import { useSyncExternalStore } from "react";

/** Display fields captured when the item is added to the cart. */
export interface CartLineSnapshot {
  name: string;
  image: string;
  alt: string;
  /** Selected option label (e.g. "Large 18in") or null for the base product. */
  variantLabel: string | null;
  /** Effective unit price label, e.g. "Rs. 1,050". */
  unitLabel: string;
  /** Original (pre-discount) price label, or null when not on sale. */
  wasLabel: string | null;
  /** Numeric unit price for subtotal math (parsePrice of unitLabel). */
  unit: number;
}

/** One cart line — identity + display snapshot + quantity. */
export interface CartLine extends CartLineSnapshot {
  productId: string;
  variantId: string | null;
  qty: number;
}

const STORAGE_KEY = "aof-cart-v2";
const MAX_QTY = 99;

/** Stable line key — merges same product + same option. */
export const lineKey = (productId: string, variantId: string | null) =>
  `${productId}::${variantId ?? "base"}`;

// ─── Tiny external store ────────────────────────────────────────────────────

const listeners = new Set<() => void>();
let snapshot: CartLine[] | null = null;
// Stable reference for SSR — React's useSyncExternalStore expects
// the server snapshot to be a cached value, not a fresh array.
const EMPTY: CartLine[] = [];

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCartSnapshot(): CartLine[] {
  if (snapshot) return snapshot;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    snapshot = Array.isArray(parsed) ? parsed : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function commit(next: CartLine[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota) — cart still works
    // for this session, it just won't survive a reload.
  }
  listeners.forEach((fn) => fn());
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export interface AddToCartInput extends CartLineSnapshot {
  productId: string;
  variantId: string | null;
  qty: number;
}

export function addToCart(input: AddToCartInput) {
  const amount = Math.max(1, Math.min(MAX_QTY, input.qty));
  const { productId, variantId } = input;
  const current = getCartSnapshot();
  const idx = current.findIndex(
    (l) => l.productId === productId && l.variantId === variantId
  );
  if (idx === -1) {
    commit([...current, { ...input, qty: amount }]);
    return;
  }
  // Merge into the existing line, but adopt the NEW snapshot — a
  // price/name change between two adds of the same line should
  // surface the latest info.
  const next = [...current];
  next[idx] = { ...input, qty: Math.min(MAX_QTY, next[idx].qty + amount) };
  commit(next);
}

export function setLineQty(
  productId: string,
  variantId: string | null,
  qty: number
) {
  if (qty <= 0) {
    removeLine(productId, variantId);
    return;
  }
  const amount = Math.min(MAX_QTY, qty);
  const current = getCartSnapshot();
  const next = current.map((l) =>
    l.productId === productId && l.variantId === variantId
      ? { ...l, qty: amount }
      : l
  );
  commit(next);
}

export function removeLine(productId: string, variantId: string | null) {
  const current = getCartSnapshot();
  commit(
    current.filter(
      (l) => !(l.productId === productId && l.variantId === variantId)
    )
  );
}

export function clearCart() {
  commit([]);
}

// ─── Drawer open state (lives in the store so any component can
//     open the drawer — e.g. the shop's "View Cart" toast) ────────

let drawerOpen = false;

export function getCartDrawerOpen(): boolean {
  return drawerOpen;
}

export function openCartDrawer() {
  drawerOpen = true;
  listeners.forEach((fn) => fn());
}

export function closeCartDrawer() {
  drawerOpen = false;
  listeners.forEach((fn) => fn());
}

export function toggleCartDrawer() {
  drawerOpen = !drawerOpen;
  listeners.forEach((fn) => fn());
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

// The SERVER snapshot must be a static empty array: during hydration
// React renders the client tree with this value to match the server
// HTML (which never sees localStorage). Passing getCartSnapshot here
// would read localStorage on the client during hydration and cause a
// server/client markup mismatch. After hydration React re-renders
// with the real snapshot automatically.
const getServerCartSnapshot = (): CartLine[] => EMPTY;

export function useCartLines(): CartLine[] {
  return useSyncExternalStore(subscribe, getCartSnapshot, getServerCartSnapshot);
}

export function useCartCount(): number {
  const lines = useCartLines();
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function useCartDrawerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    getCartDrawerOpen,
    () => false
  );
}
