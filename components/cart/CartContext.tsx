"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { findBowl, priceCart, type CartLine } from "@/lib/pricing";
import { reorderQtys, type StoredOrder } from "@/lib/orders";
import * as store from "@/lib/cart-store";

type Qtys = Record<string, number>;

type CartApi = {
  qtys: Qtys;
  lines: CartLine[];
  pricing: ReturnType<typeof priceCart>;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  name: string;
  setName: (v: string) => void;
  /** past orders from this device, newest first */
  orders: StoredOrder[];
  /** call when the order leaves for WhatsApp: files it and empties the cart */
  placeOrder: () => void;
  /** put a past order back in the cart */
  reorder: (order: StoredOrder) => void;
  /** the welcome gift, taken from the hero and waiting at checkout */
  offerClaimed: boolean;
  claimOffer: () => void;
  releaseOffer: () => void;
};

const Ctx = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  /* The cart and the order history live in localStorage, so a refresh — or a
     trip to WhatsApp and back — does not empty them. lib/cart-store.ts owns
     that; this provider is the React face of it. */
  const { qtys, name, orders, offerClaimed } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  // the drawer is view state, not cart state: it should never reopen on reload
  const [open, setOpen] = useState(false);

  const lines = useMemo<CartLine[]>(
    () =>
      Object.entries(qtys)
        .map(([id, qty]) => {
          const found = findBowl(id);
          return found ? { ...found, qty } : null;
        })
        .filter((l): l is CartLine => l !== null),
    [qtys],
  );

  const pricing = useMemo(() => priceCart(lines), [lines]);

  const placeOrder = useCallback(() => {
    if (lines.length === 0) return;
    store.placeOrder(lines, name);
  }, [lines, name]);

  const reorder = useCallback((order: StoredOrder) => {
    store.reorder(reorderQtys(order));
  }, []);

  const value = useMemo(
    () => ({
      qtys,
      lines,
      pricing,
      open,
      setOpen,
      add: store.addItem,
      setQty: store.setItemQty,
      clear: store.clearCart,
      name,
      setName: store.setName,
      orders,
      placeOrder,
      reorder,
      offerClaimed,
      claimOffer: store.claimOffer,
      releaseOffer: store.releaseOffer,
    }),
    [qtys, lines, pricing, open, name, orders, placeOrder, reorder, offerClaimed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
