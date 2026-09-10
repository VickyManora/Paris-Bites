"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { links, visit } from "@/lib/content";
import { Reveal, RisingLines } from "./motion/Reveal";
import { Chunk } from "./art/Chunk";
import { cartImage } from "@/lib/brand-images";
import { useTilt } from "./motion/Tilt";
import { Choco } from "./art/Choco";
import { Rating } from "./brand/Rating";

export function Visit() {
  return (
    <section
      id="visit"
      className="warm-glow grain relative isolate overflow-hidden bg-cream-50 py-24 sm:py-32"
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

          {/* right where someone decides whether the trip is worth it */}
          <Rating starSize={15} className="mt-6 text-sm text-ink-700" />
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

        {/* Three tiers, not three equal buttons: directions is the job of
            this section, WhatsApp is how people actually order, Instagram is
            a nice-to-have. Choco is laid out beside them rather than
            absolutely placed, so his sign always points at the primary CTA
            and he can never land on top of it. */}
        <div className="mt-12 flex flex-col items-center gap-6 lg:mt-14 lg:flex-row lg:justify-center lg:gap-10">
          <Choco
            pose="directions"
            float="sway"
            delay={0.2}
            sizes="(max-width: 640px) 38vw, (max-width: 1024px) 22vw, 180px"
            className="w-[38%] max-w-[148px] sm:w-[22%] lg:w-[13%] lg:max-w-[180px] lg:shrink-0"
          />

          <Reveal delay={0.15} className="w-full sm:w-auto">
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              {/* primary */}
              <motion.a
                href={links.maps}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border border-transparent bg-ink-900 px-8 py-4 text-sm font-semibold text-cream-50 shadow-[0_16px_32px_-16px_rgba(53,28,13,0.65)] transition-all duration-500 sm:w-auto"
              >
                <PinIcon className="relative z-10" />
                <span className="relative z-10">{visit.mapsCta}</span>
                <span className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0" />
              </motion.a>

              {/* secondary */}
              <motion.a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-ink-900/12 bg-cream-50 px-7 py-4 text-sm font-medium text-ink-700 shadow-[var(--shadow-soft)] transition-colors duration-300 hover:border-gold-500 hover:text-gold-600 sm:w-auto"
              >
                <WhatsAppIcon />
                {visit.whatsappCta}
              </motion.a>

              {/* tertiary — no fill, no border, so it reads as the quiet one */}
              <motion.a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium text-muted transition-colors duration-300 hover:bg-cream-200/70 hover:text-gold-600 sm:w-auto"
              >
                <InstagramIcon />
                {visit.instagramCta}
              </motion.a>
            </div>
          </Reveal>
        </div>
      </div>

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

/* ── CTA icons ────────────────────────────────────────────
   Inline SVG, matching the nav and cart icons: 18px, currentColor, stroked
   where the site's own icons are stroked. WhatsApp is a brand glyph, so it
   stays filled — that is how people recognise it.
   ──────────────────────────────────────────────────────── */

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 21.2s6.6-5.9 6.6-10.6a6.6 6.6 0 1 0-13.2 0C5.4 15.3 12 21.2 12 21.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.3" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2.2a9.75 9.75 0 0 0-8.3 14.85L2.2 22l5.1-1.5a9.75 9.75 0 1 0 4.74-18.3Zm0 1.72a8.03 8.03 0 1 1-4.2 14.87l-.3-.18-3.02.89.9-2.94-.2-.31a8.03 8.03 0 0 1 6.82-12.33Z"
      />
      <path
        fill="currentColor"
        d="M9.3 7.3c-.17-.4-.35-.4-.52-.41h-.44c-.15 0-.4.06-.6.28-.21.23-.79.77-.79 1.88 0 1.1.81 2.17.92 2.32.12.15 1.57 2.5 3.86 3.41 1.91.75 2.3.6 2.71.57.41-.04 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.07-.06-.1-.21-.15-.44-.27-.23-.11-1.34-.66-1.55-.73-.2-.08-.36-.11-.51.11-.15.23-.58.74-.71.88-.13.15-.26.17-.49.06-.23-.12-.98-.36-1.86-1.15-.69-.61-1.15-1.36-1.28-1.59-.14-.22-.02-.35.1-.46.1-.1.23-.26.34-.4.11-.13.15-.23.23-.38.07-.15.04-.29-.02-.4-.06-.11-.5-1.23-.7-1.68Z"
      />
    </svg>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <rect
        x="3.4"
        y="3.4"
        width="17.2"
        height="17.2"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" />
    </svg>
  );
}
