"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useOffline } from "next/offline";
import { AnimatePresence, motion } from "motion/react";
import { cart as copy, links, menu, orders as orderCopy } from "@/lib/content";
import { formatOrderDate, type StoredOrder } from "@/lib/orders";
import { itemLabel, whatsappMessage } from "@/lib/pricing";
import { sizeLabel, sizeOf } from "@/lib/product-id";
import { quote } from "@/lib/loyalty/quote";
import {
  rememberPhone,
  rememberedPhone,
  serverPhone,
  submitOrder,
  subscribePhone,
} from "@/lib/loyalty/client";
import { useCart } from "./CartContext";
import { ease } from "../motion/Reveal";
import { Choco } from "../art/Choco";
import { ProductThumb } from "../product/ProductThumb";
import { InstallPrompt } from "../pwa/InstallPrompt";
import { SendingOverlay } from "./SendingOverlay";

/**
 * Can we reach WhatsApp?
 *
 * `useOffline()` covers the cases the framework can see — the browser's own
 * offline event, and its own failed navigations. It does not watch a plain
 * `fetch` like the one that places an order, which is exactly the request
 * that matters here. So when that request fails, this asks the network a
 * direct question instead of guessing.
 *
 * `no-cors` because we only care whether the connection opens, not what
 * comes back; `no-store` so a cached answer cannot claim the network is fine
 * when it is not. A short timeout, because a customer waiting to order will
 * not wait three seconds for a diagnosis.
 */
