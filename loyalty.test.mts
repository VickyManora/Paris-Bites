/**
 * Bite Club — the whole system, against a real Postgres.
 *
 *   npm run test:loyalty
 *
 * PGlite runs the actual schema.sql in-process, so these tests exercise the
 * real transactions, the real unique indexes and the real conditional
 * updates. A mocked repository would pass while production raced itself.
 *
 * Covers the eighteen cases in the brief, plus the ones that bite in
 * practice: replayed confirmations, concurrent redemption, price tampering
 * and a reversal after a reward has already been eaten.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

import {
  MILESTONES,
  MINI_BOWL,
  biteClub,
  eligibleProducts,
  isEligibleProduct,
} from "./lib/loyalty/config";
import { heroTicket } from "./lib/content";
import {
  canClaimWelcome,
  completionMessage,
  earnedTypes,
  isJourneyComplete,
  journeyView,
  missingEarnedMilestones,
  nextReward,
  redeemableReward,
  validateRedemption,
} from "./lib/loyalty/engine";
import { quote } from "./lib/loyalty/quote";
import { ticketView } from "./lib/loyalty/ticket";
import { properName } from "./lib/names";
import type { LoyaltySnapshot } from "./lib/loyalty/service-types";
import type { Db } from "./lib/db/adapter";
import {
  claimWelcomeReward,
  completeOrder,
  createOrder,
  customerOrders,
  grantMissingRewards,
  loyaltyState,
  normalisePhone,
  reverseOrder,
  upsertCustomer,
} from "./lib/db/repo";

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `\n        ${detail}` : ""}`);
}

/* ── the embedded database, wired to the same adapter the app uses ── */
const pg = new PGlite();
await pg.exec(readFileSync("lib/db/schema.sql", "utf8"));

/* Every statement the application sends, counted. In-process here, but in
   production each one is a round trip to another continent — so this is the
   number that decides whether staff wait on a spinner, and it is worth
   asserting rather than hoping about. */
let roundTrips = 0;

const db: Db = {
  async query<T>(text: string, params: unknown[] = []) {
    roundTrips++;
    const res = await pg.query(text, params as never[]);
    return res.rows as T[];
  },
  async tx<T>(fn: (db: Db) => Promise<T>) {
    roundTrips++; // the transaction itself
    return (await pg.transaction(async (t) => {
      const scoped: Db = {
        async query<T2>(text: string, params: unknown[] = []) {
          roundTrips++;
          const res = await t.query(text, params as never[]);
          return res.rows as T2[];
        },
        tx: (inner) => inner(scoped), // already inside one
      };
      return fn(scoped);
    })) as T;
  },
};

/** place an order and confirm it, the way staff would */
async function orderAndComplete(
  customerId: string,
  items: { id: string; qty: number }[],
  rewardId?: string,
  productId?: string,
) {
  const state = await loyaltyState(db, customerId);
  const reward = rewardId
    ? { type: state.rewards.find((r) => r.id === rewardId)!.type, productId }
    : null;
  const q = quote({ items, reward });

  const created = await createOrder(db, {
    customerId,
    items: q.lines.map((l) => ({ id: l.bowl.id, qty: l.qty, price: l.bowl.price })),
    giftProductId: q.giftLine?.id ?? null,
    subtotal: q.comboTotal,
    discount: q.reward?.amount ?? 0,
    total: q.total,
    rewardId,
  });
  if ("error" in created) throw new Error(created.error);

  const done = await completeOrder(db, created.order.id);
  // `done.order` is the row after completion; keep that one
  return { ...done, placed: created.order };
}

console.log("── identity ──");
check("phone normalises to one identity",
  normalisePhone("+91 74473 60809") === "917447360809" &&
  normalisePhone("07447360809") === "917447360809" &&
  normalisePhone("7447360809") === "917447360809",
);
check("junk phone rejected", normalisePhone("12") === null);

/* A name typed on a phone keyboard in a hurry is still the same person, and
   staff read it aloud when they hand the bag over. */
check(
  "a name is written down properly however it was typed",
  properName("vicky manora") === "Vicky Manora" &&
    properName("VICKY MANORA") === "Vicky Manora" &&
    properName("  vicky   manora  ") === "Vicky Manora",
  properName("  vicky   manora  "),
);
check(
  "   the parts of a name keep their capitals",
  properName("d'souza") === "D'Souza" && properName("mary-jane") === "Mary-Jane",
  `${properName("d'souza")} · ${properName("mary-jane")}`,
);
check(
  "   and case someone typed on purpose is left alone",
  properName("Ravi McKenna") === "Ravi McKenna" && properName("DeSouza") === "DeSouza",
  properName("Ravi McKenna"),
);
check("   a blank name stays blank", properName("   ") === "");

const alice = await upsertCustomer(db, { phone: "7447360801", name: "Alice" });
check("customer created with a loyalty account", !!alice.id);

