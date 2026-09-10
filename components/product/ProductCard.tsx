"use client";

import type { ReactNode } from "react";
import { motion, useAnimationControls, useScroll, useTransform } from "motion/react";

import { menu } from "@/lib/content";
import type { Bowl as Product } from "@/lib/content";
import { useCart } from "../cart/CartContext";
import { ease, riseItem } from "../motion/Reveal";
import { useTilt } from "../motion/Tilt";

/**
 * The menu tile, shared by bowls and waffles so the two grids cannot drift
 * apart visually.
 *
 * The product artwork overhangs the card's top edge and is lifted off the
 * surface on the Z axis, so tilting swings it further than the card behind
 * it — that separation is what makes it read as sitting in front of the tile
 * rather than printed on it.
 *
 * `art` is a render prop rather than an image, because bowls and waffles
 * carry different aspect ratios and `sizes` hints; everything else — tilt,
 * scroll drift, the tap pop, the cart controls — belongs to the card.
 */
export function ProductCard({
  product,
  categoryTitle,
  art,
  /** width of the overhang slot; waffles are wider and flatter than bowls */
  artClassName = "w-[52%] max-w-[176px]",
  addLabel,
}: {
  product: Product;
  categoryTitle: string;
  art: (opts: { className: string }) => ReactNode;
  artClassName?: string;
  /** noun for the aria-labels, e.g. "waffle"; omit for plain product names */
  addLabel?: string;
}) {
  const { qtys, add, setQty } = useCart();
  const qty = qtys[product.id] ?? 0;
  const { ref, rotateX, rotateY, glareBackground, handlers, reduce } =
    useTilt<HTMLDivElement>({ max: 9 });
  const pop = useAnimationControls();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // the artwork drifts against the card as the card crosses the viewport, so
  // the gap between them keeps changing and the depth reads without a cursor
  const artDrift = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [16, -16]);
  const artLift = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduce ? [1, 1, 1] : [0.94, 1.03, 0.96],
  );

  // touch devices never fire the pointer tilt, so the card also leans purely
  // from where it sits in the viewport — summed with the cursor tilt so a
  // mouse and a scroll compose instead of fighting
  const scrollTilt = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [0, 0, 0] : [9, 0, -7]);
  const tiltX = useTransform<number, number>(
    [rotateX, scrollTilt],
    ([pointerTilt, viewportTilt]) => pointerTilt + viewportTilt,
  );

  const noun = addLabel ? `${product.name} ${addLabel}` : product.name;

  const addWithPop = () => {
    add(product.id);
    if (reduce) return;
    // the product reacts to the tap, so the button feels connected to it
    pop.start({
      scale: [1, 1.16, 0.96, 1],
      rotate: [0, -5, 3, 0],
      transition: { duration: 0.62, ease },
    });
  };

  return (
    <motion.div variants={riseItem} className="h-full [perspective:1200px]">
      <motion.div
        ref={ref}
        {...handlers}
        style={{ rotateX: tiltX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={reduce ? undefined : { y: -8 }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="card group relative flex h-full flex-col rounded-2xl px-6 pb-6 pt-28 transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]"
      >
        {/* cursor-tracked sheen across the card face */}
        <motion.span
          aria-hidden
          style={{ background: glareBackground }}
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-1/2 justify-center [transform-style:preserve-3d]">
          <motion.div
            style={{ y: artDrift, scale: artLift, z: 64 }}
            className={`${artClassName} [transform-style:preserve-3d]`}
          >
            {/* the tap pop lives on its own element — sharing `scale` with the
                scroll lift would let the pop's end value latch and freeze it */}
            <motion.div animate={pop}>
              {art({
                className:
                  "h-auto w-full drop-shadow-[0_20px_24px_rgba(53,28,13,0.24)] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.06]",
              })}
            </motion.div>
          </motion.div>
        </div>

        {/* copy sits just proud of the card face so it parallaxes with the tilt */}
        <div className="relative [transform:translateZ(22px)] [transform-style:preserve-3d]">
          {/* the badge rides the title line rather than the top-right corner —
              the overhanging artwork owns that corner on narrow cards */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="display text-base sm:text-lg">{product.name}</h3>
            {product.badge && (
              <span className="mt-1 shrink-0 rounded-full bg-blush-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-gold-600">
                {product.badge}
              </span>
            )}
          </div>

          {product.note && (
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-500">{product.note}</p>
          )}
        </div>

        <div className="mt-5 flex flex-1 items-end">
          <div className="flex w-full items-center justify-between gap-4 border-t border-ink-900/8 pt-4 [transform:translateZ(30px)]">
            <span className="display text-lg">
              <span className="font-sans text-[0.72em] font-medium text-gold-600">
                {menu.currency}
              </span>
              {product.price}
            </span>

            {qty === 0 ? (
              <motion.button
                type="button"
                onClick={addWithPop}
                aria-label={`Add ${noun} to cart`}
                whileTap={reduce ? undefined : { scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className="flex min-h-11 items-center rounded-full bg-ink-900 px-6 text-xs font-semibold uppercase tracking-wider text-cream-50 transition-colors hover:bg-gold-600 lg:min-h-0 lg:px-5 lg:py-2.5"
              >
                Add
              </motion.button>
            ) : (
              <div className="flex items-center rounded-full border border-ink-900/12 bg-cream-50">
                <motion.button
                  type="button"
                  aria-label={`Remove one ${noun}`}
                  onClick={() => setQty(product.id, qty - 1)}
                  whileTap={reduce ? undefined : { scale: 0.85 }}
                  className="flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200 lg:size-9"
                >
                  −
                </motion.button>
                <motion.span
                  key={qty}
                  initial={reduce ? undefined : { y: -8, opacity: 0 }}
                  animate={reduce ? undefined : { y: 0, opacity: 1 }}
                  transition={{ duration: 0.25, ease }}
                  className="w-6 text-center text-sm font-semibold tabular-nums text-ink-900"
                >
                  {qty}
                </motion.span>
                <motion.button
                  type="button"
                  aria-label={`Add one ${noun}`}
                  onClick={() => {
                    setQty(product.id, qty + 1);
                    if (!reduce)
                      pop.start({ scale: [1, 1.1, 1], transition: { duration: 0.4, ease } });
                  }}
                  whileTap={reduce ? undefined : { scale: 0.85 }}
                  className="flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200 lg:size-9"
                >
                  +
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <span className="sr-only">{categoryTitle}</span>
      </motion.div>
    </motion.div>
  );
}
