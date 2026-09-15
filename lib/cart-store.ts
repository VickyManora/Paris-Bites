/**
 * The cart as an external store, so it can be restored from localStorage
 * without a hydration mismatch.
 *
 * The obvious version of "remember the cart" — read storage in an effect and
 * call setState — makes React render once with an empty cart before the real
 * one arrives, and trips the set-state-in-effect rule besides. This is the
 * pattern React provides instead: the module reads storage once, on the
 * client, before hydration; `getServerSnapshot` hands the server (and the
 * hydrating pass) an empty cart, and React swaps in the stored one itself.
 *
 * Snapshots are immutable and replaced wholesale, because useSyncExternalStore
 * compares them by reference — mutating the object in place would notify
 * subscribers of a change they cannot see.
 */
import { loadCart, loadOrders, recordOrder, saveCart, type StoredOrder } from "./orders";
import { type CartLine } from "./pricing";

export type CartState = {
  qtys: Record<string, number>;
  name: string;
  orders: StoredOrder[];
  /** the welcome gift, taken from the hero and waiting at checkout */
  offerClaimed: boolean;
};

/** what the server renders, and what the client hydrates against */
const EMPTY: CartState = Object.freeze({ qtys: {}, name: "", orders: [], offerClaimed: false });

const listeners = new Set<() => void>();

/* On the client this runs before hydration, so the first client snapshot
   already has the stored cart in it. On the server it is the empty one. */
let state: CartState =
  typeof window === "undefined"
    ? EMPTY
    : { ...loadCart(), orders: loadOrders() };

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartState {
  return state;
}

export function getServerSnapshot(): CartState {
  return EMPTY;
}

/** replace the state, persist the cart, and tell React */
function set(next: CartState, persist = true) {
  state = next;
  if (persist)
    saveCart({ qtys: next.qtys, name: next.name, offerClaimed: next.offerClaimed });
  emit();
}

export function addItem(id: string) {
  set({ ...state, qtys: { ...state.qtys, [id]: (state.qtys[id] ?? 0) + 1 } });
}

export function setItemQty(id: string, qty: number) {
  const qtys = { ...state.qtys };
  if (qty <= 0) delete qtys[id];
  else qtys[id] = Math.min(Math.floor(qty), 99);
  set({ ...state, qtys });
}

export function setName(name: string) {
  set({ ...state, name });
}

export function clearCart() {
  set({ ...state, qtys: {} });
}

/**
 * Take the welcome gift, or hand it back.
 *
 * Claiming is idempotent on purpose: the hero ticket, the cart panel and a
 * second tap on either all mean the same thing, and none of them is allowed
 * to mean "twice". Whether the gift is actually owed is the server's call.
 */
export function claimOffer() {
  if (state.offerClaimed) return;
  set({ ...state, offerClaimed: true });
}

export function releaseOffer() {
  if (!state.offerClaimed) return;
  set({ ...state, offerClaimed: false });
}

/**
 * Sent, not confirmed. The customer still has to press send in WhatsApp and
 * the shop still has to reply, so this records what left the site and nothing
 * more. The cart is emptied because keeping it would put the same order back
 * in front of someone who has just sent it.
 */
export function placeOrder(lines: CartLine[], name: string) {
  const orders = recordOrder(lines, name);
  /* The gift went out with the order, so the claim goes with it. Leaving it
     set would show the next cart a discount the server would refuse. */
  set({ ...state, qtys: {}, orders, offerClaimed: false });
}

export function reorder(qtys: Record<string, number>) {
  set({ ...state, qtys });
}