const again = await upsertCustomer(db, { phone: "+91 74473 60801", name: "Alice" });
check(
  "15. same number on another browser is the same account",
  again.id === alice.id,
  `${alice.id} === ${again.id}`,
);

console.log("\n── the journey, one Bite at a time ──");

// 1. new customer
let state = await loyaltyState(db, alice.id);
check("1. new customer has no rewards yet", state.completedOrders === 0 && state.rewards.length === 0);
/* The 1st Bite's 20% is the welcome gift: it is in hand at zero orders, so
   what lies AHEAD is the 2nd Bite's, which arrives after one order. */
check("   the reward ahead of them is the 2nd Bite's, one order out",
  nextReward(0)?.milestone.n === 2 && nextReward(0)?.ordersAway === 1,
  `got milestone ${nextReward(0)?.milestone.n}, ${nextReward(0)?.ordersAway} away`,
);
check("   the welcome gift is owed at zero orders",
  earnedTypes(0).includes("ORDER_1_DISCOUNT_20") && earnedTypes(0).length === 1,
);
check("   but no reward ROW exists until one is spent or a Bite completes",
  redeemableReward(state) === null && state.rewards.length === 0,
);

/* 2. One completed order, placed without taking the welcome gift. The 2nd
   Bite's 20% is now in hand for the second order — and the welcome one is
   NOT: it belonged to the first order and was not claimed there. */
let r = await orderAndComplete(alice.id, [{ id: "death-by-chocolate", qty: 1 }]);
check("2. after 1 order, the 2nd Bite's 20% is available",
  r.state.completedOrders === 1 &&
  r.state.rewards.filter((x) => x.status === "available").length === 1 &&
  r.state.rewards[0].type === "ORDER_2_DISCOUNT_20",
  r.state.rewards.map((x) => `${x.milestone}:${x.type}:${x.status}`).join(" "),
);
check("   completion copy names the Bite", completionMessage(1).headline === "1st Bite complete!");

// the 2nd order spends that 20% and, in completing, unlocks the ₹99 bowl
const reward1 = r.state.rewards.find((x) => x.status === "available")!;
r = await orderAndComplete(alice.id, [{ id: "oreo-licious", qty: 1 }], reward1.id);
check("3. an order can spend a reward AND count as a Bite",
  r.state.completedOrders === 2 &&
  r.state.rewards.find((x) => x.id === reward1.id)?.status === "redeemed" &&
  r.state.rewards.some((x) => x.type === "ORDER_3_SIGNATURE_BOWL_99" && x.status === "available"),
);
check("   and no third 20% appears — that discount ends with the 2nd order",
  r.state.rewards.filter(
    (x) => x.status === "available" && x.type.startsWith("ORDER_") && x.type.endsWith("DISCOUNT_20"),
  ).length === 0,
);

console.log("\n── the ₹99 signature reward, on the 3rd order ──");
const r99 = (await loyaltyState(db, alice.id)).rewards.find(
  (x) => x.type === "ORDER_3_SIGNATURE_BOWL_99",
)!;
state = await loyaltyState(db, alice.id);

check("17. ineligible product rejected for the ₹99 reward",
  validateRedemption({
    state, rewardId: r99.id, productId: "nutella-bliss", cartProductIds: ["nutella-bliss"],
  }).ok === false,
  "Nutella Bliss is a Premium bowl, not a Signature bowl",
);
check("   eligible signature bowl accepted",
  validateRedemption({
    state, rewardId: r99.id, productId: "kitkat-break", cartProductIds: ["kitkat-break"],
  }).ok === true,
);
check("   the reward will not price a bowl that is not in the cart",
  validateRedemption({
    state, rewardId: r99.id, productId: "kitkat-break", cartProductIds: ["tiramisu"],
  }).ok === false,
);

const q99 = quote({
  items: [{ id: "kitkat-break", qty: 1 }],
  reward: { type: "ORDER_3_SIGNATURE_BOWL_99", productId: "kitkat-break" },
});
check("   ₹169 bowl costs ₹99 with the reward", q99.total === 99, `total ₹${q99.total}`);

// the 3rd order spends the ₹99 bowl
r = await orderAndComplete(alice.id, [{ id: "kitkat-break", qty: 1 }], r99.id, "kitkat-break");
check("5. after the 3rd order there is nothing to spend on the 4th",
  r.state.completedOrders === 3 &&
  r.state.rewards.filter((x) => x.status === "available").length === 0,
  r.state.rewards.map((x) => `${x.milestone}:${x.status}`).join(" "),
);

// the 4th order: full price, no reward of its own
r = await orderAndComplete(alice.id, [{ id: "tiramisu", qty: 1 }]);
check("6. the 4th Bite carries no reward, and unlocks the Mini Bowl for the 5th",
  r.state.completedOrders === 4 &&
  !r.state.rewards.some((x) => x.milestone === 4) &&
  r.state.rewards.some((x) => x.type === "ORDER_5_FREE_MINI_BOWL" && x.status === "available"),
);
check("   but the copy still celebrates it", completionMessage(4).headline.includes("4th Bite"));

