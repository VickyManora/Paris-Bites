import { menu, waffles, type Category } from "./lib/content";
import { priceCart, findBowl, itemLabel, whatsappMessage, type CartLine } from "./lib/pricing";
import { productId } from "./lib/product-id";

const line = (id: string, qty: number): CartLine => {
  const f = findBowl(id);
  if (!f) throw new Error("unknown bowl " + id);
  return { ...f, qty };
};
const mini = (id: string, qty: number) => line(productId(id, "mini"), qty);
const full = (id: string, qty: number) => line(productId(id, "full"), qty);

/* The 2-for combos were retired with the September 2026 repricing: two Full
   Signature bowls come to ₹248 where the combo asked ₹299, which is not an
   offer. So a cart is now the plain sum of its lines, and these cases pin
   that — including the shapes that USED to be discounted, because a combo
   quietly coming back is a price change nobody decided. */
const cases: [string, CartLine[], number, number][] = [
  // label, lines, expected total, expected savings — bare ids are Medium bowls / Regular waffles
  ["1 signature", [line("death-by-chocolate", 1)], 129, 0],
  ["2 signature (no combo any more)", [line("death-by-chocolate", 1), line("oreo-licious", 1)], 268, 0],
  ["2× the same signature", [line("death-by-chocolate", 2)], 258, 0],
  ["3 signature", [line("death-by-chocolate", 1), line("oreo-licious", 1), line("kitkat-break", 1)], 407, 0],
  ["2 premium", [line("nutella-bliss", 1), line("blueberry-bliss", 1)], 348, 0],
  ["cross-category", [line("death-by-chocolate", 1), line("nutella-bliss", 1)], 308, 0],
  ["2 sig + 2 prem", [line("death-by-chocolate", 1), line("oreo-licious", 1), line("nutella-bliss", 1), line("blueberry-bliss", 1)], 616, 0],
  ["empty", [], 0, 0],
  ["qty zero is ignored", [line("death-by-chocolate", 0)], 0, 0],
  ["1 waffle", [line("waffle-death-by-chocolate", 1)], 129, 0],
  ["2 waffles", [line("waffle-death-by-chocolate", 2)], 258, 0],
  ["2 different waffles", [line("waffle-nutella-indulgence", 1), line("waffle-biscoff-bliss", 1)], 338, 0],
  ["all six waffles", [
    line("waffle-death-by-chocolate", 1), line("waffle-kitkat-break", 1),
    line("waffle-strawberry-bliss", 1), line("waffle-blueberry-dream", 1),
    line("waffle-nutella-indulgence", 1), line("waffle-biscoff-bliss", 1),
  ], 129 + 139 + 149 + 149 + 169 + 169, 0],
  ["bowls and a waffle together", [line("oreo-licious", 2), line("waffle-kitkat-break", 1)], 278 + 139, 0],
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

console.log("\n── nothing comes off the list price here ──");
for (const [label, lines] of cases) {
  const p = priceCart(lines);
  const ok = p.total === p.listTotal && p.totalSaved === 0;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ₹${p.total} = list ₹${p.listTotal}`);
}

console.log("\n── every size is priced as itself ──");
{
  const cases: [string, CartLine[], number][] = [
    ["a Mini bowl is its own price", [mini("death-by-chocolate", 1)], 79],
    ["a Full bowl is its own price", [full("death-by-chocolate", 1)], 199],
    ["two Minis", [mini("death-by-chocolate", 2)], 158],
    ["Mini, Medium and Full of one dessert are separate lines",
      [mini("death-by-chocolate", 1), line("death-by-chocolate", 1), full("death-by-chocolate", 1)], 79 + 129 + 199],
    ["the dearest Mini bowl", [mini("nutella-bliss", 1)], 99],
    ["the dearest Full bowl", [full("nutella-bliss", 1)], 269],
    ["a Mini waffle", [mini("waffle-death-by-chocolate", 1)], 79],
    ["Minis across the menu",
      [mini("oreo-licious", 1), mini("tiramisu", 1), mini("waffle-biscoff-bliss", 1)], 79 + 89 + 99],
    ["Fulls across the menu, with quantity",
      [full("oreo-licious", 2), full("tiramisu", 1), full("biscoff-delight", 1)], 2 * 209 + 249 + 269],
  ];
  for (const [label, lines, expected] of cases) {
    const p = priceCart(lines);
    const ok = p.total === expected;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ₹${p.total} (want ₹${expected})`);
  }

  // three sizes of one dessert must not collapse into a single line
  const three = priceCart([mini("oreo-licious", 1), line("oreo-licious", 1), full("oreo-licious", 1)]);
  const ok = three.count === 3 && three.total === 79 + 139 + 209;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  three sizes of one dessert stay three lines — ${three.count} items, ₹${three.total}`);

  // waffles have no Full: such an id must never be priced
  const noFull = findBowl(productId("waffle-death-by-chocolate", "full"));
  if (noFull) fail++;
  console.log(`${noFull ? "FAIL" : "PASS"}  a Full waffle does not exist`);
}

console.log("\n── the exact price list ──");
{
  // [id, mini, medium/regular, full]
  const expected: [string, number, number, number | undefined][] = [
    ["death-by-chocolate", 79, 129, 199],
    ["oreo-licious", 79, 139, 209],
    ["kitkat-break", 79, 139, 209],
    ["tiramisu", 89, 169, 249],
    ["strawberry-bliss", 89, 169, 249],
    ["blueberry-bliss", 89, 169, 249],
    ["biscoff-delight", 99, 179, 269],
    ["nutella-bliss", 99, 179, 269],
    ["waffle-death-by-chocolate", 79, 129, undefined],
    ["waffle-kitkat-break", 89, 139, undefined],
    ["waffle-strawberry-bliss", 89, 149, undefined],
    ["waffle-blueberry-dream", 89, 149, undefined],
    ["waffle-biscoff-bliss", 99, 169, undefined],
    ["waffle-nutella-indulgence", 99, 169, undefined],
  ];
  for (const [id, m, r, f] of expected) {
    const got = [
      findBowl(productId(id, "mini"))?.bowl.price,
      findBowl(id)?.bowl.price,
      findBowl(productId(id, "full"))?.bowl.price,
    ];
    const ok = got[0] === m && got[1] === r && got[2] === f;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${got.join(" / ")}${ok ? "" : ` (want ${m} / ${r} / ${f})`}`);
  }
}

