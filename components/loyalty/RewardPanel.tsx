"use client";

import { JOURNEY_LENGTH, biteClub, milestoneForType } from "@/lib/loyalty/config";
import type { LoyaltySnapshot } from "@/lib/loyalty/client";

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
  applied,
  offerClaimed,
  chosenProductId,
  onApply,
  onChoose,
  onRemove,
  cartProductIds,
}: {
  snapshot: LoyaltySnapshot | null;
  applied: boolean;
  /** the welcome gift was taken in the hero, before any number was typed */
  offerClaimed: boolean;
  chosenProductId: string | null;
  onApply: () => void;
  onChoose: (productId: string) => void;
  onRemove: () => void;
  cartProductIds: string[];
}) {
  /* Claimed upstairs, but we still have no number, so the server has not been
     asked whether it is owed. The total stays honest — showing 20% off a bill
     the server might refuse is a worse surprise than asking for the number —
     and the gift is held in plain sight so the claim does not seem to have
     evaporated between the hero and here. */
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
    <div className="mb-4 rounded-2xl border border-fresh-500/30 bg-fresh-100 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">
            {milestoneForType(offer.type)?.checkout ?? `🎁 ${offer.label}`}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">{offer.detail}</p>
        </div>

        {applied ? (
          <span className="shrink-0 rounded-full bg-fresh-600 px-3 py-1.5 text-[0.7rem] font-semibold text-cream-50">
            Applied ✓
          </span>
        ) : (
          <button
            type="button"
            onClick={onApply}
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
