import { menu, waffles, type Bowl, type Category } from "./content";

export type CartLine = { bowl: Bowl; category: Category; qty: number };

/** every orderable item, bowls and waffles alike, flattened with its category */
export const allBowls: { bowl: Bowl; category: Category }[] = [
  ...menu.categories,
  waffles.category,
].flatMap((category) => category.items.map((bowl) => ({ bowl, category })));

export function findBowl(id: string) {
  return allBowls.find((b) => b.bowl.id === id);
}

/**
 * Combo pricing.
 *
 * A category's `combo` price covers any TWO bowls from that category. Pairs are
 * formed from the most expensive bowls first, so the customer keeps the biggest
 * saving. The combo is only used when it actually beats paying separately —
 * two ₹149 bowls (₹298) must not be "upgraded" to the ₹299 combo.
 *
 * A category with no `combo` (waffles) is simply summed at list price.
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

  return { count, listTotal, total, savings: listTotal - total, combosApplied };
}

export function whatsappMessage(lines: CartLine[], name: string) {
  const { total, savings, combosApplied } = priceCart(lines);
  const rows = lines
    .filter((l) => l.qty > 0)
    .map((l) => `• ${l.qty} × ${l.bowl.name} — ${menu.currency}${l.bowl.price * l.qty}`);

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
  if (savings > 0) parts.push(`(saved ${menu.currency}${savings})`);
  if (name.trim()) parts.push("", `Name: ${name.trim()}`);

  return parts.join("\n");
}
