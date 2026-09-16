import Image from "next/image";

import { bowlPhoto } from "@/lib/bowl-images";
import { wafflePhoto } from "@/lib/waffle-images";

/**
 * One product, at the size of a stamp.
 *
 * Order lists are the one place bowls and waffles sit in the same column,
 * and the same dessert name is sold as both — "Death by Chocolate" is a bowl
 * at ₹149 and a waffle at ₹149. A name has to be read; a picture does not,
 * which matters most on the admin screen, where someone is packing a bag
 * with one hand.
 *
 * The photographs are transparent cut-outs, so the tile behind them carries
 * the colour. A product with no photograph — the reward-only mini bowl, or
 * anything added to the menu before its shoot — falls back to its initial
 * rather than an empty hole.
 */
export function ProductThumb({
  id,
  name,
  className = "size-12",
}: {
  id: string;
  name: string;
  /** the tile's size; defaults to 48px square */
  className?: string;
}) {
  const photo = bowlPhoto(id) ?? wafflePhoto(id);

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-900/8 bg-gradient-to-b from-blush-100/70 to-cream-100 ${className}`}
    >
      {photo ? (
        <Image
          src={photo}
          alt=""
          sizes="96px"
          className="size-full object-contain p-0.5"
        />
      ) : (
        <span className="text-xs font-semibold text-muted">{name.charAt(0)}</span>
      )}
    </span>
  );
}