async function whatsappReachable(): Promise<boolean> {
  try {
    await fetch("https://wa.me/favicon.ico", {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return true;
  } catch {
    return false;
  }
}

export function CartDrawer() {
  const {
    open,
    setOpen,
    lines,
    pricing,
    setQty,
    name,
    setName,
    clear,
    orders,
    placeOrder,
    reorder,
  } = useCart();

  const lastOrder = orders[0];

  /* Next's own signal, not navigator.onLine — that only reports whether a
     network interface is up, and says "online" on café WiFi with nothing
     behind it. This one also flips when a request actually fails. */
  const offline = useOffline();

  /* The remembered number arrives from the store, so the field is filled on
     the first client render rather than a frame later. Typing overrides it
     locally until the order is placed, which is when it is written back. */
  const saved = useSyncExternalStore(subscribePhone, rememberedPhone, serverPhone);
  const [typed, setTyped] = useState<string | null>(null);
  const phone = typed ?? saved;
  const setPhone = setTyped;


  /* Whether to show the name and number as fields or as a line of text.
     Set by the Change button and by typing — never by an effect watching
     whether the details look complete, which would collapse the fields
     under a first-time customer the moment they typed their tenth digit. */
  const [editingDetails, setEditingDetails] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ code: string; whatsappUrl: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* The price shown is computed by the same function the server uses to
     price the order, so the number in the drawer and the number written to
     the database cannot disagree. */
  const preview = useMemo(
    () =>
      quote({
        items: lines.map((l) => ({ id: l.bowl.id, qty: l.qty })),
        reward: null,
      }),
    [lines],
  );

  async function send() {
    setError(null);

    if (phone.replace(/\D/g, "").length < 10) {
      setError("Add your WhatsApp number so we can confirm your order.");
      /* The field scrolls with the order now, so it can be off-screen when
         the button is pressed. An error about a field you cannot see is
         just a dead end. */
      setEditingDetails(true);
      phoneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      phoneRef.current?.focus({ preventScroll: true });
      return;
    }

    /* Genuinely offline: stop here. The order cannot reach us, and the one
       thing worse than a failed order is a customer who believes it
       succeeded and turns up for a bowl nobody is making. This is a
       different failure from the one handled below, where the customer has
       a connection but our server does not answer. */
    if (offline) {
      setError(`${copy.offlineTitle}. ${copy.offlineBody}`);
      return;
    }

    setSending(true);
    rememberPhone(phone);

    const startedAt = Date.now();

    const result = await submitOrder({
      phone,
      name,
      items: lines.map((l) => ({ id: l.bowl.id, qty: l.qty })),
    }).catch(() => ({ ok: false as const, error: "network" }));

    /* Long enough that a fast reply cannot flash the overlay and vanish,
       short enough to add nothing anyone notices. Placing an order costs
       about a second today, so this floor almost never applies — it is here
       for the day the database moves closer. */
    const elapsed = Date.now() - startedAt;
    if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));

    setSending(false);

    if (result.ok) {
      placeOrder(); // file it locally too, so "your last order" still works
      setPlaced({ code: result.code, whatsappUrl: result.whatsappUrl });
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }

    /* The request failed. Two very different worlds look identical from
       here, and they call for opposite answers:

         our server is down, but the phone has a connection
           → hand the order to WhatsApp anyway. Losing the record is
             recoverable; losing the sale is not.

         the phone has no connection
           → stop, and say so. WhatsApp cannot deliver it either, and a
             customer who thinks the order went through turns up for a bowl
             nobody is making.

       So ask the network directly, against the host we would hand off to.
       If WhatsApp is unreachable, the fallback has nothing to fall back on. */
    if (result.error === "network" && !(await whatsappReachable())) {
      setError(`${copy.offlineTitle}. ${copy.offlineBody}`);
      return;
    }

    if (result.error === "network") {
      const href = `${links.whatsapp}?text=${encodeURIComponent(whatsappMessage(lines, name))}`;
      placeOrder();
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setError(result.error);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-ink-900/25 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-label={copy.title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease }}
            className="safe-top safe-x fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-ink-900/10 bg-cream-50 shadow-[-30px_0_70px_-40px_rgba(79,44,22,0.5)]"
          >
            <header className="flex items-center justify-between border-b border-ink-900/10 px-6 py-5">
              <div>
                <h2 className="display text-xl">{copy.title}</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {pricing.count} item{pricing.count === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="flex size-10 items-center justify-center rounded-full border border-ink-900/10 text-ink-700 transition-colors hover:bg-cream-200"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="relative flex-1 overflow-y-auto px-6 py-4">
              <SendingOverlay show={sending} />

              {placed ? (
                <OrderPlaced
                  code={placed.code}
                  whatsappUrl={placed.whatsappUrl}
                  onDone={() => setPlaced(null)}
                />
              ) : lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Choco
                    pose="bags"
                    float="bob"
                    y={16}
                    sizes="(max-width: 640px) 44vw, 190px"
                    className="mb-6 w-[44%] max-w-[190px]"
                  />
                  <p className="display text-lg">{copy.empty}</p>
                  <p className="mt-2 text-sm text-muted">{copy.emptyHint}</p>

                  {lastOrder && (
                    <LastOrder order={lastOrder} onReorder={() => reorder(lastOrder)} />
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {lines.map(({ bowl, category, qty }) => (
                    <li
                      key={bowl.id}
                      className="flex items-center justify-between gap-4 border-b border-ink-900/8 pb-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductThumb id={bowl.id} name={bowl.name} />
                        {/* category and unit price share a line: a third line
                            here costs 20px on every row, which is a whole
                            bowl's worth of screen by the third one */}
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">{bowl.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {category.title}
                            {/* Each size of a dessert is its own line with the
                                same name; without this they are
                                indistinguishable. */}
                            <span className="font-semibold text-ink-700">
                              {" · "}
                              {sizeLabel(sizeOf(bowl.id), category.kind)}
                            </span>
                            {" · "}
                            {menu.currency}
                            {bowl.price}
                            {/* the line total above already says the price
                                when there is one of them; "each" only earns
                                its place, and its line wrap, when more */}
                            {qty > 1 ? " each" : ""}
                          </p>
                        </div>
                      </div>
                      {/* Price above the stepper, not beside it. Side by
                          side these two took 164px of a 360px screen and
                          left the name about 76px, which wrapped "Oreo
                          Licious Bowl" onto three lines and made the row
                          taller than the space it was saving. */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-sm font-semibold text-ink-900 tabular-nums">
                          {menu.currency}
                          {bowl.price * qty}
                        </span>
                        <div className="flex items-center rounded-full border border-ink-900/12">
                          <button
                            type="button"
                            aria-label={`Decrease ${itemLabel(bowl.id)} quantity`}
                            onClick={() => setQty(bowl.id, qty - 1)}
                            className="flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${itemLabel(bowl.id)} quantity`}
                            onClick={() => setQty(bowl.id, qty + 1)}
                            className="flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}

                </ul>
              )}

              {/* Everything below the items used to live in the fixed footer,
                 which on a 360x640 phone left the cart itself 40px — three
                 bowls in a 40px window. Only the total and the button are
                 worth pinning; these scroll with the order they describe.
                 A side benefit on mobile: a field in a scrollable area can
                 be scrolled out from under the keyboard, where one pinned to
                 the bottom of the screen cannot. */}
              {lines.length > 0 && !placed && (
                <div className="mt-6 space-y-4 border-t border-ink-900/8 pt-5">
                  {pricing.combosApplied.length > 0 && (
                    <p className="text-xs text-ink-700">
                      <span className="font-semibold text-gold-600">Combo applied</span>
                      {pricing.combosApplied.length === 1 && (
                        <>
                          {" · "}
                          {pricing.combosApplied[0].count > 1
                            ? `${pricing.combosApplied[0].count} × `
                            : ""}
                          2 {pricing.combosApplied[0].category.title} at {menu.currency}
                          {pricing.combosApplied[0].category.combo}
                        </>
                      )}
                      {" · "}
                      <span className="font-semibold text-gold-600">
                        {copy.savingsShort} {menu.currency}
                        {pricing.savings}
                      </span>
                    </p>
                  )}

                  <ContactDetails
                    name={name}
                    phone={phone}
                    onName={(v) => {
                      setEditingDetails(true);
                      setName(v);
                    }}
                    onPhone={(v) => {
                      setEditingDetails(true);
                      setPhone(v);
                    }}
                    editing={editingDetails}
                    onEdit={() => setEditingDetails(true)}
                    phoneRef={phoneRef}
                  />
                </div>
              )}
            </div>

            {lines.length > 0 && !placed && (
              /* While the order is in flight the form steps aside on a phone,
                 so Choco has the whole drawer and lands in the middle of the
                 screen rather than squeezed above the fields. On a wider
                 screen there is room for both, so nothing moves. */
              <footer
                /* safe-bottom keeps the Order button clear of the home
                   indicator once installed; --safe-extra preserves the py-5
                   it already had rather than replacing it */
                style={{ ["--safe-extra" as string]: "0.875rem" }}
                className={`safe-bottom border-t border-ink-900/10 bg-cream-100 px-6 pt-4 ${
                  sending ? "hidden sm:block" : ""
                }`}
              >
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm text-ink-500">{copy.total}</span>
                  <span className="display text-2xl">
                    <span className="font-sans text-[0.72em] font-medium text-gold-600">
                      {menu.currency}
                    </span>
                    {preview.total}
                  </span>
                </div>

                {error && <p className="mt-3 text-xs text-gold-600">{error}</p>}

                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-6 py-4 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600 disabled:opacity-60"
                >
                  {sending ? "Placing your order…" : copy.submit}
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path
                      d="M3 8h9M8.5 4l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[0.7rem] text-muted">{copy.note}</p>
                  <button
                    type="button"
                    onClick={clear}
                    className="shrink-0 text-[0.7rem] text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
                  >
                    Clear
                  </button>
                </div>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * The name and number, shown as a line of text once we know them.
 *
 * Two input fields are 168px of a 640px phone — the largest single block in
 * the drawer — and for a returning customer they are two boxes displaying
 * what the browser already remembered. So they collapse to one row until
 * there is a reason to show them: nothing known yet, or Change pressed. A
 * first-time customer sees the fields straight away and loses no tap; a
 * returning one gets the space back.
 */
function ContactDetails({
  name,
  phone,
  onName,
  onPhone,
  editing,
  onEdit,
  phoneRef,
}: {
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  editing: boolean;
  onEdit: () => void;
  phoneRef: React.RefObject<HTMLInputElement | null>;
}) {
  const digits = phone.replace(/\D/g, "");
  const known = name.trim().length > 0 && digits.length >= 10;

  if (known && !editing) {
    // the last ten digits: the number they typed, not the 91 the server adds
    const local = digits.slice(-10);
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-900/10 bg-cream-100 px-4 py-3">
        <p className="min-w-0 truncate text-sm text-ink-900">
          <span className="font-medium">{name.trim()}</span>
          <span className="text-muted"> · </span>
          <span className="text-ink-700 tabular-nums">
            {local.slice(0, 5)} {local.slice(5)}
          </span>
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="kicker">{copy.nameLabel}</span>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={copy.namePlaceholder}
          autoComplete="name"
          className="mt-2 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
        />
      </label>

      <label className="block">
        <span className="kicker">WhatsApp number</span>
        <input
          ref={phoneRef}
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          placeholder="10-digit mobile"
          inputMode="tel"
          autoComplete="tel"
          className="mt-2 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
        />
      </label>
    </div>
  );
}

/**
 * What the customer sees the moment the order leaves.
 *
 * The code is the important thing on this screen: it is what staff look up to
 * confirm the order. The wording is
 * deliberate — the order is SENT, and it is only final when the cart confirms
 * it. Promising the milestone here would be a lie every time an order is
 * cancelled.
 */
function OrderPlaced({
  code,
  whatsappUrl,
  onDone,
}: {
  code: string;
  whatsappUrl: string;
  onDone: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Choco
        pose="heart"
        float="bob"
        y={16}
        sizes="(max-width: 640px) 40vw, 170px"
        className="mb-6 w-[40%] max-w-[170px]"
      />
      <p className="display text-xl">Order sent 💕</p>
      <p className="mt-2 max-w-[30ch] text-sm text-ink-500">
        Send us the WhatsApp message and we&apos;ll confirm it in minutes.
      </p>

      <div className="mt-5 rounded-2xl border border-gold-500/30 bg-blush-100 px-6 py-3 text-center">
        <span className="kicker block">Your order code</span>
        <span className="display mt-1 block text-2xl tracking-wide">{code}</span>
      </div>

      {/* A tapped link always opens; window.open after an await does not —
          Safari blocks it. This is the reliable path, and the automatic one
          above is the convenience. */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 w-full rounded-full bg-ink-900 px-6 py-3.5 text-center text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
      >
        Send on WhatsApp
      </a>

      {/* Asked here and nowhere else: they have just ordered, which is when
          keeping the app around is most plausibly wanted. */}
      <InstallPrompt />

      <button
        type="button"
        onClick={onDone}
        className="mt-3 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
      >
        Done
      </button>
    </div>
  );
}

/**
 * The last order this device sent, offered back as one tap.
 *
 * Shown only when the cart is empty, where it answers "what did I order last
 * time?" without getting in the way of a cart being built.
 */
function LastOrder({ order, onReorder }: { order: StoredOrder; onReorder: () => void }) {
  return (
    <div className="mt-10 w-full rounded-2xl border border-ink-900/10 bg-cream-100 p-5 text-left">
      <div className="flex items-baseline justify-between gap-3">
        <p className="kicker">{orderCopy.lastTitle}</p>
        <p className="text-[0.7rem] text-muted">
          {orderCopy.placedPrefix} {formatOrderDate(order.at)}
        </p>
      </div>

      <ul className="mt-3 space-y-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm text-ink-700">
            <span className="flex min-w-0 items-center gap-2.5">
              <ProductThumb id={item.id} name={item.name} className="size-8" />
              <span className="min-w-0 truncate">
                {item.qty} × {itemLabel(item.id, item.name)}
              </span>
            </span>
            <span className="shrink-0 text-ink-500 tabular-nums">
              {menu.currency}
              {item.price * item.qty}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-ink-900/8 pt-3 text-sm font-semibold text-ink-900">
        {menu.currency}
        {order.total}
      </p>

      <button
        type="button"
        onClick={onReorder}
        className="mt-4 w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
      >
        {orderCopy.reorder}
      </button>

    </div>
  );
}