// the 5th order takes the free Mini Bowl, and unlocks the free Bowl for the 6th
const mini = (await loyaltyState(db, alice.id)).rewards.find(
  (x) => x.type === "ORDER_5_FREE_MINI_BOWL",
)!;
r = await orderAndComplete(alice.id, [{ id: "nutella-bliss", qty: 1 }], mini.id, MINI_BOWL.id);
check("7. the 5th order gives a free Mini Bowl and unlocks the free Bowl",
  r.state.completedOrders === 5 &&
  r.state.rewards.some((x) => x.type === "ORDER_6_FREE_BOWL" && x.status === "available"),
);
check("   the mini bowl rode along free", r.order.gift_product_id === MINI_BOWL.id);

// the 6th order takes the free Bowl and finishes the journey
const freeBowlReward = (await loyaltyState(db, alice.id)).rewards.find(
  (x) => x.type === "ORDER_6_FREE_BOWL",
)!;
r = await orderAndComplete(
  alice.id,
  [{ id: "death-by-chocolate", qty: 1 }],
  freeBowlReward.id,
  "tiramisu",
);
check("8. the 6th order takes the free Bowl and completes the journey",
  r.state.completedOrders === 6 && r.order.gift_product_id === "tiramisu",
);
check("   6th Bite copy is the VIP moment", completionMessage(6).headline.includes("👑"));

const view = journeyView(await loyaltyState(db, alice.id));
check("   all six bites read as completed", view.every((m) => m.status === "completed"));

console.log("\n── free bowl ──");
const freeBowl = (await loyaltyState(db, alice.id)).rewards.find(
  (x) => x.type === "ORDER_6_FREE_BOWL",
)!;
const qFree = quote({
  items: [{ id: "oreo-licious", qty: 1 }],
  reward: { type: "ORDER_6_FREE_BOWL", productId: "tiramisu" },
});
check("   a free bowl is a gift line, not a priced one",
  qFree.giftLine?.id === "tiramisu" && qFree.lines.length === 1,
);
check("   eligible free-bowl list is bowls only, no waffles",
  eligibleProducts("ORDER_6_FREE_BOWL").every((p) => !p.id.startsWith("waffle")),
);

/* 18. The free bowl was spent on the 6th order above. Trying to spend the
   same reward again is the attack this guards: one journey, one free bowl. */
check("   the spent free bowl is marked redeemed", freeBowl.status === "redeemed");

let secondAttempt: string | null = null;
try {
  await orderAndComplete(alice.id, [{ id: "oreo-licious", qty: 1 }], freeBowl.id, "tiramisu");
} catch (e) {
  secondAttempt = (e as Error).message;
}
check("18. free bowl cannot be spent twice", secondAttempt !== null, secondAttempt ?? "");

console.log("\n── order rows ──");
{
  const [row] = await db.query<{ items: unknown }>(
    `select items from orders order by created_at desc limit 1`,
  );
  check(
    "order items round-trip as an array, not a JSON string",
    Array.isArray(row.items),
    `got ${typeof row.items}`,
  );

  const orders = await customerOrders(db, alice.id, 3);
  check(
    "   and every order the repo hands out has usable items",
    orders.every((o) => Array.isArray(o.items) && o.items.every((i) => typeof i.id === "string")),
  );
}

console.log("\n── abuse ──");
const bob = await upsertCustomer(db, { phone: "7447360802", name: "Bob" });

// 13/14. tampering
const tampered = quote({
  items: [{ id: "death-by-chocolate", qty: 1 }],
  reward: { type: "ORDER_6_FREE_BOWL", productId: "nutella-bliss" },
});
check("13. client cannot send its own price — the server prices from the catalogue",
  tampered.lines[0].bowl.price === 149,
);
const bobState = await loyaltyState(db, bob.id);
check("14. a reward id the customer never earned is rejected",
  validateRedemption({
    state: bobState, rewardId: freeBowl.id, productId: "tiramisu", cartProductIds: ["oreo-licious"],
  }).ok === false,
  "reward belongs to another customer",
);

// a fabricated count cannot conjure a reward: state comes from the database
check("14b. loyalty state is read from the server, not the request",
  (await loyaltyState(db, bob.id)).completedOrders === 0,
);

// the Mini Bowl is a real ₹69 product now, so it CAN be bought — what must
// not happen is it sneaking into a reward it was never meant for
const bought = quote({ items: [{ id: MINI_BOWL.id, qty: 2 }] });
check(
  "   the Mini Bowl is purchasable at its menu price",
  bought.lines.length === 1 && bought.total === MINI_BOWL.price * 2,
  `₹${bought.total} for 2 × ₹${MINI_BOWL.price}`,
);
check(
  "   a ₹69 Mini Bowl is not eligible for the ₹99 Signature reward",
  !isEligibleProduct("ORDER_3_SIGNATURE_BOWL_99", MINI_BOWL.id),
);
check(
  "   nor for the 6th Bite's free bowl",
  !isEligibleProduct("ORDER_6_FREE_BOWL", MINI_BOWL.id),
);

