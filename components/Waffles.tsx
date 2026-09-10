"use client";

import Image from "next/image";
import { motion, useAnimationControls } from "motion/react";

import { menu, waffles } from "@/lib/content";
import type { Bowl as Product } from "@/lib/content";
import { wafflePhoto } from "@/lib/waffle-images";
import { Choco } from "./art/Choco";
import { Logo } from "./brand/Logo";
import { useCart } from "./cart/CartContext";
import { Reveal, RisingLines, Stagger, ease, riseItem } from "./motion/Reveal";
import { useTilt } from "./motion/Tilt";

/**
 * The waffle menu. Photo-led, so the card is quieter than a bowl card: the
 * image carries the section and the copy stays out of its way.
 *
 * Waffles are a real category in content.ts, which is what lets these cards
 * reuse the bowls' cart, combo logic and WhatsApp order message unchanged.
 */
export function Waffles() {
  return (
    <section
      id="waffles"
      aria-labelledby="waffles-heading"
      className="grain relative isolate overflow-hidden bg-cream-50 py-24 sm:py-32"
    >
      {/* blush wash, echoing the Why section, so waffles read as their own
          chapter rather than a second helping of the bowls grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(58% 40% at 50% 0%, rgba(249,227,232,0.7), transparent 66%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="kicker mb-5">{waffles.kicker}</p>
          <h2 id="waffles-heading" className="display text-[clamp(1.9rem,4.8vw,3.3rem)]">
            <RisingLines lines={waffles.heading} delay={0} />
          </h2>
          <p className="mx-auto mt-6 max-w-[48ch] text-sm leading-relaxed text-ink-500 sm:text-base">
            {waffles.body}
          </p>
          <p className="mt-4 text-xs text-muted">{waffles.category.serves}</p>
        </Reveal>

        {/* the centred header leaves a wide gutter on lg that nothing else
            uses — Choco stands in it, clear of the heading and the grid.
            Narrower screens have no gutter, so he sits in flow beneath the
            intro where he cannot overlap the copy. */}
        <Choco
          pose="thumbsUp"
          float="bob"
          delay={0.12}
          sizes="(max-width: 640px) 34vw, (max-width: 1024px) 22vw, 200px"
          className="mx-auto mt-10 w-[34%] max-w-[128px] sm:w-[22%] lg:absolute lg:right-2 lg:top-4 lg:mx-0 lg:mt-0 lg:w-[15%] lg:max-w-[200px]"
        />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {waffles.category.items.map((waffle) => (
            <WaffleCard key={waffle.id} waffle={waffle} />
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function WaffleCard({ waffle }: { waffle: Product }) {
  const { qtys, add, setQty } = useCart();
  const qty = qtys[waffle.id] ?? 0;
  const photo = wafflePhoto(waffle.id);
  const { ref, rotateX, rotateY, glareBackground, handlers, reduce } =
    useTilt<HTMLDivElement>({ max: 5, glare: 0.14 });
  const pop = useAnimationControls();

  const addWithPop = () => {
    add(waffle.id);
    if (reduce) return;
    pop.start({ scale: [1, 1.04, 1], transition: { duration: 0.5, ease } });
  };

  return (
    <motion.div variants={riseItem} className="h-full [perspective:1200px]">
      <motion.article
        ref={ref}
        {...handlers}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={reduce ? undefined : { y: -6 }}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="card group relative flex h-full flex-col overflow-hidden rounded-2xl transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]"
      >
        {/* 5:4 matches the source photography exactly, so object-cover has
            nothing to crop and the waffle is never clipped */}
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-cream-200">
          {/* a waffle with no photograph holds its place with the brand mark
              rather than borrowing another product's picture. Drop the shot
              into assets/waffles-raw, add it to scripts/prep-waffles.mjs and
              lib/waffle-images.ts, and this swaps itself out. */}
          {photo ? (
            <motion.div animate={pop} className="h-full w-full">
              <Image
                src={photo}
                alt={`Paris Bites ${waffle.name} waffle`}
                fill
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 440px"
                placeholder="blur"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            </motion.div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-blush-100 px-6 text-center">
              <Logo variant="wordmark" sizes="140px" className="h-9 opacity-40 sm:h-10" />
              <span className="kicker">{waffles.comingSoon}</span>
            </div>
          )}

          {/* cursor-tracked sheen, matched to the bowl cards */}
          <motion.span
            aria-hidden
            style={{ background: glareBackground }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="display text-base sm:text-lg">{waffle.name}</h3>
          {waffle.note && (
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-500">{waffle.note}</p>
          )}

          <div className="mt-5 flex flex-1 items-end">
            <div className="flex w-full items-center justify-between gap-4 border-t border-ink-900/8 pt-4">
              <span className="display text-lg">
                <span className="font-sans text-[0.72em] font-medium text-gold-600">
                  {menu.currency}
                </span>
                {waffle.price}
              </span>

              {qty === 0 ? (
                <motion.button
                  type="button"
                  onClick={addWithPop}
                  aria-label={`Add ${waffle.name} waffle to cart`}
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
                    aria-label={`Remove one ${waffle.name} waffle`}
                    onClick={() => setQty(waffle.id, qty - 1)}
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
                    aria-label={`Add one ${waffle.name} waffle`}
                    onClick={() => setQty(waffle.id, qty + 1)}
                    whileTap={reduce ? undefined : { scale: 0.85 }}
                    className="flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200 lg:size-9"
                  >
                    +
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}
