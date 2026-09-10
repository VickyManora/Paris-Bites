"use client";

import Image from "next/image";

import { waffles } from "@/lib/content";
import type { Bowl as Product } from "@/lib/content";
import { wafflePhoto } from "@/lib/waffle-images";
import { Choco } from "./art/Choco";
import { Reveal, RisingLines, Stagger } from "./motion/Reveal";
import { ProductCard } from "./product/ProductCard";

/**
 * The waffle menu.
 *
 * Same tile as the bowls — ProductCard owns the whole shell — so the two
 * grids read as one system. Only the artwork differs: a waffle is wider and
 * flatter than a bowl, so it gets a wider overhang slot.
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

        {/* the waffles overhang their tiles, so the grid carries the clearance
            exactly as the bowls grid does */}
        <Stagger className="mt-28 grid gap-x-4 gap-y-28 sm:mt-32 sm:grid-cols-2 sm:gap-y-32 lg:grid-cols-3">
          {waffles.category.items.map((waffle) => (
            <WaffleCard key={waffle.id} waffle={waffle} />
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function WaffleCard({ waffle }: { waffle: Product }) {
  const photo = wafflePhoto(waffle.id);
  if (!photo) return null;

  return (
    <ProductCard
      product={waffle}
      categoryTitle={waffles.category.title}
      addLabel="waffle"
      // a waffle is landscape where a bowl is square, so it needs more width
      // to carry the same visual weight over the tile
      artClassName="w-[68%] max-w-[228px]"
      art={({ className }) => (
        <Image
          src={photo}
          alt={`Paris Bites ${waffle.name} waffle`}
          sizes="(max-width: 640px) 58vw, (max-width: 1024px) 30vw, 228px"
          placeholder="blur"
          className={className}
        />
      )}
    />
  );
}
