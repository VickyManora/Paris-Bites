/**
 * ─────────────────────────────────────────────────────────────
 *  THE CART AND THE ORDER HISTORY, ON THIS DEVICE ONLY.
 *
 *  There is no backend: an order leaves the site as a WhatsApp
 *  message the customer sends themselves. So "your last order" can
 *  only mean the last order this browser composed — it is not a
 *  record of what the cart actually received or served, and it does
 *  not follow the customer to another phone.
 *
 *  Everything here is therefore best-effort. Storage can be full,
 *  disabled, or a private window that throws on access, and none of
 *  that may break the cart: every read returns a safe empty value and
 *  every write is allowed to fail silently.
 * ─────────────────────────────────────────────────────────────
 */
import { findBowl, priceCart, type CartLine } from "./pricing";

const CART_KEY = "paris-bites:cart:v1";
const ORDERS_KEY = "paris-bites:orders:v1";

/** how many past orders to keep; the UI shows the most recent one */
const HISTORY_LIMIT = 5;

export type StoredCart = {
  qtys: Record<string, number>;
  name: string;
  /**
   * Whether the customer has taken the welcome gift from the hero.
   *
   * An intention, not a discount. It rides along with the cart so a claim
   * made on the first screen is still there at checkout — and survives the
   * refresh, the closed tab and the trip to WhatsApp and back. The server
   * grants and prices the actual 20%; this only remembers that they asked.
   */
  offerClaimed: boolean;
};

export type StoredOrder = {
  /** epoch ms, for display only */
  at: number;
  name: string;
  items: { id: string; name: string; qty: number; price: number }[];
  total: number;
  saved: number;
};

const empty: StoredCart = { qtys: {}, name: "", offerClaimed: false };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode, or the quota is full — the cart still works in memory
  }
}

/**
 * The saved cart, validated against today's menu.
 *
 * Ids are dropped if they no longer exist and quantities are clamped to
 * whole numbers in a sane range: the stored blob is user-editable and can
 * also be months old, so a bowl that has been taken off the menu — or a
 * hand-typed quantity of 10,000 — must not reach the cart.
 */
export function loadCart(): StoredCart {
  const stored = read<Partial<StoredCart>>(CART_KEY, empty);
  const qtys: Record<string, number> = {};

  for (const [id, qty] of Object.entries(stored.qtys ?? {})) {
    if (!findBowl(id)) continue;
    const n = Math.floor(Number(qty));
    if (Number.isFinite(n) && n > 0) qtys[id] = Math.min(n, 99);
  }

  return {
    qtys,
    name: typeof stored.name === "string" ? stored.name.slice(0, 80) : "",
    offerClaimed: stored.offerClaimed === true,
  };
}

export function saveCart(cart: StoredCart) {
  write(CART_KEY, cart);
}

export function loadOrders(): StoredOrder[] {
  const stored = read<StoredOrder[]>(ORDERS_KEY, []);
  if (!Array.isArray(stored)) return [];

  return stored
    .filter(
      (o): o is StoredOrder =>
        !!o && typeof o.at === "number" && Array.isArray(o.items) && typeof o.total === "number",
    )
    .slice(0, HISTORY_LIMIT);
}

/** record what was just sent, newest first, and return the new history */
export function recordOrder(lines: CartLine[], name: string): StoredOrder[] {
  const priced = priceCart(lines);
  if (priced.count === 0) return loadOrders();

  const order: StoredOrder = {
    at: Date.now(),
    name: name.trim(),
    items: lines
      .filter((l) => l.qty > 0)
      .map((l) => ({ id: l.bowl.id, name: l.bowl.name, qty: l.qty, price: l.bowl.price })),
    total: priced.total,
    saved: priced.totalSaved,
  };

  const next = [order, ...loadOrders()].slice(0, HISTORY_LIMIT);
  write(ORDERS_KEY, next);
  return next;
}

/** the items of a past order that are still on the menu, as cart quantities */
export function reorderQtys(order: StoredOrder): Record<string, number> {
  const qtys: Record<string, number> = {};
  for (const item of order.items) {
    if (findBowl(item.id)) qtys[item.id] = item.qty;
  }
  return qtys;
}

/** "13 Sep, 9:12 PM" — the date is only ever shown, never parsed back */
export function formatOrderDate(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