console.log("\n── what the slip says ──");
{
  const checks: [string, string][] = [
    ["death-by-chocolate", "Death by Chocolate (Bowl) · Medium"],
    [productId("death-by-chocolate", "mini"), "Death by Chocolate (Bowl) · Mini"],
    [productId("death-by-chocolate", "full"), "Death by Chocolate (Bowl) · Full"],
    ["oreo-licious", "Oreo Licious Bowl · Medium"],
    [productId("oreo-licious", "mini"), "Oreo Licious Bowl · Mini"],
    [productId("oreo-licious", "full"), "Oreo Licious Bowl · Full"],
    ["waffle-death-by-chocolate", "Death by Chocolate (Waffle) · Regular"],
    [productId("waffle-death-by-chocolate", "mini"), "Death by Chocolate (Waffle) · Mini"],
    // retired ids: orders placed under them are still in the book
    ["mini-bowl", "Mini Bowl"],
    ["mini-bowl-reward", "Mini Bowl"],
    ["gone-forever", "gone-forever"],
  ];
  for (const [id, want] of checks) {
    const got = itemLabel(id);
    const ok = got === want;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${id} → "${got}"${ok ? "" : ` (want "${want}")`}`);
  }
  const ok = itemLabel("gone-forever", "Retired Bowl") === "Retired Bowl";
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  an off-menu item still prints its stored name`);
}

console.log("\n── the price list itself ──");
{
  const all = ([...menu.categories, waffles.category] as Category[]).flatMap((c) =>
    c.items.map((i) => ({ ...i, category: c.title })),
  );

  const cheaper = all.filter((i) => i.mini >= i.price || (i.full !== undefined && i.full <= i.price));
  if (cheaper.length) fail++;
  console.log(
    `${cheaper.length === 0 ? "PASS" : "FAIL"}  Mini < Medium/Regular < Full for every product`,
    cheaper.map((i) => i.name).join(", "),
  );

  /* A struck-through price that is not above the one being charged is not a
     discount, it is decoration — and the customer cannot tell the
     difference. This is the test that stops one being invented. */
  const bogus = all.filter((i) => i.original !== undefined && i.original <= i.price);
  if (bogus.length) fail++;
  console.log(
    `${bogus.length === 0 ? "PASS" : "FAIL"}  every struck-through price is above the price charged`,
    bogus.map((i) => `${i.name} ₹${i.original}→₹${i.price}`).join(", "),
  );

  const noPrev = all.filter((i) => i.original === undefined);
  console.log(`NOTE  ${all.length} products; ${noPrev.length} with no previous price${noPrev.length ? ": " + noPrev.map((i) => i.name).join(", ") : ""}`);

  /* The combos are gone; if one reappears the cart silently reprices. The
     annotation is what lets this see `combo` at all — with none of the
     literals carrying it, TypeScript narrows it away. */
  const categories: Category[] = [...menu.categories, waffles.category];
  const withCombo = categories.filter((c) => c.combo !== undefined);
  if (withCombo.length) fail++;
  console.log(
    `${withCombo.length === 0 ? "PASS" : "FAIL"}  no category carries a 2-for combo`,
    withCombo.map((c) => `${c.title} ₹${c.combo}`).join(", "),
  );

  for (const c of categories) {
    console.log(
      `NOTE  ${c.title}: Mini ₹${Math.min(...c.items.map((i) => i.mini))}–₹${Math.max(...c.items.map((i) => i.mini))}` +
      `  ${c.kind === "Bowl" ? "Medium" : "Regular"} ₹${Math.min(...c.items.map((i) => i.price))}–₹${Math.max(...c.items.map((i) => i.price))}`,
    );
  }
}

console.log("\n--- sample WhatsApp message ---");
console.log(whatsappMessage([line("death-by-chocolate", 1), mini("oreo-licious", 1), full("nutella-bliss", 1)], "Likhit"));

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILURES"}`);
process.exit(fail === 0 ? 0 : 1);