/* The bug this guards: a gifted item is not in the subtotal, so subtracting
   its price discounted the items the customer WAS paying for — a free ₹199
   bowl wiped out a ₹159 bowl and handed over both for nothing. */
{
  const q = quote({
    items: [{ id: "oreo-licious", qty: 1 }],
    reward: { type: "ORDER_6_FREE_BOWL", productId: "tiramisu" },
  });
  check(
    "   a free bowl does not also discount the bowls being paid for",
    q.total === 159 && q.giftLine?.id === "tiramisu",
    `charged ₹${q.total}, expected ₹159`,
  );
  check("   and its worth still counts as a saving", q.totalSaved === 199, `₹${q.totalSaved}`);
}

console.log("\n── order lifecycle ──");
const carol = await upsertCustomer(db, { phone: "7447360803", name: "Carol" });

// 8/9. pending and cancelled orders do not count
const pendingQuote = quote({ items: [{ id: "death-by-chocolate", qty: 1 }] });
const pending = await createOrder(db, {
  customerId: carol.id,
  items: pendingQuote.lines.map((l) => ({ id: l.bowl.id, qty: l.qty, price: l.bowl.price })),
  subtotal: pendingQuote.comboTotal,
  discount: 0,
  total: pendingQuote.total,
});
if ("error" in pending) throw new Error(pending.error);
check("8/9. an unconfirmed order counts for nothing",
  (await loyaltyState(db, carol.id)).completedOrders === 0,
);

await reverseOrder(db, pending.order.id, "cancelled");
check("8. a cancelled order still counts for nothing",
  (await loyaltyState(db, carol.id)).completedOrders === 0,
);

// 11. duplicate confirmation
const dupe = await orderAndComplete(carol.id, [{ id: "oreo-licious", qty: 1 }]);
const replay = await completeOrder(db, dupe.order.id);
check("11. confirming the same order twice adds one Bite, not two",
  replay.state.completedOrders === 1 && replay.counted === false,
  `count ${replay.state.completedOrders}`,
);

// 10. refund after completion
const refunded = await reverseOrder(db, dupe.order.id, "refunded");
check("10. a refund walks the journey back",
  refunded.state.completedOrders === 0,
);
/* Refunded back to zero orders, they are a first-timer again — and a
   first-timer is owed the welcome gift, so the 1st Bite's 20% survives. It
   buys them nothing extra: a stranger would be offered exactly the same. */
check("   and leaves the welcome gift standing, because they are a stranger again",
  refunded.state.completedOrders === 0 &&
    refunded.state.rewards.every((x) => x.milestone === 1 || x.status !== "available"),
  refunded.state.rewards.map((x) => `${x.milestone}:${x.status}`).join(" "),
);

/* The revocation that actually protects anything: a reward the new, lower
   count no longer entitles them to. Erin reaches 2 Bites — holding the 2nd
   Bite's 20% and the 3rd Bite's ₹99 bowl — and then her second order is
   refunded, which puts the ₹99 out of reach again. */
const erin = await upsertCustomer(db, { phone: "7447360881", name: "Erin" });
await orderAndComplete(erin.id, [{ id: "oreo-licious", qty: 1 }]);
const erinSecond = await orderAndComplete(erin.id, [{ id: "oreo-licious", qty: 1 }]);
const erinBefore = await loyaltyState(db, erin.id);
check("   two Bites hold the 2nd Bite's 20% and the 3rd Bite's ₹99 bowl",
  erinBefore.completedOrders === 2 &&
    erinBefore.rewards.some((x) => x.milestone === 2 && x.status === "available") &&
    erinBefore.rewards.some((x) => x.milestone === 3 && x.status === "available"),
  erinBefore.rewards.map((x) => `${x.milestone}:${x.status}`).join(" "),
);

const erinAfter = await reverseOrder(db, erinSecond.order.id, "refunded");
check("   refunding it revokes the ₹99 bowl, which is no longer earned",
  erinAfter.state.completedOrders === 1 &&
    erinAfter.state.rewards.find((x) => x.milestone === 3)?.status === "revoked",
  erinAfter.state.rewards.map((x) => `${x.milestone}:${x.status}`).join(" "),
);
check("   but the 2nd Bite's 20%, still earned at one order, is untouched",
  erinAfter.state.rewards.find((x) => x.milestone === 2)?.status === "available",
);

