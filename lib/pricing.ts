import { menu, waffles, type Bowl, type Category } from "./content";
import { baseProductId, productId, sizeLabel, sizeOf, type Size } from "./product-id";
import { properName } from "./names";

export type CartLine = { bowl: Bowl; category: Category; qty: number };

/** every orderable item, bowls and waffles alike, flattened with its category */
export const allBowls: { bowl: Bowl; category: Category }[] = [
  ...menu.categories,
  waffles.category,
].flatMap((category) => category.items.map((bowl) => ({ bowl, category })));

/** the sizes a product is sold in, smallest first */
export function sizesOf(bowl: Bowl): Size[] {
  return bowl.full === undefined ? ["mini", "regular"] : ["mini", "regular", "full"];
}

/** what one size of a product costs; undefined if it is not sold in that size */
export function priceFor(bowl: Bowl, size: Size): number | undefined {
  if (size === "mini") return bowl.mini;
  if (size === "full") return bowl.full;
  return bowl.price;
}

/**
 * One size of a product, as an ordinary Bowl whose `id` and `price` are that
 * size's. Undefined when the product is not sold in that size (a Full waffle).
 */
export function sizedBowl(bowl: Bowl, size: Size): Bowl | undefined {
  if (size === "regular") return bowl;
  const price = priceFor(bowl, size);
  if (price === undefined) return undefined;
  return {
    ...bowl,
    id: productId(bowl.id, size),
    price,
    /* A former price belongs to the regular size only — Mini and Full did
       not exist before this menu. The badge ("Bestseller") belongs to the
       dessert rather than to one size of it, and would otherwise print
       several times over. */
    original: undefined,
    badge: undefined,
  };
}

/**
 * The product an order line refers to, at the price for its size.
 *
 * This is the only place a sized id is unpicked. Everything downstream —
 * the cart, the combo maths, the quote, the order slip — receives an
 * ordinary Bowl whose `price` is already right for what was bought.
 * An id for a size the product is not sold in resolves to nothing, so it
 * can never be priced.
 */
export function findBowl(id: string) {
  const found = allBowls.find((b) => b.bowl.id === baseProductId(id));
  if (!found) return undefined;
  const bowl = sizedBowl(found.bowl, sizeOf(id));
  return bowl ? { category: found.category, bowl } : undefined;
}

/**
 * How an ordered item is written on a slip: "Death by Chocolate (Waffle)".
 *
 * The same dessert name is on the menu twice — once as a bowl, once as a
 * waffle, at different prices — and an order is read as a bare list by
 * whoever is packing the bag. A name on its own is genuinely ambiguous
 * there, so every line carries what it is.
 *
 * An id we no longer sell still has to print something: a stored order keeps
 * the name it was placed under, so pass that as `fallbackName` and an old
 * order stays readable after the item leaves the menu.
 */
export function itemLabel(id: string, fallbackName?: string): string {
  const found = findBowl(id);

  if (found) {
    const { name } = found.bowl;
    const { kind } = found.category;
    /* "Oreo Licious Bowl (Bowl)" helps nobody — a name that already says
       what it is keeps the line short. */
    const saysIt = new RegExp(`\\b${kind}\\b`, "i").test(name);
    const label = saysIt ? name : `${name} (${kind})`;
    /* The size goes last and always prints. Three sizes at three prices
       means a slip that says only "Oreo Licious Bowl" is an instruction to
       make the wrong one. */
    return `${label} · ${sizeLabel(sizeOf(id), kind)}`;
  }

  /* Ids that orders were placed under before the catalogue changed, kept so
     the order book stays readable. The Mini Bowl was first a reward-only
     item, then a ₹69 product of its own; it is now a size of every bowl,
     and orders carrying either of the old ids are still in the book. */
  const retired: Record<string, string> = {
    "mini-bowl": "Mini Bowl",
    "mini-bowl-reward": "Mini Bowl",
  };
  if (retired[id]) return retired[id];

  return fallbackName ?? id;
}

