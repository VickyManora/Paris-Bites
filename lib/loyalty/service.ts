import "server-only";

/**
 * The server's answers to the only three questions the browser may ask:
 * where do I stand, place this order, and (for staff) confirm this one.
 *
 * Every one of them re-reads the customer's state from the database and
 * re-prices the cart from the catalogue. Nothing the request carries about
 * money, counts or eligibility is believed — the request supplies a phone
 * number, product ids and quantities, and that is all it is allowed to say.
 */
import { db, hasDatabase } from "../db/client";
import { fromPostgres } from "../db/adapter";
import type { Db } from "../db/adapter";
import {
  completeOrder as completeOrderRow,
  createOrder,
  customerOrders,
  claimWelcomeReward,
  customerWithState,
  findCustomerByPhone,
  grantMissingRewards,
  loyaltyState,
  normalisePhone,
  reverseOrder,
  transactions,
  type OrderRow,
} from "../db/repo";
import { links } from "../content";
import {
  canClaimWelcome,
  completionMessage,
  journeyView,
  nextReward,
  missingEarnedMilestones,
  redeemableReward,
  validateRedemption,
  type LoyaltyState,
} from "./engine";
import {
  WELCOME_MILESTONE,
  WELCOME_OFFER_ID,
  eligibleProducts,
  milestone,
  milestoneForType,
  type RewardType,
} from "./config";
import { orderMessage, quote, type QuoteItem } from "./quote";
import type { LoyaltySnapshot } from "./service-types";

export function database(): Db {
  return fromPostgres(db() as never);
}

export { hasDatabase };

export type { LoyaltySnapshot } from "./service-types";

const emptyState: LoyaltyState = { completedOrders: 0, rewards: [] };

/**
 * What we send about someone we have never seen.
 *
 * `next` is the FIRST Bite, not null: a stranger has the whole journey ahead
 * of them. Returning null here told every surface that asked "is there a next
 * reward?" that there wasn't, and the ones that read that as "journey
 * finished" congratulated a first-time visitor on completing six orders.
 */
function unknownCustomer(): LoyaltySnapshot {
  return {
    customer: null,
    state: emptyState,
    journey: journeyView(emptyState),
    next: nextRewardView(0),
    /* A stranger is exactly who the welcome gift is for, so it is offered
       here too — not just to a customer row that happens to have no orders
       yet. offerFor decides; this must not hardcode an answer of its own. */
    offer: offerFor(emptyState),
    history: [],
  };
}

export async function snapshotForPhone(phone: string): Promise<LoyaltySnapshot> {
  if (!hasDatabase() || !normalisePhone(phone)) {
    return unknownCustomer();
  }

  const conn = database();
  const customer = await findCustomerByPhone(conn, phone);
  if (!customer) {
    return unknownCustomer();
  }

  let state = await loyaltyState(conn, customer.id);

  /* Heal an account the ladder moved under. A customer who reached four
     Bites when the Mini Bowl sat at the sixth order has no row for it, and
     the count says it is theirs — so write it, once, and read back. Costs
     nothing for everyone else: the comparison is done on state already in
     hand, and the write only fires when it finds a gap. */
  const missing = missingEarnedMilestones(state);
  if (missing.length > 0) {
    await grantMissingRewards(conn, customer.id, missing);
    state = await loyaltyState(conn, customer.id);
  }

  const log = await transactions(conn, customer.id, 30);

  return {
    customer: { name: customer.name, phone: customer.phone },
    state,
    journey: journeyView(state),
    next: nextRewardView(state.completedOrders),
    offer: offerFor(state),
    history: log.map((t) => ({
      id: String(t.id),
      type: t.type,
      description: t.description,
      at: new Date(t.created_at).toISOString(),
    })),
  };
}

/**
 * A snapshot from state already in hand.
 *
 * Placing an order used to end by re-reading everything back out of the
 * database — four more round trips for facts that had not changed, because a
 * pending order moves nobody's count. History is left empty: the cart does
 * not show it, and the dashboard fetches its own.
 */
function snapshotFrom(
  customer: { name: string; phone: string },
  state: LoyaltyState,
): LoyaltySnapshot {
  return {
    customer,
    state,
    journey: journeyView(state),
    next: nextRewardView(state.completedOrders),
    offer: offerFor(state),
    history: [],
  };
}

function nextRewardView(completedOrders: number) {
  const next = nextReward(completedOrders);
  if (!next) return null;
  return {
    label: next.milestone.label,
    short: next.milestone.short,
    ordersAway: next.ordersAway,
  };
}

/** the single reward the checkout may apply, with the choices it needs */
function offerFor(state: LoyaltyState): LoyaltySnapshot["offer"] {
  const reward = redeemableReward(state);

  /* Nobody has ordered yet, so the welcome gift is theirs and there is no row
     to point at — see WELCOME_OFFER_ID. It is offered under the sentinel, and
     placeOrder turns that into a real row when the order is actually placed.
     Once a row exists (the gift is spent, or an order is holding it) the
     branch above owns the answer and this one never fires. */
  if (!reward) {
    const welcome = milestone(WELCOME_MILESTONE);

    if (welcome?.type && canClaimWelcome(state)) {
      return {
        id: WELCOME_OFFER_ID,
        type: welcome.type,
        label: welcome.short,
        detail: welcome.detail,
        choices: [],
      };
    }
    return null;
  }

  const m = milestoneForType(reward.type);
  if (!m) return null;

  // eligible products are resolved here, server-side, from the catalogue
  const choices =
    m.mechanic && m.mechanic.kind !== "percent"
      ? eligibleProducts(reward.type).map((p) => ({ id: p.id, name: p.name, price: p.price }))
      : [];

  return { id: reward.id, type: reward.type, label: m.short, detail: m.detail, choices };
}