console.log("\n── concurrency ──");
const dave = await upsertCustomer(db, { phone: "7447360804", name: "Dave" });
await orderAndComplete(dave.id, [{ id: "death-by-chocolate", qty: 1 }]);
const daveReward = (await loyaltyState(db, dave.id)).rewards.find((x) => x.status === "available")!;

// 12/16. two redemptions at once — the database picks a winner
const both = await Promise.allSettled([
  createOrder(db, {
    customerId: dave.id,
    items: [{ id: "oreo-licious", qty: 1, price: 159 }],
    subtotal: 159, discount: 32, total: 127, rewardId: daveReward.id,
  }),
  createOrder(db, {
    customerId: dave.id,
    items: [{ id: "tiramisu", qty: 1, price: 199 }],
    subtotal: 199, discount: 40, total: 159, rewardId: daveReward.id,
  }),
]);
const won = both.filter((o) => o.status === "fulfilled" && !("error" in o.value)).length;
check("12/16. two simultaneous redemptions, exactly one succeeds", won === 1, `${won} succeeded`);

console.log("\n── a customer we have never seen ──");
{
  // the bug this guards: a first-time visitor was told they had finished all
  // six Bites, because "no next reward" was read as "journey complete"
  const fresh = { completedOrders: 0, rewards: [] };
  const next = nextReward(fresh.completedOrders);
  check(
    "a new customer has a reward ahead of them, not nothing",
    next?.milestone.n === 2 && next.ordersAway === 1,
    `got ${next ? `milestone ${next.milestone.n}, ${next.ordersAway} away` : "null"}`,
  );
  check(
    "a new customer is not 'journey complete'",
    !isJourneyComplete(fresh.completedOrders),
  );
  check(
    "only six completed orders counts as complete",
    [0, 1, 2, 3, 4, 5].every((n) => !isJourneyComplete(n)) && isJourneyComplete(6),
  );
  /* The last reward is in hand at five completed orders — it belongs to the
     sixth — so from five onward there is nothing further AHEAD. */
  check(
    "nothing lies ahead once the final reward is in hand",
    nextReward(5) === null && nextReward(6) === null && nextReward(4) !== null,
  );
}

console.log("\n── the ladder the owner asked for ──");
{
  /* Stated as the owner states it: which order gets which reward. Everything
     else in this file tests the machinery; this tests the deal. If someone
     changes `earnedAfter` — the field that decides money — this is what
     notices. */
  const ladder: [number, string][] = [
    [1, "20% OFF"],
    [2, "20% OFF"],
    [3, "Signature Bowl ₹99"],
    [4, "— no offer, full price —"],
    [5, "FREE Mini Bowl"],
    [6, "FREE Bowl 👑"],
  ];

  for (const [order, expected] of ladder) {
    // a reward is spendable on order N once N-1 orders are behind it
    const usable = MILESTONES.filter((m) => m.type !== null && m.earnedAfter === order - 1);
    const got = usable.length ? usable[0].short : "— no offer, full price —";
    check(`order #${order} → ${expected}`, got === expected, got === expected ? "" : `got "${got}"`);
  }

  check(
    "20% appears on the first two orders and nowhere else",
    MILESTONES.filter((m) => m.type?.endsWith("DISCOUNT_20")).every((m) => m.earnedAfter <= 1),
  );
}

console.log("\n── the strip's copy ──");
check(
  "every reward milestone names its own call to action",
  MILESTONES.filter((m) => m.type !== null).every((m) => m.cta.length > 0 && m.checkout.length > 0),
);
check(
  "the 4th stays quiet: no reward, no call to action, no checkout line",
  MILESTONES[3].type === null && MILESTONES[3].cta === "" && MILESTONES[3].tone === "quiet",
);
check(
  "the three real prizes are the emphasised ones",
  [3, 5, 6].every((n) => MILESTONES[n - 1].tone === "major"),
);
check(
  "compact labels stay short enough for a 360px row",
  MILESTONES.every((m) => m.compact.length <= 11),
  MILESTONES.map((m) => m.compact).join(" | "),
);

console.log("\n── after the sixth ──");
const post = journeyView({ completedOrders: 8, rewards: [] });
check("   a 7th and 8th order do not invent new rewards",
  post.length === 6 && nextReward(8) === null,
);
check("   and the journey reads as finished", biteClub.completeHeadline.includes("👑"));

console.log("\n── round trips ──");

/* The admin panel's confirm button used to run ten to nineteen statements in
   series — a lock, a count, then one INSERT per earned milestone in a loop,
   then the ledger, then two more to read the state back. Against a database
   in another region that is several seconds with a row lock held open.
   Everything now happens inside complete_order(). */
const timed = await upsertCustomer(db, { phone: "7447360882", name: "Tess" });
await orderAndComplete(timed.id, [{ id: "oreo-licious", qty: 1 }]);
await orderAndComplete(timed.id, [{ id: "oreo-licious", qty: 1 }]);