/**
 * Combo pricing, then the website offer.
 *
 * A category's `combo` price covers any TWO bowls from that category. Pairs are
 * formed from the most expensive bowls first, so the customer keeps the biggest
 * saving, and the combo is only used when it actually beats paying separately.
 *
 * NO CATEGORY CARRIES ONE TODAY. The 2-for offers were retired with the
 * September 2026 repricing, which cut bowls by 20–25% and left every
 * combo dearer than the two bowls it covered. The machinery stays because it
 * is correct and guarded — set `combo` on a category and it works — but
 * anything reading `combosApplied` is currently reading an empty list.
 *
 * There is no blanket website discount any more: Bite Club owns every
 * discount, and a reward is applied on top of this by lib/loyalty/quote.ts.
 * Keeping the two apart is what stops an order taking 20% twice.
 *
 *   listTotal   every item at its menu price
 *   comboTotal  after 2-for pricing — what a reward is then applied to
 *   savings     what the combos saved
 *   total       same as comboTotal; kept so callers need not change
 */
export function priceCart(lines: CartLine[]) {
  let listTotal = 0;
  let total = 0;

  const byCategory = new Map<string, { category: Category; units: number[] }>();

  for (const line of lines) {
    if (line.qty <= 0) continue;
    listTotal += line.bowl.price * line.qty;
    const entry = byCategory.get(line.category.id) ?? {
      category: line.category,
      units: [],
    };
    for (let i = 0; i < line.qty; i++) entry.units.push(line.bowl.price);
    byCategory.set(line.category.id, entry);
  }

  const combosApplied: { category: Category; count: number }[] = [];

  for (const { category, units } of byCategory.values()) {
    const combo = category.combo;
    if (combo === undefined) {
      total += units.reduce((sum, price) => sum + price, 0);
      continue;
    }

    units.sort((a, b) => b - a);
    let i = 0;
    let pairs = 0;

    while (i + 1 < units.length) {
      const pairSum = units[i] + units[i + 1];
      if (combo < pairSum) {
        total += combo;
        pairs++;
      } else {
        total += pairSum;
      }
      i += 2;
    }
    if (i < units.length) total += units[i];

    if (pairs > 0) combosApplied.push({ category, count: pairs });
  }

  const count = lines.reduce((n, l) => n + Math.max(0, l.qty), 0);
  const comboTotal = total;
  const savings = listTotal - comboTotal;

  return {
    count,
    listTotal,
    comboTotal,
    savings,
    combosApplied,
    total: comboTotal,
    totalSaved: savings,
  };
}

/**
 * The plain order message, with no loyalty in it.
 *
 * This is the fallback path: if the database is unreachable the cart must
 * still sell desserts, so the customer gets an ordinary WhatsApp order and
 * staff can add the Bite by hand later. A dessert cart does not stop trading
 * because Postgres is down.
 */
export function whatsappMessage(lines: CartLine[], name: string) {
  const { total, totalSaved, combosApplied } = priceCart(lines);
  const rows = lines
    .filter((l) => l.qty > 0)
    .map(
      (l) => `• ${l.qty} × ${itemLabel(l.bowl.id)} — ${menu.currency}${l.bowl.price * l.qty}`,
    );

  const parts = [
    `Hi Paris Bites! I'd like to order:`,
    "",
    ...rows,
  ];

  if (combosApplied.length) {
    parts.push(
      "",
      ...combosApplied.map((c) =>
        c.count === 1
          ? `Combo applied: 2 ${c.category.title} for ${menu.currency}${c.category.combo}`
          : `Combo applied: ${c.count} × (2 ${c.category.title} for ${menu.currency}${c.category.combo})`,
      ),
    );
  }

  parts.push("", `Total: ${menu.currency}${total}`);
  if (totalSaved > 0) parts.push(`(saved ${menu.currency}${totalSaved})`);
  if (name.trim()) parts.push("", `Name: ${properName(name)}`);

  return parts.join("\n");
}
