import { menu } from "./lib/content";
import { priceCart, findBowl, whatsappMessage, type CartLine } from "./lib/pricing";

const line = (id: string, qty: number): CartLine => {
  const f = findBowl(id);
  if (!f) throw new Error("unknown bowl " + id);
  return { ...f, qty };
};

/* `comboTotal` is the price after 2-for pricing and BEFORE the website
   offer; these cases pin the combo maths on its own. The website discount
   is checked separately below, because it is a flat percentage of exactly
   this number and would otherwise hide a combo bug behind a rounding. */
const cases: [string, CartLine[], number, number][] = [
  // label, lines, expected comboTotal, expected combo savings
  ["1 signature", [line("death-by-chocolate", 1)], 149, 0],
  ["2 signature (combo wins)", [line("death-by-chocolate", 1), line("oreo-licious", 1)], 299, 9],
  ["2× same cheapest signature (combo must NOT apply)", [line("death-by-chocolate", 2)], 298, 0],
  ["3 signature", [line("death-by-chocolate", 1), line("oreo-licious", 1), line("kitkat-break", 1)], 448, 29],
  ["4 signature", [line("death-by-chocolate", 2), line("oreo-licious", 1), line("kitkat-break", 1)], 597, 29],
  ["2 premium", [line("nutella-bliss", 1), line("blueberry-bliss", 1)], 399, 69],
  ["cross-category, no pair", [line("death-by-chocolate", 1), line("nutella-bliss", 1)], 388, 0],
  ["2 sig + 2 prem", [line("death-by-chocolate", 1), line("oreo-licious", 1), line("nutella-bliss", 1), line("blueberry-bliss", 1)], 698, 78],
  ["empty", [], 0, 0],
  ["qty zero is ignored", [line("death-by-chocolate", 0)], 0, 0],
  // waffles are their own category with no 2-for offer — always list price
  ["1 waffle", [line("waffle-death-by-chocolate", 1)], 149, 0],
  ["2 waffles, no combo applied", [line("waffle-death-by-chocolate", 2)], 298, 0],
  ["2 different waffles", [line("waffle-nutella-indulgence", 1), line("waffle-biscoff-bliss", 1)], 378, 0],
  ["all six waffles", [
    line("waffle-death-by-chocolate", 1), line("waffle-kitkat-break", 1),
    line("waffle-strawberry-bliss", 1), line("waffle-blueberry-dream", 1),
    line("waffle-nutella-indulgence", 1), line("waffle-biscoff-bliss", 1),
  ], 1024, 0],
  // a bowls combo must still apply when waffles share the cart
  ["2 signature bowls + 1 waffle", [line("oreo-licious", 2), line("waffle-kitkat-break", 1)], 299 + 159, 19],
];

let fail = 0;
for (const [label, lines, comboTotal, savings] of cases) {
  const p = priceCart(lines);
  const ok = p.comboTotal === comboTotal && p.savings === savings;
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}\n      combo total ${p.comboTotal} (want ${comboTotal})  savings ${p.savings} (want ${savings})  list ${p.listTotal}  count ${p.count}  payable ${p.total}`,
  );
}

/* The blanket website discount is gone — Bite Club owns discounts now, and
   they are tested in loyalty.test.mts against the real database. What must
   hold here is that priceCart itself takes nothing off beyond the combos. */
console.log("\n--- no discount beyond the combos ---");
for (const [label, lines] of cases) {
  const p = priceCart(lines);
  const ok = p.total === p.comboTotal && p.totalSaved === p.savings;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — total ${p.total} = combo total ${p.comboTotal}`);
}

// an empty cart must not produce a discount, or a WhatsApp message claiming one
{
  const p = priceCart([]);
  const ok = p.total === 0 && p.totalSaved === 0;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  empty cart costs nothing`);
}

// sanity: combo prices must actually beat the two cheapest in each category
for (const c of menu.categories) {
  const cheapest = c.items.map((i) => i.price).sort((a, b) => a - b).slice(0, 2);
  console.log(
    `\nNOTE ${c.title}: combo ₹${c.combo} vs two cheapest ₹${cheapest[0] + cheapest[1]} → ${
      c.combo < cheapest[0] + cheapest[1] ? "always a saving" : "no saving on the cheapest pair (guard handles it)"
    }`,
  );
}

console.log("\n--- sample WhatsApp message ---");
console.log(whatsappMessage([line("death-by-chocolate", 1), line("oreo-licious", 1), line("nutella-bliss", 1)], "Likhit"));

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail === 0 ? 0 : 1);
