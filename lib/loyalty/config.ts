/**
 * ─────────────────────────────────────────────────────────────
 *  PARIS BITES BITE CLUB — THE REWARD LADDER.
 *
 *  This file is the only place the ladder is defined. The cart, the
 *  dashboard, the admin panel and the server-side price check all read
 *  it, so changing a reward here changes it everywhere and nowhere else.
 *
 *  Never hardcode a milestone, a percentage or a product id in a
 *  component. If you find yourself wanting to, add a field here.
 * ─────────────────────────────────────────────────────────────
 */
import { menu, waffles, type Bowl, type Category } from "../content";

/** the journey is six orders long; milestone 1 is the first completed order */
export const JOURNEY_LENGTH = 6;

export type RewardType =
  | "ORDER_1_DISCOUNT_20"
  | "ORDER_2_DISCOUNT_20"
  | "ORDER_3_SIGNATURE_BOWL_99"
  | "ORDER_5_FREE_MINI_BOWL"
  | "ORDER_6_FREE_BOWL";

/** how a reward changes the bill; the server computes the amount, never the client */
export type RewardMechanic =
  /** a percentage off the order subtotal */
  | { kind: "percent"; percent: number }
  /** one eligible item repriced to a fixed amount */
  | { kind: "fixed-price"; price: number; eligible: EligibilityRule }
  /** one eligible item added at no charge */
  | { kind: "free-item"; eligible: EligibilityRule };

/**
 * Which products a reward may be spent on, expressed against the catalogue's
 * own category ids — never against product names, which change.
 */
export type EligibilityRule = { categories: string[] };

export type Milestone = {
  /** 1-based position in the journey */
  n: number;
  /**
   * How many completed orders a customer needs before this reward can be
   * spent — always `n - 1`, because the reward belongs TO its order rather
   * than being paid out after it. The 1st Bite's 20% is spendable with zero
   * completed orders, which is to say on the very first order; the 3rd
   * Bite's ₹99 bowl needs two behind it, which is to say the third order.
   *
   * This is the field that decides money. Nothing reads `n` to work out
   * eligibility, so the ladder can be reordered or extended here without
   * touching the engine, the SQL or the cart.
   */
  earnedAfter: number;
  /** "1st Bite", used in every surface */
  label: string;
  /** "1st", for the compact strip on the menu */
  ordinal: string;
  type: RewardType | null;
  /** what the customer sees on the card, e.g. "20% OFF" */
  short: string;
  /** two words at most — this has to read at 360px wide */
  compact: string;
  /**
   * How loudly this milestone is drawn. The three real prizes carry the
   * journey, so they are `major`; the 4th has no reward and is deliberately
   * `quiet` — dressing it up as a discount would be a small lie that the
   * cart then has to take back.
   */
  tone: "major" | "standard" | "quiet";
  /** one line of detail under it */
  detail: string;
  mechanic: RewardMechanic | null;
  /** what the cart says when this reward is the one on offer */
  checkout: string;
  /**
   * The call to action once this reward is sitting there unspent. Named for
   * the prize rather than the transaction — "collect your FREE Mini Bowl"
   * is a reason to order; "Order now" is a button.
   */
  cta: string;
  /** the line shown the moment this bite is completed */
  completedHeadline: string;
  completedBody: string;
};

/* Signature Bowls are already a category in the catalogue, so the ₹99 reward
   keys off the category id. Adding a bowl to that category makes it eligible
   automatically — nothing here needs editing. */
const SIGNATURE = "signature";
const MINI = "mini";

export const MILESTONES: Milestone[] = [
  {
    n: 1,
    earnedAfter: 0,
    cta: "Order now and save 20%",
    checkout: "💕 Welcome gift · 20% OFF",
    ordinal: "1st",
    compact: "20% off",
    tone: "standard",
    label: "1st Bite",
    type: "ORDER_1_DISCOUNT_20",
    short: "20% OFF",
    detail: "Our welcome gift, on your very first order",
    mechanic: { kind: "percent", percent: 20 },
    completedHeadline: "1st Bite complete!",
    /* It cannot promise 20% off the next order any more: this milestone's
       20% was the welcome gift, spent on the order that just completed. The
       next discount is the 2nd Bite's, one Bite away. */
    completedBody: "One more Bite and 20% OFF is yours again.",
  },
  {
    n: 2,
    earnedAfter: 1,
    cta: "Order now and save 20%",
    checkout: "💕 Bite Club reward · 20% OFF",
    ordinal: "2nd",
    compact: "20% off",
    tone: "standard",
    label: "2nd Bite",
    type: "ORDER_2_DISCOUNT_20",
    short: "20% OFF",
    detail: "Because once is never enough",
    mechanic: { kind: "percent", percent: 20 },
    completedHeadline: "2nd Bite complete!",
    completedBody: "Your Signature Bowl on your 3rd Bite is only ₹99.",
  },
  {
    n: 3,
    earnedAfter: 2,
    cta: "Order and get your ₹99 Signature Bowl",
    checkout: "🍫 Reward unlocked · any Signature Bowl for ₹99",
    ordinal: "3rd",
    compact: "₹99 bowl",
    tone: "major",
    label: "3rd Bite",
    type: "ORDER_3_SIGNATURE_BOWL_99",
    short: "Signature Bowl ₹99",
    detail: "Any Signature Bowl, yours for ₹99",
    mechanic: { kind: "fixed-price", price: 99, eligible: { categories: [SIGNATURE] } },
    completedHeadline: "3rd Bite complete!",
    completedBody: "Your ₹99 Signature Bowl reward is unlocked.",
  },
  {
    n: 4,
    earnedAfter: 3,
    cta: "",
    checkout: "",
    ordinal: "4th",
    compact: "Keep going",
    tone: "quiet",
    label: "4th Bite",
    type: null,
    short: "Keep going ♡",
    detail: "You're halfway there",
    mechanic: null,
    completedHeadline: "4th Bite complete 💕",
    completedBody: "You're halfway through your journey. One more Bite to your FREE Mini Bowl.",
  },
  {
    n: 5,
    earnedAfter: 4,
    cta: "Order and collect your FREE Mini Bowl",
    checkout: "🎁 Your FREE Mini Bowl is unlocked",
    ordinal: "5th",
    compact: "Free mini",
    tone: "major",
    label: "5th Bite",
    type: "ORDER_5_FREE_MINI_BOWL",
    short: "FREE Mini Bowl",
    detail: "On the house, with your bowl",
    mechanic: { kind: "free-item", eligible: { categories: [MINI] } },
    completedHeadline: "5th Bite complete!",
    completedBody: "Your FREE Mini Bowl is unlocked. One more Bite to your FREE Bowl!",
  },
  {
    n: 6,
    earnedAfter: 5,
    cta: "Order and claim your FREE Bowl",
    checkout: "👑 Your FREE Bowl is unlocked",
    ordinal: "6th",
    compact: "Free bowl",
    tone: "major",
    label: "6th Bite",
    type: "ORDER_6_FREE_BOWL",
    short: "FREE Bowl 👑",
    detail: "Any bowl on the menu, free",
    mechanic: { kind: "free-item", eligible: { categories: [SIGNATURE, "premium"] } },
    completedHeadline: "6th Bite complete! 👑",
    completedBody: "You're officially a Bite Club VIP. Your FREE Bowl reward is unlocked.",
  },
];

