"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { JOURNEY_LENGTH, biteClub, milestoneForType } from "@/lib/loyalty/config";
import type { LoyaltySnapshot } from "@/lib/loyalty/client";

/** how long the celebration runs before the panel goes quiet again */
const CHEER_MS = 1400;

/* Twelve pieces thrown evenly around the pill, at three different distances
   so the burst has some depth. Computed once at module scope: the same
   scatter every time is one less thing that can differ between renders. */
const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const distance = 20 + (i % 3) * 8;
  return {
    tx: `${Math.round(Math.cos(angle) * distance)}px`,
    ty: `${Math.round(Math.sin(angle) * distance)}px`,
    rot: `${i * 47}deg`,
    delay: (i % 4) * 40,
    colour: ["bg-gold-500", "bg-fresh-500", "bg-blush-300", "bg-gold-400"][i % 4],
  };
});

/**
 * The reward offer inside the cart.
 *
 * Nothing is applied behind the customer's back: the reward is described,
 * and it only counts once they tap Apply. A reward that needs a choice of
 * bowl asks for it here rather than picking one for them — a free bowl they
 * did not choose is a complaint, not a gift.
 *
 * Everything shown is what the server sent. The button does not compute a
 * discount; it records an intention which the server then prices.
 */
export function RewardPanel({
  snapshot,
  loading,
  applied,
  offerClaimed,
  chosenProductId,
  onApply,
  onChoose,
  onRemove,
  cartProductIds,
}: {
  snapshot: LoyaltySnapshot | null;
  /** the server is still being asked where this customer stands */
  loading: boolean;
  applied: boolean;
  /** the welcome gift was taken in the hero, before any number was typed */
  offerClaimed: boolean;
  chosenProductId: string | null;
  onApply: () => void;
  onChoose: (productId: string) => void;
  onRemove: () => void;
  cartProductIds: string[];
}) {
  /* The celebration is fired by the tap, not by watching `applied` — a
     drawer reopened on an already-applied reward would otherwise throw
     confetti at someone who is just checking their cart. */
  const [cheering, setCheering] = useState(false);

  useEffect(() => {
    if (!cheering) return;
    const t = setTimeout(() => setCheering(false), CHEER_MS);
    return () => clearTimeout(t);
  }, [cheering]);

  const apply = () => {
    setCheering(true);
    onApply();
  };

  /* Only celebrate something that actually landed: if the reward did not
     take — no bowl in the cart, a claim the server refused — the panel
     stays quiet rather than cheering a no-op. */
  const cheer = cheering && applied;

  /* Claimed upstairs, but we still have no number, so the server has not been
     asked whether it is owed. The total stays honest — showing 20% off a bill
     the server might refuse is a worse surprise than asking for the number —
     and the gift is held in plain sight so the claim does not seem to have
     evaporated between the hero and here. */
  /* A cart that says "Bite 1 · this order unlocks 20% off" to someone on
     their 4th is worse than a cart that says nothing yet. While the lookup
     is out, the panel holds the space and says what it is doing. */
  if (loading && !snapshot) {
    return (
      <div className="mb-4 rounded-2xl border border-ink-900/8 bg-cream-50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3" aria-hidden>
          <div className="min-w-0 flex-1 animate-pulse">
            <div className="h-3.5 w-[55%] rounded-full bg-ink-900/8" />
            <div className="mt-2 h-2.5 w-[75%] rounded-full bg-ink-900/8" />
          </div>
          <div className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-ink-900/8" />
        </div>
        <p className="mt-2.5 text-[0.7rem] text-muted">{biteClub.checking}</p>
      </div>
    );
  }

  if (!snapshot) {
    if (!offerClaimed) return null;

    return (
      <div className="mb-4 rounded-2xl border border-fresh-500/30 bg-fresh-100 px-4 py-3">
        <p className="text-xs font-semibold text-ink-900">🎁 20% OFF claimed</p>
        <p className="mt-1 text-xs text-ink-500">
          Add your WhatsApp number below and it comes off your total.
        </p>
      </div>
    );
  }

  const offer = snapshot.offer;

  // no reward yet: show what this order is working towards
  if (!offer) {
    const next = snapshot.next;
    /* Finished means six completed orders — never "there is no next reward",
       which is also true of a customer we have never seen. */
    const finished = snapshot.state.completedOrders >= JOURNEY_LENGTH;
    return (
      <div className="mb-4 rounded-2xl border border-gold-500/25 bg-blush-100/60 px-4 py-3">
        <p className="text-xs font-semibold text-ink-900">
          💕 {biteClub.name} · Bite {snapshot.state.completedOrders + 1}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {finished
            ? biteClub.completeBody
            : next
              ? `This order unlocks ${next.short.toLowerCase()} ${
                  next.ordersAway === 1 ? "next" : `in ${next.ordersAway} orders`
                }.`
              : biteClub.explainer}
        </p>
      </div>
    );
  }

  const needsChoice = offer.choices.length > 0;
  /* A ₹99 reward reprices a bowl already in the cart; a free bowl adds one.
     Only the first kind is limited to what they are already buying. */
  const choices =
    offer.type === "ORDER_3_SIGNATURE_BOWL_99"
      ? offer.choices.filter((c) => cartProductIds.includes(c.id))
      : offer.choices;

  return (
    <div
      className={`relative mb-4 rounded-2xl border border-fresh-500/30 bg-fresh-100 px-4 py-3.5 ${
        cheer ? "animate-reward-lift" : ""
      }`}
    >
      {/* a ring of green going out from the panel, once */}
      {cheer && (
        <span
          aria-hidden
          className="animate-reward-glow pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-fresh-500"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">
            {milestoneForType(offer.type)?.checkout ?? `🎁 ${offer.label}`}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">{offer.detail}</p>
        </div>

        {applied ? (
          <span className="relative shrink-0">
            {cheer && <Burst />}
            <span
              className={`flex items-center gap-1 rounded-full bg-fresh-600 px-3 py-1.5 text-[0.7rem] font-semibold text-cream-50 ${
                cheer ? "animate-reward-pop" : ""
              }`}
            >
              Applied
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M2.4 6.3 4.8 8.7 9.6 3.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cheer ? "animate-reward-tick" : ""}
                />
              </svg>
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={apply}
            disabled={needsChoice && !chosenProductId}
            className="shrink-0 rounded-full bg-ink-900 px-4 py-2 text-[0.7rem] font-semibold text-cream-50 transition-colors hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Reward
          </button>
        )}
      </div>

      {needsChoice && !applied && (
        <div className="mt-3">
          <p className="text-[0.7rem] font-medium text-ink-700">
            {offer.type === "ORDER_3_SIGNATURE_BOWL_99"
              ? "Which Signature Bowl?"
              : "Choose your free bowl"}
          </p>

          {choices.length === 0 ? (
            <p className="mt-1.5 text-[0.7rem] text-ink-500">
              Add a Signature Bowl to your cart to use this reward.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose(choice.id)}
                  className={`rounded-full border px-3 py-1.5 text-[0.7rem] transition-colors ${
                    chosenProductId === choice.id
                      ? "border-transparent bg-ink-900 text-cream-50"
                      : "border-ink-900/12 bg-cream-50 text-ink-700 hover:border-gold-500"
                  }`}
                >
                  {choice.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {applied && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-[0.7rem] text-ink-500 underline underline-offset-2 hover:text-ink-900"
        >
          Remove reward
        </button>
      )}
    </div>
  );
}

/**
 * The confetti, thrown from the middle of the Applied pill.
 *
 * Twelve 5px pieces in the site's own gold, green and blush — a burst that
 * is over in under a second, because this sits inside a cart someone is
 * trying to finish, not on a page they are browsing.
 */
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {BURST.map((piece, i) => (
        <span
          key={i}
          className={`animate-reward-confetti absolute size-[5px] rounded-[1px] ${piece.colour}`}
          style={
            {
              "--tx": piece.tx,
              "--ty": piece.ty,
              "--rot": piece.rot,
              animationDelay: `${piece.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
