"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cart as copy, links, menu, orders as orderCopy } from "@/lib/content";
import { formatOrderDate, type StoredOrder } from "@/lib/orders";
import { whatsappMessage } from "@/lib/pricing";
import { quote } from "@/lib/loyalty/quote";
import { JOURNEY_LENGTH, WELCOME_OFFER_ID, biteClub } from "@/lib/loyalty/config";
import {
  fetchSnapshot,
  rememberPhone,
  rememberedPhone,
  serverPhone,
  submitOrder,
  subscribePhone,
  type LoyaltySnapshot,
} from "@/lib/loyalty/client";
import { useCart } from "./CartContext";
import { ease } from "../motion/Reveal";
import { Choco } from "../art/Choco";
import { RewardPanel } from "../loyalty/RewardPanel";
import { SendingOverlay } from "./SendingOverlay";

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
    offerClaimed,
    claimOffer,
    releaseOffer,
  } = useCart();

  const lastOrder = orders[0];

  /* The remembered number arrives from the store, so the field is filled on
     the first client render rather than a frame later. Typing overrides it
     locally until the order is placed, which is when it is written back. */
  const saved = useSyncExternalStore(subscribePhone, rememberedPhone, serverPhone);
  const [typed, setTyped] = useState<string | null>(null);
  const phone = typed ?? saved;
  const setPhone = setTyped;

  const [snapshot, setSnapshot] = useState<LoyaltySnapshot | null>(null);
  /* The welcome gift may have been claimed in the hero, long before this
     drawer existed, so for that one offer "applied" is the shared claim rather
     than drawer state. Every other reward is chosen here and only here. */
  const [locallyApplied, setLocallyApplied] = useState(false);
  const isWelcome = snapshot?.offer?.id === WELCOME_OFFER_ID;
  const applied = isWelcome ? offerClaimed : locallyApplied;

  const setApplied = useCallback(
    (next: boolean) => {
      if (!isWelcome) return setLocallyApplied(next);
      if (next) claimOffer();
      else releaseOffer();
    },
    [isWelcome, claimOffer, releaseOffer],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{
    code: string;
    snapshot: LoyaltySnapshot;
    whatsappUrl: string;
  } | null>(null);

  /* Look the customer up once the number is plausible — and again whenever
     the drawer opens, because a Bite may have been confirmed at the cart
     since they last looked. */
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (!open || digits.length < 10) return;

    let cancelled = false;
    fetchSnapshot(phone)
      .then((data) => !cancelled && setSnapshot(data))
      .catch(() => !cancelled && setSnapshot(null));

    return () => {
      cancelled = true;
    };
  }, [phone, open]);

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

  const cartProductIds = useMemo(() => lines.map((l) => l.bowl.id), [lines]);

  /* A ₹99 reward reprices a bowl that has to still be in the cart. Rather
     than watching for that in an effect and un-applying it, the condition is
     derived: if the bowl goes, the reward simply stops being active. Same
     result, one less thing that can get out of step. */
  const rewardActive =
    applied &&
    (snapshot?.offer?.type !== "ORDER_3_SIGNATURE_BOWL_99" ||
      (!!chosen && cartProductIds.includes(chosen)));

  /* The price shown is computed by the same function the server uses to
     price the order, so the number in the drawer and the number written to
     the database cannot disagree. */
  const preview = useMemo(
    () =>
      quote({
        items: lines.map((l) => ({ id: l.bowl.id, qty: l.qty })),
        reward:
          rewardActive && snapshot?.offer
            ? { type: snapshot.offer.type, productId: chosen ?? undefined }
            : null,
      }),
    [lines, rewardActive, chosen, snapshot],
  );

  async function send() {
    setError(null);

    if (phone.replace(/\D/g, "").length < 10) {
      setError("Add your WhatsApp number so we can confirm your order.");
      return;
    }

    setSending(true);
    rememberPhone(phone);

    const startedAt = Date.now();

    const result = await submitOrder({
      phone,
      name,
      items: lines.map((l) => ({ id: l.bowl.id, qty: l.qty })),
      rewardId: rewardActive ? (snapshot?.offer?.id ?? null) : null,
      productId: rewardActive ? chosen : null,
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
      setPlaced({ code: result.code, snapshot: result.snapshot, whatsappUrl: result.whatsappUrl });
      setApplied(false);
      setChosen(null);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }

    /* The cart must keep selling even when the database does not answer:
       fall back to a plain WhatsApp order with no reward on it, which staff
       can reconcile by hand. Losing a Bite is recoverable; losing the sale
       is not. */
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
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-ink-900/10 bg-cream-50 shadow-[-30px_0_70px_-40px_rgba(79,44,22,0.5)]"
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

            <div className="relative flex-1 overflow-y-auto px-6 py-5">
              <SendingOverlay show={sending} />

              {placed ? (
                <OrderPlaced
                  code={placed.code}
                  snapshot={placed.snapshot}
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
                <ul className="space-y-4">
                  {lines.map(({ bowl, category, qty }) => (
                    <li
                      key={bowl.id}
                      className="flex items-start justify-between gap-4 border-b border-ink-900/8 pb-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{bowl.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{category.title}</p>
                        <p className="mt-1 text-sm text-ink-500">
                          {menu.currency}
                          {bowl.price} each
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center rounded-full border border-ink-900/12">
                          <button
                            type="button"
                            aria-label={`Decrease ${bowl.name} quantity`}
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
                            aria-label={`Increase ${bowl.name} quantity`}
                            onClick={() => setQty(bowl.id, qty + 1)}
                            className="flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-14 text-right text-sm font-semibold text-ink-900 tabular-nums">
                          {menu.currency}
                          {bowl.price * qty}
                        </span>
                      </div>
                    </li>
                  ))}

                  {preview.giftLine && (
                    <li className="flex items-center justify-between gap-4 rounded-xl bg-fresh-100 px-4 py-3">
                      <span className="text-sm font-medium text-ink-900">
                        {preview.giftLine.name}
                      </span>
                      <span className="text-sm font-semibold text-fresh-600">FREE</span>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {lines.length > 0 && !placed && (
              /* While the order is in flight the form steps aside on a phone,
                 so Choco has the whole drawer and lands in the middle of the
                 screen rather than squeezed above the fields. On a wider
                 screen there is room for both, so nothing moves. */
              <footer
                className={`border-t border-ink-900/10 bg-cream-100 px-6 py-5 ${
                  sending ? "hidden sm:block" : ""
                }`}
              >
                <RewardPanel
                  snapshot={snapshot}
                  applied={rewardActive}
                  offerClaimed={offerClaimed}
                  chosenProductId={chosen}
                  cartProductIds={cartProductIds}
                  onApply={() => setApplied(true)}
                  onChoose={(id) => setChosen(id)}
                  onRemove={() => {
                    setApplied(false);
                    setChosen(null);
                  }}
                />

                {pricing.combosApplied.length > 0 && (
                  <div className="mb-4 rounded-xl border border-gold-500/30 bg-blush-100 px-4 py-3">
                    {pricing.combosApplied.map((c) => (
                      <p key={c.category.id} className="text-xs text-ink-700">
                        <span className="font-semibold text-gold-600">Combo applied ·</span>{" "}
                        {c.count > 1 ? `${c.count} × ` : ""}2 {c.category.title} at{" "}
                        {menu.currency}
                        {c.category.combo}
                      </p>
                    ))}
                    <p className="mt-1 text-xs font-semibold text-gold-600">
                      {copy.savings}: {menu.currency}
                      {pricing.savings}
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="kicker">{copy.nameLabel}</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={copy.namePlaceholder}
                      autoComplete="name"
                      className="mt-2 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
                    />
                  </label>

                  <label className="block">
                    <span className="kicker">WhatsApp number</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      inputMode="tel"
                      autoComplete="tel"
                      className="mt-2 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
                    />
                  </label>
                </div>

                {preview.reward && (
                  <div className="mt-4 flex items-baseline justify-between text-sm">
                    <span className="text-ink-500">{preview.reward.label}</span>
                    <span className="font-semibold text-fresh-600 tabular-nums">
                      {preview.reward.amount > 0
                        ? `−${menu.currency}${preview.reward.amount}`
                        : "FREE"}
                    </span>
                  </div>
                )}

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
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-6 py-4 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600 disabled:opacity-60"
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

                <div className="mt-3 flex items-center justify-between">
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
 * What the customer sees the moment the order leaves.
 *
 * The code is the important thing on this screen: it is what staff look up to
 * confirm the order, which is what turns it into a Bite. The wording is
 * deliberate — the order is SENT, and the Bite lands when the cart confirms
 * it. Promising the milestone here would be a lie every time an order is
 * cancelled.
 */
function OrderPlaced({
  code,
  snapshot,
  whatsappUrl,
  onDone,
}: {
  code: string;
  snapshot: LoyaltySnapshot;
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

      <p className="mt-5 max-w-[32ch] text-xs text-ink-500">
        {snapshot.state.completedOrders >= JOURNEY_LENGTH
          ? biteClub.completeBody
          : snapshot.next
            ? `This will be Bite ${snapshot.state.completedOrders + 1}. ${
                snapshot.next.ordersAway === 1
                  ? `One more and ${snapshot.next.short} is yours.`
                  : `${snapshot.next.short} at your ${snapshot.next.label}.`
              }`
            : biteClub.explainer}
      </p>

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
          <li key={item.id} className="flex justify-between gap-3 text-sm text-ink-700">
            <span className="min-w-0 truncate">
              {item.qty} × {item.name}
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

      <p className="mt-2 text-center text-[0.7rem] text-muted">{orderCopy.historyNote}</p>
    </div>
  );
}
