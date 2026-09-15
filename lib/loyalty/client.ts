/**
 * The browser's side of Bite Club.
 *
 * Two things only: fetch the journey, and remember the phone number so
 * nobody types it twice. Note what is NOT here — no reward logic, no
 * eligibility, no prices. The browser renders what the server says and
 * sends back a phone number, product ids and a reward id; everything that
 * decides money happens on the other side of the wire.
 */
import type { LoyaltySnapshot } from "./service-types";

export type { LoyaltySnapshot };

const PHONE_KEY = "paris-bites:phone:v1";

/* The remembered number is an external store rather than state loaded in an
   effect — the same shape as lib/cart-store.ts, and for the same reason: read
   in an effect it would render an empty field for one frame, and every
   component holding it would need its own copy to keep in sync. */
function readPhone(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

let phoneSnapshot = readPhone();
const phoneListeners = new Set<() => void>();

export function subscribePhone(listener: () => void) {
  phoneListeners.add(listener);
  return () => phoneListeners.delete(listener);
}

/** the number this browser last ordered with, if any */
export function rememberedPhone(): string {
  return phoneSnapshot;
}

/** the server has no localStorage, so it always renders an empty field */
export function serverPhone(): string {
  return "";
}

export function rememberPhone(phone: string) {
  phoneSnapshot = phone;

  if (typeof window !== "undefined") {
    try {
      if (phone) window.localStorage.setItem(PHONE_KEY, phone);
      else window.localStorage.removeItem(PHONE_KEY);
    } catch {
      // private mode: the customer types it again, nothing else breaks
    }
  }

  for (const listener of phoneListeners) listener();
}

export async function fetchSnapshot(phone: string): Promise<LoyaltySnapshot> {
  const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(phone)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not load loyalty status");
  return (await res.json()) as LoyaltySnapshot;
}

export type PlacedOrder = {
  ok: true;
  code: string;
  total: number;
  whatsappUrl: string;
  snapshot: LoyaltySnapshot;
};

export async function submitOrder(body: {
  phone: string;
  name: string;
  items: { id: string; qty: number }[];
  rewardId?: string | null;
  productId?: string | null;
}): Promise<PlacedOrder | { ok: false; error: string }> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as PlacedOrder | { ok: false; error: string };
}
