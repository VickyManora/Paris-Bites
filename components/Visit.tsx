"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { links, visit } from "@/lib/content";
import { Reveal, RisingLines } from "./motion/Reveal";
import { Chunk } from "./art/Chunk";
import { cartImage } from "@/lib/brand-images";
import { useTilt } from "./motion/Tilt";
import { Choco } from "./art/Choco";

export function Visit() {
  return (
    <section
      id="visit"
      className="warm-glow grain relative isolate overflow-hidden bg-cream-50 py-24 sm:py-32 lg:pb-52"
    >
      <div className="relative z-[1] mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="kicker mb-5">{visit.kicker}</p>
          <h2 className="display text-[clamp(1.9rem,4.6vw,3.2rem)]">
            <RisingLines lines={visit.heading} delay={0} />
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed text-ink-500 sm:text-base">
            {visit.body}
          </p>
        </Reveal>

        {/* the cart photo leads, because recognising it on the street is the
            whole job of this section; the where/when detail sits beside it on
            lg and stacks underneath on anything narrower */}
        <div className="mt-14 grid gap-5 lg:mt-16 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
          <Reveal className="h-full">
            <figure className="card group relative h-full overflow-hidden rounded-2xl">
              <div className="relative aspect-[3/2] w-full overflow-hidden">
                <Image
                  src={cartImage}
                  alt={visit.cartAlt}
                  fill
                  sizes="(max-width: 1024px) 92vw, 620px"
                  placeholder="blur"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-900/45 to-transparent"
                />
                <figcaption className="absolute bottom-4 left-4 right-4 text-sm font-medium text-cream-50 drop-shadow-[0_1px_6px_rgba(36,23,19,0.6)]">
                  {visit.cartCaption}
                </figcaption>
              </div>
            </figure>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {visit.details.map((d, i) => (
              <Reveal key={d.title} delay={0.08 + i * 0.08} className="h-full [perspective:1200px]">
                <DetailCard title={d.title} lines={d.lines} index={i} />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.15} className="mt-10 flex flex-wrap justify-center gap-3">
          <motion.a
            href={links.maps}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-full bg-ink-900 px-8 py-4 text-sm font-medium text-cream-50 transition-all duration-500"
          >
            <span className="relative z-10">{visit.mapsCta}</span>
            <span className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0" />
          </motion.a>
          <motion.a
            href={links.whatsapp}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink-900/15 px-7 py-4 text-sm font-medium text-ink-700 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            {visit.whatsappCta}
          </motion.a>
          <motion.a
            href={links.instagram}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink-900/15 px-7 py-4 text-sm font-medium text-ink-700 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            {visit.instagramCta}
          </motion.a>
        </Reveal>
      </div>

      {/* the signboard reads "This Way" — it points toward the directions CTA.
          On lg it stands in the section's own bottom padding, far left of the
          centred CTA row, so it clears both the cards and the buttons. */}
      <Choco
        pose="directions"
        float="sway"
        delay={0.15}
        sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 190px"
        className="relative z-[1] mx-auto mt-12 w-[42%] max-w-[156px] sm:w-[24%] lg:absolute lg:bottom-3 lg:left-[4%] lg:mx-0 lg:mt-0 lg:w-[13%] lg:max-w-[190px]"
      />
    </section>
  );
}

/** Same pointer tilt as the menu cards, dialled down — these are text, not art. */
function DetailCard({
  title,
  lines,
  index,
}: {
  title: string;
  lines: string[];
  index: number;
}) {
  const { ref, rotateX, rotateY, glareBackground, handlers } = useTilt<HTMLDivElement>({
    max: 5,
    glare: 0.12,
  });

  return (
    <motion.div
      ref={ref}
      {...handlers}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="card group relative h-full rounded-2xl p-8 transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]"
    >
      <motion.span
        aria-hidden
        style={{ background: glareBackground }}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative [transform:translateZ(24px)]">
        <p className="kicker mb-4">{title}</p>
        <ul className="space-y-2">
          {lines.map((line, j) => (
            <li
              key={line}
              className={j === 0 ? "display text-lg sm:text-xl" : "text-sm text-ink-500"}
            >
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="animate-drift absolute bottom-4 right-5 opacity-60 [transform:translateZ(46px)]"
        style={{ animationDelay: `${index * 1.6}s` }}
      >
        <Chunk
          kind={index === 0 ? "chocolate" : "hazelnut"}
          size={44}
          rotate={index === 0 ? -22 : 34}
          id={`visit-${index}`}
        />
      </div>
    </motion.div>
  );
}
