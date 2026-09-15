"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { biteClub, type Milestone } from "@/lib/loyalty/config";
import type { MilestoneView } from "@/lib/loyalty/engine";
import { ease } from "../motion/Reveal";
import { MapPin } from "./MapPin";

/* The same cadence as the menu strip's ladder, in seconds: one earned Bite
   every STEP, the pin landing a beat after the last of them. The two need to
   feel like one animation — a customer sees both in a single session. */
const STEP = 0.3;
const MARK = 0.46;
/** a little overshoot, so each mark arrives with some spring */
const pop = [0.34, 1.56, 0.64, 1] as const;

/**
 * The six Bites.
 *
 * One component, two shapes: a vertical timeline on a phone and a horizontal
 * track from `sm` up. A six-column grid squeezed onto a 390px screen is the
 * failure mode this is written to avoid — the labels become unreadable and
 * the rewards, which are the entire point, turn into three-letter stubs.
 *
 * Four states are distinguished by colour AND by mark, never by colour
 * alone: a green ✓ completed, a red pin at the current Bite, ○ locked, and a
 * gold ring for a reward that is sitting there waiting to be spent.
 *
 * The ladder counts itself out the first time it is scrolled to — one Bite,
 * the next, the next, then the pin dropping onto where the customer stands.
 * A single observer on the whole component drives both layouts, so the
 * timeline and the track keep the same rhythm.
 */
export function BiteJourney({ journey }: { journey: MilestoneView[] }) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const seen = useInView(root, { once: true, margin: "-12% 0px -12% 0px" });
  const completed = journey.filter((m) => m.status === "completed").length;

  /* the line finishes with the last tick, not before it */
  const lineRun = { duration: reduce ? 0 : completed * STEP + MARK, ease };

  return (
    <div ref={root}>
      {/* ── phone: a vertical timeline ── */}
      <ol className="relative space-y-1 sm:hidden">
        <span
          aria-hidden
          className="absolute bottom-4 left-[21px] top-4 w-px bg-ink-900/10"
        />
        <motion.span
          aria-hidden
          initial={{ scaleY: 0 }}
          animate={{ scaleY: seen ? completed / journey.length : 0 }}
          transition={lineRun}
          className="absolute left-[21px] top-4 h-[calc(100%-2rem)] w-px origin-top bg-gradient-to-b from-fresh-500 to-fresh-600"
        />

        {journey.map((m, i) => (
          <li key={m.n} className="relative flex items-start gap-4 py-2.5">
            <Dot view={m} index={i} reduce={!!reduce} seen={seen} completed={completed} />
            <div className="min-w-0 pt-1">
              <p className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    m.status === "locked" ? "text-muted" : "text-ink-900"
                  }`}
                >
                  {m.label}
                </span>
                {m.status === "current" && <HereTag />}
                <RewardTag view={m} />
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{m.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* ── tablet and up: a horizontal track ── */}
      <div className="hidden sm:block">
        <div className="relative">
          <span aria-hidden className="absolute left-6 right-6 top-6 h-px bg-ink-900/10" />
          <motion.span
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: seen ? Math.max(0, completed - 0.5) / (journey.length - 1) : 0,
            }}
            transition={lineRun}
            className="absolute left-6 right-6 top-6 h-px origin-left bg-gradient-to-r from-fresh-500 to-fresh-600"
          />

          <ol className="relative grid grid-cols-6 gap-2">
            {journey.map((m, i) => (
              <li key={m.n} className="flex flex-col items-center text-center">
                <Dot view={m} index={i} reduce={!!reduce} seen={seen} completed={completed} />
                <p
                  className={`mt-3 text-xs font-medium ${
                    m.status === "locked" ? "text-muted" : "text-ink-900"
                  }`}
                >
                  {m.label}
                </p>
                <p className="mt-1 text-[0.7rem] leading-snug text-ink-500">{m.short}</p>
                {m.status === "current" && <HereTag className="mt-1.5" />}
                <RewardTag view={m} className="mt-1.5" />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-6 text-center text-[0.7rem] text-muted sm:mt-7">{biteClub.note}</p>
    </div>
  );
}

/** the marker: a green ✓ done, a red pin here, a plain number ahead */
function Dot({
  view,
  index,
  reduce,
  seen,
  completed,
}: {
  view: MilestoneView;
  index: number;
  reduce: boolean;
  seen: boolean;
  completed: number;
}) {
  const done = view.status === "completed";
  const current = view.status === "current";
  const waiting = view.reward === "available";

  /* Each earned Bite waits its turn; the pin lands after the last of them. */
  const delay = reduce ? 0 : (done ? index : completed) * STEP;

  return (
    <span
      className="relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-900/12 bg-cream-50 text-sm font-semibold text-muted"
    >
      {/* a reward that is ready to spend gets a soft pulse, once seen */}
      {waiting && !reduce && (
        <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/40" />
      )}
      <span className="relative">{view.n}</span>

      {/* An earned Bite pops over the resting circle rather than replacing it,
          so the row never has a hole in it part-way through the count. */}
      {done && seen && (
        <motion.span
          initial={reduce ? false : { scale: 0.35, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: MARK, delay, ease: pop }}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-fresh-500 to-fresh-600 text-white shadow-[0_8px_20px_-10px_rgba(47,107,69,0.85)]"
        >
          ✓
        </motion.span>
      )}

      {current && seen && (
        <motion.span
          initial={reduce ? false : { y: -13, scale: 0.7, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: MARK + 0.06, delay, ease: pop }}
          className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-pin-500 bg-pin-100 text-pin-600"
        >
          {/* the hop only starts once the pin has landed */}
          <MapPin
            className="animate-pin-bounce size-[19px]"
            style={{ animationDelay: `${delay + MARK}s` }}
          />
        </motion.span>
      )}
    </span>
  );
}

/**
 * "You're here", against the Bite the customer is standing on.
 *
 * The pin says the same thing, but only in red and only as a shape — which
 * is nothing at all to a screen reader, and little more to anyone who cannot
 * separate it from the gold "ready to use" tag beside it. The words are what
 * make the position legible, and they matter most on a first visit, where
 * the whole ladder is unfamiliar and the pin sits on the 1st Bite with no
 * completed ticks nearby to give it context.
 *
 * Matches the ordinal slot in BiteClubStrip, which already says this on the
 * home page, so the two reads as one idea rather than two components.
 */
function HereTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-pin-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-pin-600 ${className}`}
    >
      {biteClub.youAreHere}
    </span>
  );
}

function RewardTag({ view, className = "" }: { view: MilestoneView; className?: string }) {
  if (view.reward === "available")
    return (
      <span
        className={`inline-flex items-center rounded-full bg-fresh-100 px-2 py-0.5 text-[0.65rem] font-semibold text-fresh-600 ${className}`}
      >
        Ready to use
      </span>
    );

  if (view.reward === "redeemed")
    return (
      <span className={`text-[0.65rem] font-medium text-muted ${className}`}>Redeemed</span>
    );

  if (view.reward === "revoked")
    return <span className={`text-[0.65rem] text-muted ${className}`}>Expired</span>;

  return (
    <span className={`text-[0.65rem] text-muted sm:hidden ${className}`}>
      {(view as Milestone).short}
    </span>
  );
}
