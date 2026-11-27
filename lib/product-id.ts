/**
 * A product id carries its size.
 *
 * Bowls are sold in three sizes (Mini, Medium, Full) and waffles in two
 * (Mini, Regular). Everything downstream of the menu — the cart's
 * `Record<id, qty>`, the `items` written on an order row, the order slip
 * staff read — identifies what was bought by a single string. Rather than
 * thread a second `size` field through all of that (and migrate the orders
 * already in the book), the size lives in the id:
 *
 *   oreo-licious         the regular size: Medium for a bowl, Regular for a waffle
 *   oreo-licious:mini    the Mini
 *   oreo-licious:full    the Full (bowls only)
 *
 * The bare id is the size the menu sold before Mini and Full existed, so an
 * order already in the book still resolves to what it was. Every order row
 * also stores the unit price it was charged, so its total never changes when
 * the menu is repriced.
 *
 * `findBowl` in lib/pricing.ts is the one place that turns an id back into a
 * product and a price. Nothing else should be parsing these strings.
 */
export const MINI_SUFFIX = ":mini";
export const FULL_SUFFIX = ":full";

/** "regular" is the bare id: shown as Medium on a bowl, Regular on a waffle */
export type Size = "mini" | "regular" | "full";

export function isMini(id: string): boolean {
  return id.endsWith(MINI_SUFFIX);
}

export function sizeOf(id: string): Size {
  if (id.endsWith(MINI_SUFFIX)) return "mini";
  if (id.endsWith(FULL_SUFFIX)) return "full";
  return "regular";
}

/** the catalogue id, with any size marker removed */
export function baseProductId(id: string): string {
  if (id.endsWith(MINI_SUFFIX)) return id.slice(0, -MINI_SUFFIX.length);
  if (id.endsWith(FULL_SUFFIX)) return id.slice(0, -FULL_SUFFIX.length);
  return id;
}

/** the id a given size of a catalogue product is ordered under */
export function productId(base: string, size: Size): string {
  if (size === "mini") return base + MINI_SUFFIX;
  if (size === "full") return base + FULL_SUFFIX;
  return base;
}

/** what a size is called on the menu, the cart and the slip */
export function sizeLabel(size: Size, kind: "Bowl" | "Waffle"): string {
  if (size === "mini") return "Mini";
  if (size === "full") return "Full";
  return kind === "Bowl" ? "Medium" : "Regular";
}