// a pending order to confirm, at a count where several rewards are in play
const toConfirm = await createOrder(db, {
  customerId: timed.id,
  items: [{ id: "oreo-licious", qty: 1, price: 149 }],
  subtotal: 149,
  discount: 0,
  total: 149,
});
if ("error" in toConfirm) throw new Error(toConfirm.error);

let mark = roundTrips;
const confirmed = await completeOrder(db, toConfirm.order.id);
check(
  "confirming an order is ONE statement, whatever the ladder is holding",
  roundTrips - mark === 1,
  `${roundTrips - mark} statement(s), ${confirmed.state.rewards.length} reward rows`,
);

mark = roundTrips;
await reverseOrder(db, toConfirm.order.id, "refunded");
check(
  "so is refunding one",
  roundTrips - mark === 1,
  `${roundTrips - mark} statement(s)`,
);

mark = roundTrips;
await completeOrder(db, toConfirm.order.id);
check(
  "   and so is a replayed confirmation that changes nothing",
  roundTrips - mark === 1,
  `${roundTrips - mark} statement(s)`,
);

console.log("\n── the welcome gift ──");

/* The 20% a first-timer is promised in the hero. It has no row until it is
   spent, so these cases are about the row appearing exactly once. */
const wendy = await upsertCustomer(db, { phone: "7447360877", name: "Wendy" });
const wendyState0 = await loyaltyState(db, wendy.id);

check(
  "a customer who has never ordered is owed the gift and holds no row",
  wendyState0.completedOrders === 0 && wendyState0.rewards.length === 0,
);

const claim1 = await claimWelcomeReward(db, wendy.id);
check("claiming it creates the row", !!claim1);

const claim2 = await claimWelcomeReward(db, wendy.id);
check(
  "claiming twice returns the same row, never a second one",
  claim2?.id === claim1?.id,
  `${claim1?.id} / ${claim2?.id}`,
);

const wendyRows = await loyaltyState(db, wendy.id);
check(
  "   so the customer holds exactly one 20% reward",
  wendyRows.rewards.length === 1 && wendyRows.rewards[0].milestone === 1,
);

/* The whole point: it can be spent on the FIRST order, which the old ladder
   did not allow — validateRedemption used to refuse it at zero orders. */
const verdict = validateRedemption({
  state: wendyRows,
  rewardId: claim1!.id,
  cartProductIds: ["death-by-chocolate"],
});
check("it may be spent on the very first order", verdict.ok, verdict.ok ? "" : verdict.reason);

const welcomeQuote = quote({
  items: [{ id: "death-by-chocolate", qty: 1 }],
  reward: { type: "ORDER_1_DISCOUNT_20" },
});
check(
  "   and it takes 20% off that order",
  welcomeQuote.reward?.amount === Math.round(welcomeQuote.comboTotal * 0.2) &&
    welcomeQuote.total === welcomeQuote.comboTotal - welcomeQuote.reward!.amount,
  `${welcomeQuote.comboTotal} − ${welcomeQuote.reward?.amount} = ${welcomeQuote.total}`,
);

const wendyDone = await orderAndComplete(
  wendy.id,
  [{ id: "death-by-chocolate", qty: 1 }],
  claim1!.id,
);
check(
  "spending it on the first order still counts as the 1st Bite",
  wendyDone.state.completedOrders === 1,
);
/* The ladder gives 20% on the FIRST order and 20% on the second, so
   completing the 1st Bite hands over the 2nd Bite's discount — and nothing
   more. The welcome one stays spent. */
check(
  "   and completing that Bite hands the 2nd order its own 20%",
  wendyDone.state.rewards.length === 2 &&
    wendyDone.state.rewards.find((x) => x.milestone === 1)?.status === "redeemed" &&
    wendyDone.state.rewards.find((x) => x.milestone === 2)?.status === "available",
  wendyDone.state.rewards.map((x) => `${x.milestone}:${x.type}:${x.status}`).join(" "),
);
check(
  "   the gift cannot be claimed again once an order holds it",
  (await claimWelcomeReward(db, wendy.id)) === null,
);

/* Someone who never claims the welcome gift simply does not get it: it
   belongs to the first order, and that order has been and gone. They are not
   left holding a spare 20% to spend on the third order, where the ladder says
   the ₹99 bowl belongs. The 2nd Bite's discount is still theirs. */
const vlad = await upsertCustomer(db, { phone: "7447360878", name: "Vlad" });
const vladDone = await orderAndComplete(vlad.id, [{ id: "oreo-licious", qty: 1 }]);
check(
  "skipping the gift does not bank it for later",
  !vladDone.state.rewards.some((x) => x.milestone === 1),
  vladDone.state.rewards.map((x) => `${x.milestone}:${x.type}:${x.status}`).join(" "),
);
check(
  "   but the 2nd order still gets its own 20%",
  vladDone.state.rewards.some(
    (x) => x.type === "ORDER_2_DISCOUNT_20" && x.status === "available",
  ),
);

