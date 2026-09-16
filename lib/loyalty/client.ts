"use client";

/**
 * The browser's side of Bite Club.
 *
 * Two things only: fetch the journey, and remember the phone number so
 * nobody types it twice. Note what is NOT here — no reward logic, no
 * eligibility, no prices. The browser renders what the server says and
 * sends back a phone number, product ids and a reward id; everything that
 * decides money happens on the other side of the wire.
 */
import { useEffect, useSyncExternalStore } from "react";

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

/* ── The journey, fetched once ────────────────────────────
   Four surfaces show the same journey — the hero ticket, the menu ladder,
   the dashboard card and the cart — and every one of them used to ask the
   server for it separately, so a single page load made the same request
   two or three times over.

   They share one store instead. The first caller fetches, everyone else
   joins the request already in flight, and the answer is published to all
   of them at once. It also carries a status, because "we have not asked
   yet" and "they have no Bites" look identical in a snapshot of null and
   must not look identical on screen.
   ───────────────────────────────────────────────────────── */
export type SnapshotStatus = "idle" | "loading" | "ready" | "error";

export type SnapshotState = {
  /** the number this answer is about; "" before anyone has been looked up */
  phone: string;
  status: SnapshotStatus;
  snapshot: LoyaltySnapshot | null;
};

const IDLE: SnapshotState = { phone: "", status: "idle", snapshot: null };

let snapshotState: SnapshotState = IDLE;
const snapshotListeners = new Set<() => void>();
let inFlight: { phone: string; promise: Promise<void> } | null = null;

function publish(next: SnapshotState) {
  snapshotState = next;
  for (const listener of snapshotListeners) listener();
}

export function subscribeSnapshot(listener: () => void) {
  snapshotListeners.add(listener);
  return () => snapshotListeners.delete(listener);
}

export function readSnapshotState(): SnapshotState {
  return snapshotState;
}

/** the server never has an answer, so it always renders the idle state */
export function serverSnapshotState(): SnapshotState {
  return IDLE;
}

/** short of ten digits there is nothing worth asking the server about */
export function isLookupable(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

/** fetch this number's journey unless we already have it, or are getting it */
export function loadSnapshot(phone: string): Promise<void> {
  if (!isLookupable(phone)) return Promise.resolve();
  if (inFlight?.phone === phone) return inFlight.promise;
  if (snapshotState.phone === phone && snapshotState.status === "ready") {
    return Promise.resolve();
  }
  return refreshSnapshot(phone);
}

/**
 * Ask again even though we have an answer — the cart does this every time
 * the drawer opens, because a Bite may have been confirmed at the stall
 * since the page loaded.
 */
export function refreshSnapshot(phone: string): Promise<void> {
  if (!isLookupable(phone)) return Promise.resolve();
  if (inFlight?.phone === phone) return inFlight.promise;

  publish({
    phone,
    status: "loading",
    /* Re-asking about the same number keeps what is on screen: a ladder
       that empties itself while it refreshes is worse than a slightly
       stale one. A different number starts from nothing. */
    snapshot: snapshotState.phone === phone ? snapshotState.snapshot : null,
  });

  const promise = fetchSnapshot(phone)
    .then((data) => publish({ phone, status: "ready", snapshot: data }))
    .catch(() => publish({ phone, status: "error", snapshot: null }))
    .finally(() => {
      if (inFlight?.phone === phone) inFlight = null;
    });

  inFlight = { phone, promise };
  return promise;
}

/** an order was just placed and the server handed back the new journey */
export function putSnapshot(phone: string, snapshot: LoyaltySnapshot) {
  publish({ phone, status: "ready", snapshot });
}

/**
 * The shared journey for one number.
 *
 * Returns `loading` — never a confident zero — while the answer is on its
 * way, so a customer on their 4th Bite is never shown as being on their
 * 1st for the length of a request.
 */
export function useLoyalty(phone: string): SnapshotState {
  const state = useSyncExternalStore(
    subscribeSnapshot,
    readSnapshotState,
    serverSnapshotState,
  );

  useEffect(() => {
    void loadSnapshot(phone);
  }, [phone]);

  /* An answer about a different number is not this component's answer. */
  if (state.phone === phone) return state;

  return {
    phone,
    status: isLookupable(phone) ? "loading" : "idle",
    snapshot: null,
  };
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
