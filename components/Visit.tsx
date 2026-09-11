"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { links, visit } from "@/lib/content";
import { cartImage, mapImage } from "@/lib/brand-images";
import { Choco } from "./art/Choco";
import { Rating } from "./brand/Rating";
import { Reveal, RisingLines } from "./motion/Reveal";

/**
 * Visit — one composition, not a stack of cards.
 *
 * Left column carries the whole argument in reading order: where it is, how
 * well it's rated, when it opens, and the two ways to act on that. Right
 * column carries the two pictures — the map that tells you where, and the
 * cart photo that tells you what to look for. The columns are set to equal
 * height and the left one distributes its blocks to fill, which is what
 * removes the dead space the stacked-card version left behind.
 *
 * The closing band is the invitation: mascot, one line of copy, three
 * reasons. It also softens the hand-off into the footer, which used to end
 * on a hard edge.
 */
export function Visit() {
  return (
    <section
      id="visit"
      className="warm-glow grain relative isolate overflow-hidden bg-cream-50 pb-0 pt-20 sm:pt-24 lg:pt-28"
    >
      <div className="relative z-[1] mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* The cart photo is the panel, not a card beside one: the copy sits
            on it over a scrim, and the map plus the two ways to act own the
            right. The photo is dark (mean luminance 100/255) and busy, so it
            carries a real scrim rather than a light fade — fading it enough
            for chocolate-brown text would have left a grey smudge instead of
            a recognisable cart. */}
        <div className="grid items-stretch gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:gap-6">
          <Reveal className="h-full">
            <div className="relative h-full overflow-hidden rounded-3xl shadow-[var(--shadow-lift)]">
              <Image
                src={cartImage}
                alt={visit.cartAlt}
                fill
                sizes="(max-width: 1024px) 92vw, 700px"
                placeholder="blur"
                className="object-cover object-center"
              />

              {/* the shade: deepest at the foot where the copy sits, opening
                  up toward the awning so the cart stays readable */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-tr from-choc-700/92 via-ink-900/72 to-ink-900/38"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent"
              />

              <div className="relative flex h-full flex-col justify-between gap-8 p-7 sm:p-9 lg:p-11">
                <div>
                  <p className="kicker mb-4 !text-cream-200/75">{visit.kicker}</p>
                  <h2 className="display text-[clamp(2rem,4.4vw,3rem)] !text-cream-50 [&_.accent]:text-gold-400">
                    <RisingLines lines={visit.heading} delay={0} />
                  </h2>

                  <span aria-hidden className="mt-5 flex items-center gap-2.5">
                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400/70" />
                    <span className="size-1.5 rotate-45 border border-gold-400/80" />
                    <span className="h-px w-16 bg-gradient-to-r from-gold-400/70 to-transparent" />
                  </span>

                  <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-cream-200/85 sm:text-base">
                    {visit.body}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="flex items-start gap-2.5 text-base font-semibold text-cream-50">
                      <PinIcon className="mt-0.5 shrink-0 text-gold-400" />
                      {visit.address}
                    </p>
                    <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-cream-200/70">
                      {visit.landmarkNote}
                    </p>
                  </div>

                  {/* frosted pills: the photo behind them is dark and busy, so
                      these keep the site's own light chrome rather than
                      restating every colour for a dark ground */}
                  <div className="flex flex-wrap items-stretch gap-3">
                    <span className="glass inline-flex items-center rounded-2xl px-4 py-2.5">
                      <Rating starSize={14} className="text-sm text-ink-700" />
                    </span>

                    <span className="glass inline-flex items-start gap-2.5 rounded-2xl px-4 py-2.5">
                      <ClockIcon className="mt-0.5 shrink-0 text-gold-600" />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">
                          {visit.hoursTitle}
                        </span>
                        {visit.hoursLines.map((line) => (
                          <span key={line} className="block text-[0.8125rem] text-ink-500">
                            {line}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── where it is, and how to get there ── */}
          <div className="flex flex-col gap-5">
            <Reveal delay={0.1} className="flex min-h-0 lg:flex-1">
              <MapCard />
            </Reveal>

            <Reveal delay={0.16}>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <motion.a
                  href={links.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 480, damping: 26 }}
                  className="group relative inline-flex flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-full border border-transparent bg-ink-900 px-7 py-4 text-sm font-semibold text-cream-50 shadow-[0_16px_32px_-16px_rgba(53,28,13,0.65)] transition-all duration-500"
                >
                  <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                    <PinIcon />
                    {visit.mapsCta}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0"
                  />
                </motion.a>

                <motion.a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 480, damping: 26 }}
                  className="inline-flex flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-ink-900/12 bg-cream-50 px-6 py-4 text-sm font-medium text-ink-700 shadow-[var(--shadow-soft)] transition-colors duration-300 hover:border-gold-500 hover:text-gold-600"
                >
                  <WhatsAppIcon />
                  {visit.whatsappCta}
                </motion.a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <ComeFindUs />
    </section>
  );
}

/**
 * The closing chapter, not a footer strip.
 *
 * Reads as one thought — mascot, invitation, reason, action — with the
 * three reasons set as an editorial list on the right rather than a row of
 * cards. A gold hairline opens it, a blush glow sits behind the mascot and
 * headline, and the ground warms into the footer's cream so the section
 * hands over instead of stopping.
 */
