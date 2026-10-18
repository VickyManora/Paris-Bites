"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";

import { menu, waffles, type Bowl } from "@/lib/content";
import { productId, type Size } from "@/lib/product-id";
import * as book from "@/lib/event-orders";
import * as cartStore from "@/lib/cart-store";
import { useCart } from "../cart/CartContext";
import { ProductThumb } from "../product/ProductThumb";

/**
 * EVENT MODE — a till for one person on a phone.
 *
 * Tap a tile to add it, −/+ to adjust, type a name, Place. Nothing here
 * touches the network: the cart and the order book both live in
 * localStorage, so a weak signal can never hold up the queue.
 */
const sections: { id: string; title: string; items: Bowl[] }[] = [
  { id: "bowls", title: "Bowls", items: menu.categories.flatMap((c): Bowl[] => [...c.items]) },
  { id: "waffles", title: "Waffles", items: waffles.category.items },
];

export function EventDesk() {
  const { qtys, add, setQty, lines, pricing, name, setName, clear } = useCart();
  const [size, setSize] = useState<Size>("mini");
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  /** the order being changed, while its items sit in the cart */
  const [editing, setEditing] = useState<book.EventOrder | null>(null);
  const orders = useSyncExternalStore(book.subscribe, book.getSnapshot, book.getServerSnapshot);
  const pending = orders.filter((o) => !o.handedOver).length;

  useEffect(() => {
    if (!toast) return;
    // long enough to reach Undo, short enough to be gone before the next order
    const t = setTimeout(() => setToast(null), toast.undo ? 5000 : 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useKeepAwake();

  const reset = () => {
    clear();
    setName("");
    setSize("mini");
    setEditing(null);
    setCartOpen(false);
    // blur so the keyboard drops and the grid is back in view
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0 });
  };

  const place = () => {
    if (lines.length === 0) return;
    const no = editing?.no ?? book.nextNo();
    const who = name.trim() || `Customer ${no}`;
    const total = `${menu.currency}${pricing.total}`;

    if (editing) {
      book.addOrder(lines, who, editing.id);
      setToast({ text: `Updated #${no} ${who} · ${total}` });
    } else {
      const order = book.addOrder(lines, who);
      const keptQtys = qtys;
      const keptName = name;
      setToast({
        text: `Placed #${no} ${who} · ${total}`,
        // take the order back and put it in the cart again, as it was
        undo: order
          ? () => {
              book.removeOrder(order.id);
              cartStore.reorder(keptQtys);
              setName(keptName);
              setToast(null);
            }
          : undefined,
      });
    }
    reset();
  };

  const startEdit = (o: book.EventOrder) => {
    if (pricing.count > 0 && !editing && !confirm("The cart has items in it. Replace them with this order?"))
      return;
    cartStore.reorder(Object.fromEntries(o.items.map((i) => [i.id, i.qty])));
    setName(o.name);
    setEditing(o);
    // an Undo still on screen belongs to another order — never let it fire mid-edit
    setToast(null);
    setOrdersOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <header className="safe-top fixed inset-x-0 top-0 z-50 border-b border-ink-900/8 bg-cream-50/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full bg-cream-200 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-ink-700"
            >
              {s.title}
            </a>
          ))}

          {/* the size every tap adds; Mini unless switched */}
          <div className="ml-auto flex rounded-full bg-cream-200 p-0.5">
            {(["mini", "full"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                  size === s ? "bg-ink-900 text-cream-50" : "text-ink-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOrdersOpen(true)}
            className="relative rounded-full border border-ink-900/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-700"
          >
            Orders
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gold-600 text-[0.65rem] text-white">
                {pending}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 pb-44 pt-16">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-16 pt-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {s.title}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {s.items.map((item) => {
                const id = productId(item.id, size);
                const qty = qtys[id] ?? 0;
                const other = qtys[productId(item.id, size === "mini" ? "full" : "mini")] ?? 0;
                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col rounded-xl border bg-white ${
                      qty > 0 ? "border-gold-500 ring-2 ring-gold-500/40" : "border-ink-900/8"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => add(id)}
                      aria-label={`Add ${item.name} (${size})`}
                      className="flex flex-col items-center p-1.5 pb-1 text-center active:scale-95"
                    >
                      <ProductThumb id={id} name={item.name} className="aspect-square w-full border-0" />
                      <span className="mt-1 line-clamp-2 min-h-[2.2em] text-[0.7rem] font-medium leading-tight text-ink-900">
                        {item.name}
                      </span>
                      <span className="text-[0.7rem] font-semibold tabular-nums text-gold-600">
                        {menu.currency}
                        {size === "mini" ? item.mini : item.price}
                      </span>
                    </button>

                    {qty > 0 && (
                      <>
                        <span className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                          {qty}
                        </span>
                        <div className="flex border-t border-ink-900/8">
                          <button
                            type="button"
                            onClick={() => setQty(id, qty - 1)}
                            aria-label={`Remove one ${item.name}`}
                            className="flex-1 py-2 text-lg leading-none text-ink-700 active:bg-cream-200"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => setQty(id, qty + 1)}
                            aria-label={`Add one ${item.name}`}
                            className="flex-1 py-2 text-lg leading-none text-ink-700 active:bg-cream-200"
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                    {other > 0 && (
                      <span className="absolute left-1 top-1 rounded-full bg-blush-200 px-1.5 text-[0.6rem] font-semibold text-ink-700">
                        {other} {size === "mini" ? "Full" : "Mini"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* always-on checkout: name and Place are one thumb away */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-ink-900/10 bg-cream-50 shadow-[0_-10px_30px_-20px_rgba(53,28,13,0.5)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-3 py-2.5">
          {editing && (
            <div className="flex items-center justify-between rounded-full bg-blush-200 px-4 py-2 text-sm font-semibold text-ink-900">
              <span>
                Editing #{editing.no} {editing.name}
              </span>
              <button type="button" onClick={reset} className="text-xs underline">
                Cancel edit
              </button>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              disabled={pricing.count === 0}
              className="font-medium text-ink-700 underline decoration-ink-900/20 underline-offset-4 disabled:no-underline disabled:opacity-50"
            >
              {pricing.count} item{pricing.count === 1 ? "" : "s"}
              {pricing.count > 0 && " · review"}
            </button>
            {pricing.count > 0 && !editing && (
              <button type="button" onClick={clear} className="text-xs text-muted underline">
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && place()}
              placeholder="Name (optional)"
              enterKeyHint="done"
              autoComplete="off"
              autoCapitalize="words"
              className="min-w-0 flex-1 rounded-full border border-ink-900/15 bg-white px-4 py-3 text-base outline-none focus:border-gold-500"
            />
            <button
              type="button"
              onClick={place}
              disabled={pricing.count === 0}
              className="shrink-0 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-cream-50 active:bg-gold-600 disabled:opacity-40"
            >
              {editing ? "Update" : "Place"} {menu.currency}
              {pricing.total}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-16 z-[70] mx-auto flex w-fit items-center gap-3 rounded-full bg-green-700 py-2 pl-4 pr-2 text-sm font-semibold text-white shadow-lg"
          >
            <span>✓ {toast.text}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={toast.undo}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-green-800"
              >
                Undo
              </button>
            ) : (
              <span className="pr-2" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title="This order">
        <ul className="flex flex-col divide-y divide-ink-900/8">
          {lines.map((l) => (
            <li key={l.bowl.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-900">{book.eventLabel(l.bowl.id)}</p>
                <p className="text-xs text-muted">
                  {menu.currency}
                  {l.bowl.price} each
                </p>
              </div>
              <div className="flex shrink-0 items-center rounded-full border border-ink-900/12">
                <button
                  type="button"
                  onClick={() => setQty(l.bowl.id, l.qty - 1)}
                  className="flex size-10 items-center justify-center"
                  aria-label="Remove one"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(l.bowl.id, l.qty + 1)}
                  className="flex size-10 items-center justify-center"
                  aria-label="Add one"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-baseline justify-between border-t border-ink-900/10 pt-4">
          <span className="text-sm text-ink-500">Total</span>
          <span className="display text-2xl tabular-nums">
            {menu.currency}
            {pricing.total}
          </span>
        </p>
      </Sheet>

      <Sheet open={ordersOpen} onClose={() => setOrdersOpen(false)} title="Orders">
        <OrdersBody orders={orders} onEdit={startEdit} editingId={editing?.id} />
      </Sheet>
    </>
  );
}

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-ink-900/40"
          />
          <motion.aside
            role="dialog"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="safe-top fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-cream-50 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink-900/10 px-5 py-3">
              <h2 className="display text-xl">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-11 items-center justify-center rounded-full text-2xl text-ink-700 active:bg-cream-200"
              >
                ×
              </button>
            </div>
            <div className="safe-bottom flex-1 overflow-y-auto px-4 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function OrdersBody({
  orders,
  onEdit,
  editingId,
}: {
  orders: book.EventOrder[];
  onEdit: (o: book.EventOrder) => void;
  editingId?: string;
}) {
  const [query, setQuery] = useState("");
  if (orders.length === 0) return <p className="text-sm text-muted">No orders yet.</p>;

  // by name, or by number ("12" or "#12")
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const matches = q
    ? orders.filter((o) => o.name.toLowerCase().includes(q) || String(o.no) === q)
    : orders;
  // still to hand over first, then the finished ones
  const sorted = [...matches.filter((o) => !o.handedOver), ...matches.filter((o) => o.handedOver)];
  const takings = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {orders.length} order{orders.length === 1 ? "" : "s"} · received {menu.currency}
        {takings}
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or #number"
        autoComplete="off"
        enterKeyHint="search"
        className="rounded-full border border-ink-900/15 bg-white px-4 py-3 text-base outline-none focus:border-gold-500"
      />
      {q && sorted.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">No order matches “{query.trim()}”.</p>
      )}
      {sorted.map((o) => (
        <div
          key={o.id}
          className={`rounded-2xl border border-ink-900/10 bg-white p-4 ${o.handedOver ? "opacity-55" : ""}`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-ink-900">
              #{o.no} {o.name}
            </p>
            <p className="font-semibold tabular-nums">
              {menu.currency}
              {o.total}
            </p>
          </div>
          <ul className="mt-1.5 text-sm text-ink-700">
            {o.items.map((i) => (
              <li key={i.id}>
                {i.qty} × {book.eventLabel(i.id, i.label)}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Tick on={o.paid} onClick={() => book.toggle(o.id, "paid")}>
              Payment received
            </Tick>
            <Tick on={o.handedOver} onClick={() => book.toggle(o.id, "handedOver")}>
              Handed over
            </Tick>
          </div>
          <div className="mt-2 flex gap-4">
            <button
              type="button"
              onClick={() => onEdit(o)}
              disabled={o.id === editingId}
              className="py-1 text-xs font-semibold text-ink-700 underline disabled:no-underline disabled:opacity-50"
            >
              {o.id === editingId ? "Editing…" : "Edit"}
            </button>
            <button
              type="button"
              onClick={() => confirm(`Delete order #${o.no} (${o.name})?`) && book.removeOrder(o.id)}
              className="py-1 text-xs text-muted underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          confirm(
            `Start a new day? This deletes all ${orders.length} order${orders.length === 1 ? "" : "s"} and numbering restarts at #1.`,
          ) && book.resetDay()
        }
        className="mt-6 rounded-full border border-red-700/40 py-3 text-xs font-semibold uppercase tracking-wider text-red-700"
      >
        Start new day
      </button>
    </div>
  );
}

function Tick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 rounded-full px-3 py-3 text-xs font-semibold transition-colors ${
        on ? "bg-green-700 text-white" : "border border-ink-900/15 text-ink-700"
      }`}
    >
      {on ? "✓ " : ""}
      {children}
    </button>
  );
}

/**
 * Hold the screen on while the till is open, so the phone does not lock
 * between customers. The browser drops the lock whenever the tab is hidden,
 * so it is taken again on return. Needs https (or localhost); elsewhere it
 * quietly does nothing.
 */
function useKeepAwake() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const take = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // denied, or low battery — the phone simply locks as usual
      }
    };
    take();
    // some browsers only grant it after a tap
    document.addEventListener("pointerdown", take);
    document.addEventListener("visibilitychange", take);
    return () => {
      document.removeEventListener("pointerdown", take);
      document.removeEventListener("visibilitychange", take);
      lock?.release().catch(() => {});
    };
  }, []);
}