/* The invariant that keeps the discount from multiplying: at most one
   welcome gift per customer, and only if it was taken on the first order. */
check(
  "the welcome 20% exists at most once per customer",
  wendyDone.state.rewards.filter((x) => x.milestone === 1).length === 1 &&
    vladDone.state.rewards.filter((x) => x.milestone === 1).length === 0,
);

/* The rule the hero and the checkout both ask. These are the cases where the
   answer has to be no, because each one is a way of taking the gift twice. */
check(
  "the gift is refused once an order has been completed",
  !canClaimWelcome({ completedOrders: 1, rewards: [] }),
);
check(
  "   and once it has actually been spent",
  !canClaimWelcome({
    completedOrders: 0,
    rewards: [
      {
        id: "x",
        type: "ORDER_1_DISCOUNT_20",
        milestone: 1,
        status: "redeemed",
        earnedAt: "",
        redeemedAt: "",
        orderId: "o",
      },
    ],
  }),
);
check(
  "   but a row still sitting there available is theirs to spend",
  canClaimWelcome({
    completedOrders: 0,
    rewards: [
      {
        id: "x",
        type: "ORDER_1_DISCOUNT_20",
        milestone: 1,
        status: "available",
        earnedAt: "",
        redeemedAt: null,
        orderId: null,
      },
    ],
  }),
);
check(
  "   and a stranger is owed it",
  canClaimWelcome({ completedOrders: 0, rewards: [] }),
);
/* The customers built above are the real thing, straight out of Postgres. */
check(
  "the customer who spent it cannot claim it again",
  !canClaimWelcome(wendyDone.state),
);
check(
  "   and the one who skipped it is offered it no more either — it is a row now",
  !canClaimWelcome(vladDone.state) && vladDone.state.completedOrders === 1,
);

check(
  "the 1st Bite no longer promises a discount it already gave away",
  !/next website order gets 20/i.test(MILESTONES[0].completedBody),
  MILESTONES[0].completedBody,
);

console.log("\n── the hero ticket ──");

/* The ticket only ever reads a snapshot, so a literal one is the whole
   fixture. Anything the four states get wrong here is wrong on the first
   screen, which is the most expensive place to be wrong. */
function snap(over: Partial<LoyaltySnapshot>): LoyaltySnapshot {
  return {
    customer: { name: "Asha", phone: "9999999999" },
    state: { completedOrders: 0, rewards: [] },
    journey: [],
    next: null,
    offer: null,
    history: [],
    ...over,
  };
}

const unseen = ticketView(null);
check(
  "a browser we have never seen is invited, not interrogated",
  unseen.tone === "invite" && !unseen.known && unseen.earned === 0 && unseen.readyAt === null,
  `${unseen.lead} / ${unseen.cta}`,
);
check(
  "   and nothing in that invitation asks anyone to sign up",
  !/sign ?up|join|register/i.test(`${unseen.lead} ${unseen.cta}`),
);

const midway = ticketView(
  snap({
    state: { completedOrders: 2, rewards: [] },
    next: { label: "3rd Bite", short: "Signature Bowl ₹99", ordersAway: 1 },
  }),
);
check(
  "a returning customer with nothing to spend is shown where the next order lands",
  midway.tone === "journey" && midway.earned === 2 && midway.lead.includes("2 of 6 Bites"),
  `${midway.lead} / ${midway.cta}`,
);

/* The 4th Bite carries no reward, so after three orders the next prize is two
   away — the ticket has to say so rather than promise it on the next order. */
const gap = ticketView(
  snap({
    state: { completedOrders: 3, rewards: [] },
    next: { label: "5th Bite", short: "FREE Mini Bowl", ordersAway: 2 },
  }),
);
check(
  "   and the rewardless 4th Bite is counted honestly, not glossed over",
  gap.cta === heroTicket.moreAway(2) && gap.cta !== heroTicket.oneAway,
  gap.cta,
);

const holding = ticketView(
  snap({
    state: { completedOrders: 3, rewards: [] },
    offer: {
      id: "r1",
      type: "ORDER_3_SIGNATURE_BOWL_99",
      label: "Signature Bowl ₹99",
      detail: "",
      choices: [],
    },
  }),
);
const third = MILESTONES[2];
check(
  "an unspent reward outranks progress and speaks in the milestone's own words",
  holding.tone === "reward" && holding.lead.includes(third.short) && holding.cta === third.cta,
  `${holding.lead} / ${holding.cta}`,
);
check(
  "   its dot is the one that pulses",
  holding.readyAt === 3,
);
check(
  "   and it points at the bowls the reward can be spent on, not the whole menu",
  holding.href === "#signature",
);

const percent = ticketView(
  snap({
    state: { completedOrders: 1, rewards: [] },
    offer: {
      id: "r2",
      type: "ORDER_1_DISCOUNT_20",
      label: "20% OFF",
      detail: "",
      choices: [],
    },
  }),
);
check(
  "   a percentage applies to anything, so that one opens the whole menu",
  percent.href === "#menu",
);