export type PlaceOrderInput = {
  phone: string;
  name: string;
  items: QuoteItem[];
  /** the reward the customer chose to apply, if any */
  rewardId?: string | null;
  /** the item that reward is spent on */
  productId?: string | null;
};

export type PlaceOrderResult =
  | { ok: true; code: string; total: number; whatsappUrl: string; snapshot: LoyaltySnapshot }
  | { ok: false; error: string };

/**
 * Place a pending order.
 *
 * Nothing is counted here — the order is a request until staff confirm it,
 * which is the whole reason a customer cannot mint Bites by tapping a button.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!hasDatabase()) return { ok: false, error: "Ordering is temporarily unavailable." };
  if (!normalisePhone(input.phone))
    return { ok: false, error: "Enter a valid mobile number so we can reach you." };
  if (!input.items.length) return { ok: false, error: "Your cart is empty." };

  const conn = database();

  // round trip 1 of 2: who they are and where they stand
  const { customer, state } = await customerWithState(conn, {
    phone: input.phone,
    name: input.name,
  });

  let reward: { type: RewardType; productId?: string } | null = null;
  /* What actually goes to the database. It differs from what the browser sent
     only for the welcome gift, whose row is created here. */
  let rewardId = input.rewardId ?? null;

  if (rewardId === WELCOME_OFFER_ID) {
    const welcome = milestone(WELCOME_MILESTONE);

    /* The gift is for a first order and nothing else. The state comes from the
       database we have just read, never from the request — and it is the same
       check that decided to offer it in the first place. */
    if (!welcome?.type || !canClaimWelcome(state))
      return { ok: false, error: "The welcome gift is only for your first order." };

    if (!input.items.length) return { ok: false, error: "Add something to your cart first." };

    const claimed = await claimWelcomeReward(conn, customer.id);
    if (!claimed)
      return { ok: false, error: "Your welcome gift has already been used." };

    rewardId = claimed.id;
    reward = { type: welcome.type };
  } else if (rewardId) {
    const verdict = validateRedemption({
      state,
      rewardId,
      productId: input.productId ?? undefined,
      cartProductIds: input.items.map((i) => i.id),
    });
    if (!verdict.ok) return { ok: false, error: verdict.reason };
    reward = { type: verdict.reward.type, productId: input.productId ?? undefined };
  }

  // the server's own arithmetic, from the catalogue's own prices
  const priced = quote({ items: input.items, reward });
  if (!priced.lines.length) return { ok: false, error: "Your cart is empty." };

  // round trip 2 of 2: the order, the reward claim and the ledger, in one call
  const created = await createOrder(conn, {
    customerId: customer.id,
    items: priced.lines.map((l) => ({ id: l.bowl.id, qty: l.qty, price: l.bowl.price })),
    giftProductId: priced.giftLine?.id ?? null,
    subtotal: priced.comboTotal,
    discount: priced.reward?.amount ?? 0,
    total: priced.total,
    rewardId,
    rewardLabel: priced.reward?.label ?? null,
  });

  if ("error" in created) return { ok: false, error: created.error };

  const message = orderMessage({
    quote: priced,
    name: input.name,
    code: created.order.code,
  });

  /* The reward just spent is now held by this order, so it is shown as gone
     without asking the database again — the row we read a moment ago is
     otherwise still accurate. */
  const after: LoyaltyState = {
    ...state,
    rewards: state.rewards.some((r) => r.id === rewardId)
      ? state.rewards.map((r) =>
          r.id === rewardId ? { ...r, status: "redeemed" as const } : r,
        )
      : /* the welcome gift's row was created a moment ago, so it is not in the
           state we read before it existed. Adding it as spent is what stops the
           cart offering it again on the confirmation screen. */
        rewardId && reward
        ? [
            ...state.rewards,
            {
              id: rewardId,
              type: reward.type,
              milestone: WELCOME_MILESTONE,
              status: "redeemed" as const,
              earnedAt: new Date().toISOString(),
              redeemedAt: new Date().toISOString(),
              orderId: created.order.id,
            },
          ]
        : state.rewards,
  };

  return {
    ok: true,
    code: created.order.code,
    total: priced.total,
    whatsappUrl: `${links.whatsapp}?text=${encodeURIComponent(message)}`,
    snapshot: snapshotFrom({ name: customer.name, phone: customer.phone }, after),
  };
}

/** staff confirm an order; the only path that advances a journey */
export async function confirmOrder(orderId: string) {
  const result = await completeOrderRow(database(), orderId);
  return {
    order: result.order,
    state: result.state,
    counted: result.counted,
    message: completionMessage(result.state.completedOrders),
  };
}

export async function cancelOrder(orderId: string, status: "cancelled" | "refunded") {
  return reverseOrder(database(), orderId, status);
}

export async function ordersForCustomer(phone: string): Promise<OrderRow[]> {
  if (!hasDatabase()) return [];
  const conn = database();
  const customer = await findCustomerByPhone(conn, phone);
  return customer ? customerOrders(conn, customer.id) : [];
}