function ComeFindUs() {
  return (
    <div className="relative mt-16 lg:mt-20">
      {/* the transition: a tapering rule with a single gold spark at centre */}
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <span aria-hidden className="flex items-center gap-4">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-ink-900/8 to-ink-900/10" />
          <SparkIcon className="shrink-0 text-gold-500/80" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-ink-900/8 to-ink-900/10" />
        </span>
      </div>

      <div className="bg-gradient-to-b from-transparent to-cream-100">
        <div className="relative mx-auto max-w-[1400px] px-5 pb-16 pt-12 sm:px-8 lg:pb-20 lg:pt-14">
          {/* three tracks, not two: the mascot anchors the left, the message
              takes the middle, the reasons close the right. A two-column
              split left a ~290px void in the centre because the message is
              narrower than an even track. */}
          <div className="grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,30rem)]">
            {/* the warmth behind the mascot and the headline — one soft wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-4 h-[340px] w-[560px] -translate-x-1/2 rounded-full opacity-70 blur-3xl lg:left-[26%]"
              style={{
                background:
                  "radial-gradient(circle, rgba(240,201,210,0.5), rgba(250,232,214,0.32) 45%, transparent 72%)",
              }}
            />

            <Choco
              pose="directions"
              float="sway"
              delay={0.1}
              sizes="(max-width: 640px) 52vw, (max-width: 1024px) 32vw, 260px"
              className="relative mx-auto w-[52%] max-w-[196px] sm:w-[32%] sm:max-w-[220px] lg:mx-0 lg:-mb-4 lg:w-[260px] lg:max-w-none lg:shrink-0"
            />

            <div className="relative text-center lg:text-left">
              <h3 className="display text-[clamp(1.5rem,2.7vw,2.15rem)] leading-[1.15]">
                <RisingLines lines={visit.ctaHeading} delay={0} />
              </h3>

              <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-ink-500 sm:text-base lg:mx-0">
                {visit.ctaBody}
              </p>

              <motion.a
                href={links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                className="group relative mt-7 inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-transparent bg-ink-900 px-7 py-4 text-sm font-semibold text-cream-50 shadow-[0_16px_32px_-16px_rgba(53,28,13,0.6)] transition-all duration-500"
              >
                <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                  <InstagramIcon />
                  {visit.instagramCta}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0"
                />
              </motion.a>

              <p className="mt-3 text-xs tracking-wide text-muted">{visit.instagramHandle}</p>
            </div>

            {/* the reasons, as an editorial list rather than three cards */}
            <Reveal delay={0.12} className="relative w-full lg:col-span-2 xl:col-span-1">
              <ol className="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink-900/8">
                {visit.highlights.map((h, i) => (
                  <li
                    key={h.title}
                    className="flex items-start gap-4 sm:flex-col sm:items-start sm:gap-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush-100 text-gold-600 sm:mb-3.5">
                      <HighlightIcon name={h.icon} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-sans text-[0.7rem] font-semibold tracking-[0.18em] text-gold-600">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="display mt-1 text-base">{h.title}</p>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
                        {h.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The illustrated map, and a real link.
 *
 * The artwork is a brand illustration, not a map widget — so the whole card
 * is an anchor to the actual Google Business listing (the same `links.maps`
 * the primary CTA uses) rather than pretending to be an interactive map.
 * The persistent chip is what says so.
 *
 * Rendered at the artwork's own 1.73:1 ratio: every landmark is drawn into
 * the image, so any other aspect would crop one out. The inset shadow in the
 * page's own cream feathers the edges into the section.
 */
function MapCard() {
  return (
    <motion.a
      href={links.maps}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${visit.mapCta} — ${visit.address}`}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="card group relative -mx-5 block w-full overflow-hidden rounded-2xl transition-shadow duration-500 hover:shadow-[var(--shadow-lift)] sm:mx-0 lg:h-full"
    >
      <div className="relative aspect-[1648/954] w-full overflow-hidden bg-blush-100/45 lg:h-full lg:aspect-auto lg:min-h-[var(--map-min)]" style={{ ["--map-min" as string]: "260px" }}>
        <Image
          src={mapImage}
          alt={visit.mapAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 780px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] lg:object-contain"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_54px_22px_var(--cream-50)]"
        />
      </div>

      <span className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-ink-900/10 bg-cream-50/90 px-4 py-2 text-xs font-medium text-ink-700 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors duration-300 group-hover:text-gold-600">
        <PinIcon />
        {visit.mapCta}
      </span>
    </motion.a>
  );
}

/* ── icons ───────────────────────────────────────────────
   Inline SVG at 18px in currentColor, matching the nav and cart icons:
   stroked where the site's own icons are stroked. WhatsApp is a brand glyph
   and stays filled, because that is how people recognise it.
   ──────────────────────────────────────────────────────── */

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 1.8c.5 4.9 1.8 7.7 4.5 8.5-2.7.8-4 3.6-4.5 8.5-.5-4.9-1.8-7.7-4.5-8.5 2.7-.8 4-3.6 4.5-8.5Z"
      />
      <path fill="currentColor" opacity=".55" d="M19.6 14.4c.26 2.4.9 3.8 2.24 4.2-1.34.4-1.98 1.8-2.24 4.2-.26-2.4-.9-3.8-2.24-4.2 1.34-.4 1.98-1.8 2.24-4.2Z" />
    </svg>
  );
}

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

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.2V12l3.2 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RouteIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M6.5 20.5V9.8a3.3 3.3 0 0 1 6.6 0v4.4a3.3 3.3 0 0 0 6.6 0V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="5.6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="19.7" cy="4.4" r="1.5" fill="currentColor" />
    </svg>
  );
}

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 20s-7.4-4.7-7.4-9.6a4.2 4.2 0 0 1 7.4-2.7 4.2 4.2 0 0 1 7.4 2.7C19.4 15.3 12 20 12 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlightIcon({ name }: { name: "route" | "clock" | "heart" }) {
  if (name === "route") return <RouteIcon />;
  if (name === "clock") return <ClockIcon />;
  return <HeartIcon />;
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
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" />
    </svg>
  );
}