/**
 * The welcome gift's stand-in id.
 *
 * A reward is normally a database row, and the row is what stops it being
 * spent twice. The welcome gift has no row until it is spent, because the
 * customer it belongs to does not exist until then — they have never ordered,
 * and creating an account for everyone who types a phone number into the cart
 * would fill the table with people who never came back.
 *
 * So the browser is handed this sentinel instead of a real id, and the server
 * turns it into a row at the moment the order is placed — under the same
 * unique index and the same conditional claim as every other reward. The
 * browser still cannot mint a discount: it names an intention, and the server
 * decides whether it is owed.
 */
export const WELCOME_OFFER_ID = "welcome";

/** the milestone the welcome gift belongs to */
export const WELCOME_MILESTONE = 1;

export function milestone(n: number): Milestone | undefined {
  return MILESTONES.find((m) => m.n === n);
}

export function milestoneForType(type: RewardType): Milestone | undefined {
  return MILESTONES.find((m) => m.type === type);
}

/**
 * The Mini Bowl.
 *
 * A real ₹69 product on the menu, and the prize for the 5th Bite. It is read
 * from the catalogue rather than described again here: a second definition
 * would be a second price, and the two would drift the first time one
 * changed.
 */
export const MINI_BOWL: Bowl = (() => {
  const found = menu.categories
    .find((c) => c.id === MINI)
    ?.items.find((i) => i.id === "mini-bowl");

  if (!found) throw new Error("The Mini Bowl is missing from the menu in lib/content.ts");
  return found;
})();

/** every product a reward may be spent on, by reward type */
export function eligibleProducts(type: RewardType): Bowl[] {
  const rule = milestoneForType(type)?.mechanic;
  if (!rule || rule.kind === "percent") return [];

  const ids = new Set(rule.eligible.categories);
  // annotated, so the mixed bowl/waffle literals collapse to one product type
  const categories: Category[] = [...menu.categories, waffles.category];
  return categories.filter((c) => ids.has(c.id)).flatMap((c) => c.items);
}

export function isEligibleProduct(type: RewardType, productId: string): boolean {
  return eligibleProducts(type).some((p) => p.id === productId);
}

/* ── Copy ──────────────────────────────────────────────────
   Kept beside the ladder so the wording and the rules can never drift
   apart. Everything customer-facing about Bite Club is here.
   ───────────────────────────────────────────────────────── */
export const biteClub = {
  name: "Bite Club",
  fullName: "Paris Bites Bite Club",
  /** the three-word promise, used as the section's subtitle */
  promise: "Order. Earn. Enjoy.",
  tagline: "6 Bites. 6 Rewards. 1 Delicious Journey.",
  exclusive: "Website exclusive",
  explainer: "Every website order automatically unlocks your next reward.",
  /* Shown while the server is being asked where someone stands. Saying
     nothing would mean showing a zero, and a customer on their 4th Bite
     reading "1st Bite" for half a second does not trust the rest of it. */
  checking: "Checking your Bites…",
  pitch:
    "Order directly from the Paris Bites website and your Bite Club journey starts automatically.",
  /* There is no joining. A customer's first completed website order creates
     their account and starts the journey, so nothing in this file may say
     "sign up", "join" or "register" — it would describe a step that does not
     exist and make a frictionless thing sound like work. */
  automatic: "No membership needed. Your first website order starts your journey.",
  orderCta: "Order now",
  /** shown above the row once we know where someone stands */
  youAreHere: "You're here",
  rewardReady: "ready to use",
  /** the dashboard's lookup — checking progress, not enrolling */
  lookupCta: "See my rewards",
  lookupHint: "Enter the number you order with to see your rewards.",
  emptyState: "Your journey starts with your first website order.",
  nextRewardLabel: "Your next reward",
  progressLabel: "Your journey",
  completeHeadline: "Journey complete 👑",
  completeBody:
    "You've finished all six Bites. Your FREE Bowl is waiting — we'll be in touch about what comes next.",
  historyTitle: "Your Paris Bites journey",
  note: "Rewards apply to orders placed on this website only.",
};