const vip = ticketView(snap({ state: { completedOrders: 6, rewards: [] } }));
check(
  "a finished journey says so instead of counting to seven",
  vip.tone === "vip" && vip.earned === 6 && !vip.lead.includes("7"),
  vip.lead,
);

const claimed = ticketView(null, true);
check(
  "once the gift is taken the ticket confirms it instead of selling it again",
  claimed.tone === "claimed" && claimed.lead !== unseen.lead,
  `${claimed.lead} / ${claimed.cta}`,
);
check(
  "   and it stops asking to be tapped",
  !/tap/i.test(claimed.cta),
  claimed.cta,
);
check(
  "   a claim cannot resurrect the invitation",
  ticketView(null, true).tone !== "invite",
);
/* A reward the server has actually granted outranks a claim held in this
   browser — otherwise a returning customer's ₹99 bowl would be hidden behind
   a welcome gift they used months ago. */
check(
  "   a real server reward still wins over a local claim",
  ticketView(
    snap({
      state: { completedOrders: 3, rewards: [] },
      offer: {
        id: "r9",
        type: "ORDER_3_SIGNATURE_BOWL_99",
        label: "Signature Bowl ₹99",
        detail: "",
        choices: [],
      },
    }),
    true,
  ).tone === "reward",
);

/* The ticket sits above the headline on a 360px screen. Every state has to
   fit there, in both lines. */
const everyState = [unseen, claimed, midway, gap, holding, percent, vip];
check(
  "every state fits the hero's two lines at 360px",
  everyState.every((v) => v.lead.length <= 34 && v.cta.length <= 46),
  everyState.map((v) => `${v.lead.length}/${v.cta.length}`).join(" · "),
);
check(
  "no state is ever blank",
  everyState.every((v) => v.lead.trim() !== "" && v.cta.trim() !== ""),
);
/* The ribbon is a flourish across the ticket's corner, not a third line of
   copy: long wording there would reach the progress dots at 360px. */
check(
  "every state's ribbon stays two words wide",
  everyState.every((v) => v.ribbon.trim() !== "" && v.ribbon.length <= 16),
  everyState.map((v) => v.ribbon).join(" · "),
);

console.log("\n── an account the ladder moved under ──");
{
  /* The real case: this customer reached four Bites while the Mini Bowl sat
     at the sixth order, so nothing ever wrote a row for the fifth. The
     count says it is theirs on the next order; the rows say they have
     nothing. That gap has to close by itself, because the alternative is
     editing the production database by hand for every such customer. */
  const legacy = await upsertCustomer(db, { phone: "7447360883", name: "Legacy" });
  for (let i = 0; i < 4; i++) await orderAndComplete(legacy.id, [{ id: "death-by-chocolate", qty: 1 }]);

  // forget the fifth-order reward, exactly as the old ladder left it
  await db.query(`delete from loyalty_rewards where customer_id = $1 and milestone = 5`, [legacy.id]);

  let state = await loyaltyState(db, legacy.id);
  check(
    "the gap is spotted from the count, not the rows",
    missingEarnedMilestones(state).join() === "5",
    missingEarnedMilestones(state).join() || "(none)",
  );
  check("and nothing is on offer while the row is missing", redeemableReward(state) === null);

  await grantMissingRewards(db, legacy.id, missingEarnedMilestones(state));
  state = await loyaltyState(db, legacy.id);
  const healed = redeemableReward(state);
  check(
    "granting it puts the FREE Mini Bowl on their next order",
    healed?.milestone === 5 && healed.type === "ORDER_5_FREE_MINI_BOWL",
    healed ? `${healed.milestone} ${healed.type}` : "nothing",
  );
  check("and the gap is closed", missingEarnedMilestones(state).length === 0);

  // a second pass must be a no-op: two tabs open is not two Mini Bowls
  await grantMissingRewards(db, legacy.id, [5]);
  const after = await loyaltyState(db, legacy.id);
  check(
    "healing twice grants once",
    after.rewards.filter((r) => r.milestone === 5).length === 1,
  );

  /* Only the reward in front of them. Milestones they walked past under the
     old ladder are gone — granting those after the fact would be inventing
     rewards nobody was ever offered. */
  await db.query(`delete from loyalty_rewards where customer_id = $1 and milestone in (2, 3)`, [legacy.id]);
  const stripped = await loyaltyState(db, legacy.id);
  check(
    "milestones already walked past are not resurrected",
    missingEarnedMilestones(stripped).length === 0,
    missingEarnedMilestones(stripped).join(),
  );
}

console.log(`\n${fail === 0 ? `ALL PASS (${pass})` : `${fail} FAILURES of ${pass + fail}`}`);
await pg.close();
process.exit(fail === 0 ? 0 : 1);
