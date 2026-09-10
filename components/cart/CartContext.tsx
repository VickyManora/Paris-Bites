"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { findBowl, priceCart, type CartLine } from "@/lib/pricing";

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
};

const Ctx = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [qtys, setQtys] = useState<Qtys>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const add = useCallback((id: string) => {
    setQtys((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setQtys((q) => {
      const next = { ...q };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  const clear = useCallback(() => setQtys({}), []);

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

  const value = useMemo(
    () => ({ qtys, lines, pricing, open, setOpen, add, setQty, clear, name, setName }),
    [qtys, lines, pricing, open, add, setQty, clear, name],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
