/**
 * The Bite Club state machine.
 *
 * Pure functions over a customer's completed-order count and their reward
 * rows: no database, no clock, no randomness. The server calls this to decide
 * what may be redeemed, and the dashboard calls the same code to draw the
 * card, so the two can never disagree about where a customer stands.
 *
 * The distinction that matters throughout:
 *
 *   EARNED    the customer reached the milestone; the reward is theirs
 *   AVAILABLE earned and not yet spent
 *   REDEEMED  spent on a specific order, never again
 *
 * A reward is earned by COMPLETING a milestone and spent on a LATER order.
 * That is what keeps counting and redeeming from colliding: an order both
 * advances the journey and may carry a reward earned earlier, and neither
 * fact affects the other.
 */
import {
  JOURNEY_LENGTH,
  MILESTONES,
  WELCOME_MILESTONE,
  isEligibleProduct,
  milestone,
  milestoneForType,
  type Milestone,
  type RewardType,
} from "./config";

export type RewardStatus = "available" | "redeemed" | "revoked";

export type RewardRecord = {
  id: string;
  type: RewardType;
  milestone: number;
  status: RewardStatus;
  earnedAt: string;
  redeemedAt: string | null;
  /** the order the reward was spent on, not the one that earned it */
  orderId: string | null;
};

export type LoyaltyState = {
  /** completed orders only — pending, cancelled and refunded never count */
  completedOrders: number;
  rewards: RewardRecord[];
};

export type MilestoneView = Milestone & {
  status: "completed" | "current" | "locked";
  /** the reward's own state, when this milestone carries one */
  reward: RewardStatus | "unearned" | null;
};

/**
 * The milestone a customer is working on right now: 1 before they have
 * ordered, 7 once the journey is done (which no milestone matches, and that
 * is how "finished" is detected).
 */
export function currentMilestone(completedOrders: number): number {
  return Math.min(completedOrders + 1, JOURNEY_LENGTH + 1);
}

export function isJourneyComplete(completedOrders: number): boolean {
  return completedOrders >= JOURNEY_LENGTH;
}

/**
 * The rewards a completed-order count should have earned.
 *
 * Deriving this from the count rather than trusting stored rows means a
 * missed write, a replayed webhook or a hand-edited database row cannot
 * leave a customer permanently short — or permanently ahead.
 */
export function earnedTypes(completedOrders: number): RewardType[] {
  return MILESTONES.filter((m) => m.type !== null && m.earnedAfter <= completedOrders).map(
    (m) => m.type as RewardType,
  );
}

/** rewards earned, not yet spent, and not revoked */
export function availableRewards(state: LoyaltyState): RewardRecord[] {
  return state.rewards.filter((r) => r.status === "available");
}

/**
 * The one reward to offer at checkout: the one that belongs to THIS order.
 *
 * Each rung of the ladder is a promise about a particular order — 20% on the
 * first two, the ₹99 bowl on the third, nothing on the fourth, a Mini Bowl on
 * the fifth, a free Bowl on the sixth. So the offer is the reward whose
 * `earnedAfter` matches the orders already completed, and never merely the
 * oldest one lying around.
 *
 * That distinction is the whole rule. Offering the lowest available instead
 * meant a customer who declined a 20% carried it forward and was shown it
 * again on their third order, in place of the ₹99 bowl the ladder promises
 * there — and a customer part-way through the old ladder was shown a 20% on
 * their fifth. A reward not taken on its own order is simply not offered
 * again; the journey moves on.
 *
 * One reward per order, always — mixing two is where double-discount bugs
 * live.
 */
export function redeemableReward(state: LoyaltyState): RewardRecord | null {
  const owed = MILESTONES.filter((m) => m.earnedAfter === state.completedOrders).map((m) => m.n);

  return (
    availableRewards(state)
      .filter((r) => owed.includes(r.milestone))
      .sort((a, b) => a.milestone - b.milestone)[0] ?? null
  );
}

/**
 * The reward this customer's next order should carry, but which has no row.
 *
 * Rows are written when an order completes, against the ladder as it stood
 * that day. Change the ladder — as happened when each reward moved onto its
 * own order — and existing customers are left short: the count says the
 * Mini Bowl is theirs on the next order, and nothing ever created it.
 * Deriving that from the count rather than trusting the rows is what makes
 * it recoverable.
 *
 * Deliberately only the reward for the order in front of them. Milestones
 * they passed under the old ladder are gone; granting those after the fact
 * would be inventing rewards they were never offered. The welcome gift is
 * excluded for the same reason — it is claim-only, and belongs to a first
 * order that has already happened.
 */
