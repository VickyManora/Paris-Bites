/**
 * What an order costs, decided here and nowhere else.
 *
 * The browser sends product ids and quantities. It does not send prices,
 * discounts, totals, or what a reward is worth — every one of those is
 * looked up or computed from the catalogue and the reward ladder on the
 * server. A tampered price in a request body has nothing to tamper with:
 * the field does not exist.
 *
 * The same function runs in the cart drawer so the customer sees the real
 * number before they order, and on the server when the order is written.
 * One implementation, so the two cannot disagree.
 */
import { menu } from "../content";
import { findBowl, itemLabel, priceCart, type CartLine } from "../pricing";
import { milestoneForType, type RewardType } from "./config";
import { properName } from "../names";

export type QuoteItem = { id: string; qty: number };

export type AppliedReward = {
  type: RewardType;
  /** the item the reward was spent on, for fixed-price and free-item rewards */
  productId?: string;
  label: string;
  /** rupees off the bill; always the server's own arithmetic */
  amount: number;
};

export type Quote = {
  lines: CartLine[];
  /** every item at its menu price */
  listTotal: number;
  /** after the 2-for combo prices */
  comboTotal: number;
  comboSavings: number;
  reward: AppliedReward | null;
  /** a free item the reward adds to the order, priced at zero */
  giftLine: { id: string; name: string } | null;
  total: number;
  totalSaved: number;
  currency: string;
};

/**
 * Price a cart, optionally spending one reward on it.
 *
 * Callers must have validated the reward against the customer's loyalty state
 * first (see engine.validateRedemption) — this function trusts only that the
 * reward type is real, and computes the money.
 */
export function quote({
  items,
  reward,
}: {
  items: QuoteItem[];
  reward?: { type: RewardType; productId?: string } | null;
}): Quote {
  const lines: CartLine[] = [];

  for (const item of items) {
    const found = findBowl(item.id);
    if (!found) continue; // unknown id: silently dropped, never priced

    const qty = Math.min(Math.max(0, Math.floor(item.qty)), 99);
    if (qty > 0) lines.push({ ...found, qty });
  }

  const base = priceCart(lines);
  const listTotal = base.listTotal;
  const comboTotal = base.comboTotal;

  let applied: AppliedReward | null = null;
  let gift: Quote["giftLine"] = null;
  /** the menu price of a gifted item — a real saving, just not a discount */
  let giftValue = 0;
  let total = comboTotal;

  const mechanic = reward ? milestoneForType(reward.type)?.mechanic : null;

  if (reward && mechanic) {
    if (mechanic.kind === "percent") {
      // rounded to the rupee: this is settled in cash at the cart
      const amount = Math.round((comboTotal * mechanic.percent) / 100);
      total = comboTotal - amount;
      applied = { type: reward.type, label: `${mechanic.percent}% OFF`, amount };
    }

    if (mechanic.kind === "fixed-price" && reward.productId) {
      const item = findBowl(reward.productId);
      const inCart = lines.some((l) => l.bowl.id === reward.productId);

      if (item && inCart) {
        /* One unit is repriced, not the whole line. The saving is measured
           against the menu price of that unit; the combo maths above already
           settled the rest of the cart, so the two cannot both claim it. */
        const amount = Math.max(0, Math.min(comboTotal, item.bowl.price - mechanic.price));
        total = comboTotal - amount;
        applied = {
          type: reward.type,
          productId: reward.productId,
          label: `${item.bowl.name} for ${menu.currency}${mechanic.price}`,
          amount,
        };
      }
    }

    if (mechanic.kind === "free-item" && reward.productId) {
      const item = findBowl(reward.productId);

      if (item) {
        /* The gift rides along with the order rather than joining the cart:
           it is never a priced line, so no combo, percentage or later reward
           can be computed against it.

           And it does NOT discount the rest of the order. Subtracting its
           price from `comboTotal` — which never contained it — made a free
           ₹199 bowl wipe out a ₹159 bowl the customer was paying for, and
           hand them the lot for nothing. The gift is free; everything else
           costs what it costs. */
        gift = { id: item.bowl.id, name: item.bowl.name };
        giftValue = item.bowl.price;
        applied = {
          type: reward.type,
          productId: item.bowl.id,
          label: `FREE ${item.bowl.name}`,
          // what the gift is worth, for the receipt and the "you saved" line
          amount: item.bowl.price,
        };
      }
    }
  }

  return {
    lines,
    listTotal,
    comboTotal,
    comboSavings: base.savings,
    reward: applied,
    giftLine: gift,
    total,
    // the gift never entered listTotal, so its worth is added to the saving
    totalSaved: listTotal - total + giftValue,
    currency: menu.currency,
  };
}

/** the WhatsApp message for a placed order, built from the server's own quote */
export function orderMessage({
  quote: q,
  name,
  code,
}: {
  quote: Quote;
  name: string;
  code: string;
}): string {
  const parts = [`Hi Paris Bites! I'd like to order:`, "", `Order code: ${code}`, ""];

  /* Every line says what it is — the same dessert name is sold as both a
     bowl and a waffle, and this message is what the kitchen packs from. */
  for (const line of q.lines) {
    parts.push(
      `• ${line.qty} × ${itemLabel(line.bowl.id)} — ${q.currency}${line.bowl.price * line.qty}`,
    );
  }

  if (q.giftLine) parts.push(`• 1 × ${itemLabel(q.giftLine.id)} — FREE (Bite Club reward)`);

  if (q.comboSavings > 0) parts.push("", `Combo applied: −${q.currency}${q.comboSavings}`);

  if (q.reward) {
    parts.push(
      "",
      `Subtotal: ${q.currency}${q.comboTotal}`,
      `Bite Club reward — ${q.reward.label}${
        q.reward.amount > 0 ? `: −${q.currency}${q.reward.amount}` : ""
      }`,
    );
  }

  parts.push("", `Total: ${q.currency}${q.total}`);
  if (q.totalSaved > 0) parts.push(`(saved ${q.currency}${q.totalSaved})`);
  if (name.trim()) parts.push("", `Name: ${properName(name)}`);

  return parts.join("\n");
}
