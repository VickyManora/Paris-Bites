import { menu } from "./lib/content";
import { priceCart, findBowl, whatsappMessage, type CartLine } from "./lib/pricing";

const line = (id: string, qty: number): CartLine => {
  const f = findBowl(id);
  if (!f) throw new Error("unknown bowl " + id);
  return { ...f, qty };
};

const cases: [string, CartLine[], number, number][] = [
  // label, lines, expected total, expected savings
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
for (const [label, lines, total, savings] of cases) {
  const p = priceCart(lines);
  const ok = p.total === total && p.savings === savings;
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}\n      total ${p.total} (want ${total})  savings ${p.savings} (want ${savings})  list ${p.listTotal}  count ${p.count}`,
  );
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