export function missingEarnedMilestones(state: LoyaltyState): number[] {
  return MILESTONES.filter(
    (m) =>
      m.type !== null &&
      m.n !== WELCOME_MILESTONE &&
      m.earnedAfter === state.completedOrders &&
      !state.rewards.some((r) => r.milestone === m.n),
  ).map((m) => m.n);
}

/**
 * May this customer still take the welcome gift?
 *
 * Two conditions, and both are about the database's own record: they have
 * completed no orders, and nothing has spent the gift yet. The offer in the
 * cart and the check when the order is placed both ask this one function, so
 * the hero cannot advertise something the checkout then refuses.
 *
 * It is not the last word on a double-spend — that is the unique index and
 * the conditional claim in the database, which two simultaneous requests
 * cannot both pass. This is the readable answer, not the atomic one.
 */
export function canClaimWelcome(state: LoyaltyState): boolean {
  if (state.completedOrders > 0) return false;
  const row = state.rewards.find((r) => r.milestone === WELCOME_MILESTONE);
  return !row || row.status === "available";
}

/**
 * The next reward still ahead of them, and how many orders away it is.
 *
 * Measured in `earnedAfter`, not position: the welcome gift is already in
 * hand at zero orders, so calling it "one order away" would sell someone
 * something they are holding.
 */
export function nextReward(
  completedOrders: number,
): { milestone: Milestone; ordersAway: number } | null {
  const next = MILESTONES.find((m) => m.type !== null && m.earnedAfter > completedOrders);
  return next ? { milestone: next, ordersAway: next.earnedAfter - completedOrders } : null;
}

/** the whole ladder, ready to render */
export function journeyView(state: LoyaltyState): MilestoneView[] {
  const current = currentMilestone(state.completedOrders);

  return MILESTONES.map((m) => {
    const record = state.rewards.find((r) => r.milestone === m.n);
    const status =
      m.n <= state.completedOrders ? "completed" : m.n === current ? "current" : "locked";

    return {
      ...m,
      status,
      reward: m.type === null ? null : (record?.status ?? "unearned"),
    };
  });
}

/**
 * What to tell the customer after an order is confirmed.
 *
 * Only ever describes a reward as usable on a LATER order, because that is
 * how redemption works — promising it "on this order" would be a lie the
 * checkout then has to break.
 */
export function completionMessage(completedOrders: number): {
  headline: string;
  body: string;
} {
  const reached = milestone(completedOrders);
  if (!reached) {
    return {
      headline: "Order confirmed 💕",
      body: "Thank you — that's another Bite on the journey.",
    };
  }
  return { headline: reached.completedHeadline, body: reached.completedBody };
}

/**
 * Can this reward be spent on this cart?
 *
 * The answer the server gives before it prices anything. `productId` is the
 * item the customer picked for a fixed-price or free-item reward; a
 * percentage reward does not take one.
 */
export function validateRedemption({
  state,
  rewardId,
  productId,
  cartProductIds,
}: {
  state: LoyaltyState;
  rewardId: string;
  productId?: string;
  cartProductIds: string[];
}): { ok: true; reward: RewardRecord } | { ok: false; reason: string } {
  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, reason: "That reward does not belong to this account." };
  if (reward.status === "redeemed")
    return { ok: false, reason: "That reward has already been used." };
  if (reward.status === "revoked")
    return { ok: false, reason: "That reward is no longer available." };

  const m = milestoneForType(reward.type);
  if (!m?.mechanic) return { ok: false, reason: "That reward cannot be applied." };

  // a reward is earned by reaching its milestone; anything else is tampering
  if (!earnedTypes(state.completedOrders).includes(reward.type))
    return { ok: false, reason: "That reward has not been earned yet." };

  if (cartProductIds.length === 0)
    return { ok: false, reason: "Add something to your cart first." };

  if (m.mechanic.kind !== "percent") {
    if (!productId) return { ok: false, reason: "Choose which item the reward applies to." };

    // the catalogue decides, by category id — see isEligibleProduct
    if (!isEligibleProduct(reward.type, productId))
      return { ok: false, reason: "That item is not eligible for this reward." };

    /* A fixed-price reward reprices something already in the cart, so it has
       to be in there. A free-item reward adds one, so it must not be. */
    const inCart = cartProductIds.includes(productId);
    if (m.mechanic.kind === "fixed-price" && !inCart)
      return { ok: false, reason: "Add that bowl to your cart to use this reward." };
  }

  return { ok: true, reward };
}
