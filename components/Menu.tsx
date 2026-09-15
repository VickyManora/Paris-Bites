"use client";

import { motion } from "motion/react";
import { menu } from "@/lib/content";
import type { Bowl as BowlType, Category } from "@/lib/content";
import { BowlArt } from "./art/BowlArt";
import { Reveal, RisingLines, Stagger, riseItem } from "./motion/Reveal";
import { Choco } from "./art/Choco";
import { ProductCard } from "./product/ProductCard";
import { BiteClubStrip } from "./loyalty/BiteClubStrip";

export function Menu() {
  return (
    <section
      id="menu"
      className="grain relative isolate overflow-hidden bg-cream-100 py-20 sm:py-24 lg:py-28"
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

          </Reveal>
        </div>

        {/* Bite Club sits between the menu's introduction and its prices:
            the rewards are the reason to order here rather than elsewhere, so
            they belong before the first bowl, not after the last. */}
        <Reveal delay={0.08}>
          <BiteClubStrip />
        </Reveal>

        {menu.categories.map((category, ci) => (
          <div key={category.id} id={category.id} className="mt-16 scroll-mt-28 lg:mt-20">
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
              className="mt-28 grid gap-x-5 gap-y-28 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6"
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
  return (
    <ProductCard
      product={bowl}
      categoryTitle={category.title}
      headingLevel="h4"
      art={({ className }) => (
        <BowlArt
          tone={bowl.tone}
          id={bowl.id}
          label={bowl.name}
          width={176}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 24vw, 176px"
          className={className}
        />
      )}
    />
  );
}
