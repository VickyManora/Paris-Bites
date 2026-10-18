/**
 * EVENT MODE — the order book for a one-day event stall.
 *
 * One person, one device, taking orders at the counter. No phone number, no
 * WhatsApp, no Bite Club: an order is a name, what they ordered and what it
 * costs, plus two ticks — paid, and handed over.
 *
 * Kept in localStorage on the device taking orders, as an external store so
 * React reads it without a hydration mismatch (same pattern as cart-store).
 */
import { itemLabel, priceCart, type CartLine } from "./pricing";
import { isMini } from "./product-id";

/** like itemLabel, but the Full size is named too, so every line says which size to make */
export function eventLabel(id: string, fallback?: string) {
  const label = itemLabel(id, fallback);
  return isMini(id) || label.endsWith("· Full") ? label : `${label} · Full`;
}

const KEY = "paris-bites:event-orders:v1";

export type EventOrder = {
  id: string;
  /** running number for the day, called out at handover */
  no: number;
  at: number;
  name: string;
  items: { id: string; label: string; qty: number; price: number }[];
  total: number;
  paid: boolean;
  handedOver: boolean;
};

const EMPTY: EventOrder[] = [];
const listeners = new Set<() => void>();

function load(): EventOrder[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let state: EventOrder[] = typeof window === "undefined" ? EMPTY : load();

function set(next: EventOrder[]) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked — the list still works until a reload
  }
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => state;
export const getServerSnapshot = () => EMPTY;

/**
 * File the cart as an order, newest first — or, with `replaceId`, rewrite
 * that order in place, keeping its number, time and ticks.
 */
export function addOrder(lines: CartLine[], name: string, replaceId?: string): EventOrder | undefined {
  const live = lines.filter((l) => l.qty > 0);
  if (live.length === 0) return;
  const body = {
    name: name.trim(),
    items: live.map((l) => ({
      id: l.bowl.id,
      label: eventLabel(l.bowl.id),
      qty: l.qty,
      price: l.bowl.price,
    })),
    total: priceCart(live).total,
  };

  const existing = replaceId ? state.find((o) => o.id === replaceId) : undefined;
  if (existing) {
    const updated = { ...existing, ...body };
    set(state.map((o) => (o.id === existing.id ? updated : o)));
    return updated;
  }

  const order: EventOrder = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    no: nextNo(),
    at: Date.now(),
    ...body,
    paid: false,
    handedOver: false,
  };
  set([order, ...state]);
  return order;
}

/** the number the next new order will get */
export function nextNo() {
  return state.reduce((max, o) => Math.max(max, o.no), 0) + 1;
}

/** clear the book for a fresh day; numbering restarts at #1 */
export function resetDay() {
  set([]);
}

export function toggle(id: string, field: "paid" | "handedOver") {
  set(state.map((o) => (o.id === id ? { ...o, [field]: !o[field] } : o)));
}

export function removeOrder(id: string) {
  set(state.filter((o) => o.id !== id));
}
