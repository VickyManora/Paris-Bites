/**
 * A product id carries its size.
 *
 * Every bowl and waffle is sold in two sizes at two prices, and everything
 * downstream of the menu — the cart's `Record<id, qty>`, the `items` written
 * on an order row, a reward's chosen product, the order slip staff read —
 * identifies what was bought by a single string. Rather than thread a second
 * `size` field through all of that (and migrate the orders already in the
 * book), the size lives in the id: `oreo-licious` is the Full, and
 * `oreo-licious:mini` is the Mini.
 *
 * The payoff is that an order placed before Minis existed still resolves,
 * and resolves to the Full, which is exactly what it was.
 *
 * `findBowl` in lib/pricing.ts is the one place that turns an id back into a
 * product and a price. Nothing else should be parsing these strings.
 */
export const MINI_SUFFIX = ":mini";

export type Size = "mini" | "full";

export function isMini(id: string): boolean {
  return id.endsWith(MINI_SUFFIX);
}

export function sizeOf(id: string): Size {
  return isMini(id) ? "mini" : "full";
}

/** the catalogue id, with any size marker removed */
export function baseProductId(id: string): string {
  return isMini(id) ? id.slice(0, -MINI_SUFFIX.length) : id;
}

/** the id a given size of a catalogue product is ordered under */
export function productId(base: string, size: Size): string {
  return size === "mini" ? base + MINI_SUFFIX : base;
}
