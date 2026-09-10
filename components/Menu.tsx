"use client";

import {
  motion,
  useAnimationControls,
  useScroll,
  useTransform,
} from "motion/react";
import { menu } from "@/lib/content";
import type { Bowl as BowlType, Category } from "@/lib/content";
import { BowlArt } from "./art/BowlArt";
import { useCart } from "./cart/CartContext";
import { Reveal, RisingLines, Stagger, ease, riseItem } from "./motion/Reveal";
import { useTilt } from "./motion/Tilt";
import { Choco } from "./art/Choco";

export function Menu() {
  return (
    <section
      id="menu"
      className="grain relative isolate overflow-hidden bg-cream-100 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <Reveal>
            <p className="kicker mb-5">{menu.kicker}</p>
            <h2 className="display text-[clamp(1.9rem,4.6vw,3.2rem)]">
              <RisingLines lines={menu.heading} delay={0} />
            </h2>
          </Reveal>
          <Reveal delay={0.12} className="lg:pb-2">
            <p className="max-w-[46ch] text-ink-500">{menu.body}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-ink-900 px-4 py-2 text-xs font-medium text-cream-50">
                {menu.special}
              </span>
              <span className="rounded-full border border-gold-500/40 bg-blush-100 px-4 py-2 text-xs font-medium text-gold-600">
                {menu.firstTime}
              </span>
            </div>
          </Reveal>
        </div>

        {menu.categories.map((category, ci) => (
          <div key={category.id} className="mt-20 lg:mt-28">
            <Reveal className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-900/10 pb-5">
              <div>
                <h3 className="display text-xl sm:text-2xl">
                  {category.title}
                </h3>
                <p className="mt-1 text-xs text-muted">{category.serves}</p>
              </div>
              <p className="text-xs text-ink-500">
                <span className="font-semibold text-gold-600">
                  Any 2 for {menu.currency}
                  {category.combo}
                </span>{" "}
                · applied automatically
              </p>
            </Reveal>

            {/* the bowls sit half outside their card, so the grid carries the
                clearance: top margin for row one, tall row gaps after it */}
            <Stagger
              className="mt-28 grid gap-x-4 gap-y-28 sm:mt-32 sm:grid-cols-2 sm:gap-y-32 lg:grid-cols-3"
              delay={ci * 0.05}
            >
              {category.items.map((bowl) => (
                <BowlCard key={bowl.id} bowl={bowl} category={category} />
              ))}

              {/* Choco stands in the cell the last category's odd item count
                  leaves open — 5 bowls + Choco fills whole rows at every
                  column count, so no card is ever displaced or covered */}
              {ci === menu.categories.length - 1 && (
                <motion.div
                  variants={riseItem}
                  className="flex items-end justify-center pt-6 sm:pt-10 lg:pt-0"
                >
                  <Choco
                    pose="bowl"
                    float="bob"
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 24vw, 220px"
                    className="w-[46%] max-w-[180px] sm:w-[62%] lg:w-[74%] lg:max-w-[220px]"
                  />
                </motion.div>
              )}
            </Stagger>
          </div>
        ))}

        <Reveal className="mt-12">
          <p className="text-center text-xs text-muted">{menu.comboNote}</p>
        </Reveal>
      </div>
    </section>
  );
}

function BowlCard({ bowl, category }: { bowl: BowlType; category: Category }) {
  const { qtys, add, setQty } = useCart();
  const qty = qtys[bowl.id] ?? 0;
  const { ref, rotateX, rotateY, glareBackground, handlers, reduce } =
    useTilt<HTMLDivElement>({ max: 9 });
  const pop = useAnimationControls();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // the bowl drifts against the card as the card crosses the viewport, so the
  // gap between them keeps changing and the depth reads even without a cursor
  const bowlDrift = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [16, -16],
  );
  const bowlLift = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduce ? [1, 1, 1] : [0.94, 1.03, 0.96],
  );

  // touch devices never fire the pointer tilt, so the card also leans purely
  // from where it sits in the viewport — summed with the cursor tilt so a
  // mouse and a scroll compose instead of fighting
  const scrollTilt = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduce ? [0, 0, 0] : [9, 0, -7],
  );
  const tiltX = useTransform<number, number>(
    [rotateX, scrollTilt],
    ([pointerTilt, viewportTilt]) => pointerTilt + viewportTilt,
  );

  const addWithPop = () => {
    add(bowl.id);
    if (reduce) return;
    // the bowl reacts to the tap, so the button feels connected to the product
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

        {/* half the bowl overhangs the card's top edge; the z lifts it off the
            surface so tilting swings it further than the card behind it */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-1/2 justify-center [transform-style:preserve-3d]">
          <motion.div
            style={{ y: bowlDrift, scale: bowlLift, z: 64 }}
            className="w-[52%] max-w-[176px] [transform-style:preserve-3d]"
          >
            {/* the tap pop lives on its own element — sharing `scale` with the
                scroll lift would let the pop's end value latch and freeze it */}
            <motion.div animate={pop}>
              <BowlArt
                tone={bowl.tone}
                id={bowl.id}
                label={bowl.name}
                width={176}
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 24vw, 176px"
                className="h-auto w-full drop-shadow-[0_20px_24px_rgba(53,28,13,0.24)] transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.06]"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* copy sits just proud of the card face so it parallaxes with the tilt */}
        <div className="relative [transform:translateZ(22px)] [transform-style:preserve-3d]">
          {/* the badge rides the title line rather than the top-right corner —
              the overhanging bowl owns that corner on narrow cards */}
          <div className="flex items-start justify-between gap-3">
            <h4 className="display text-base sm:text-lg">{bowl.name}</h4>
            {bowl.badge && (
              <span className="mt-1 shrink-0 rounded-full bg-blush-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-gold-600">
                {bowl.badge}
              </span>
            )}
          </div>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-500">
            {bowl.note}
          </p>
        </div>

        <div className="mt-5 flex flex-1 items-end">
          <div className="flex w-full items-center justify-between gap-4 border-t border-ink-900/8 pt-4 [transform:translateZ(30px)]">
            <span className="display text-lg">
              <span className="font-sans text-[0.72em] font-medium text-gold-600">
                {menu.currency}
              </span>
              {bowl.price}
            </span>

            {qty === 0 ? (
              <motion.button
                type="button"
                onClick={addWithPop}
                aria-label={`Add ${bowl.name} to cart`}
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
                  aria-label={`Remove one ${bowl.name}`}
                  onClick={() => setQty(bowl.id, qty - 1)}
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
                  aria-label={`Add one ${bowl.name}`}
                  onClick={() => {
                    setQty(bowl.id, qty + 1);
                    if (!reduce)
                      pop.start({
                        scale: [1, 1.1, 1],
                        transition: { duration: 0.4, ease },
                      });
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

        <span className="sr-only">{category.title}</span>
      </motion.div>
    </motion.div>
  );
}
