"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { JOURNEY_LENGTH, MILESTONES, biteClub, milestoneForType } from "@/lib/loyalty/config";
import {
  fetchSnapshot,
  rememberedPhone,
  serverPhone,
  subscribePhone,
  type LoyaltySnapshot,
} from "@/lib/loyalty/client";
import { MapPin } from "./MapPin";

/* The reveal's cadence: one earned bite every STEP ms, and the pin lands a
   beat after the last of them. Slow enough to read as counting, short enough
   that a six-bite ladder is finished inside two seconds. */
const STEP = 300;
const MARK_MS = 460;

/**
 * Bite Club on the menu page: the whole programme in about four seconds, and
 * the customer's own place in it when we know it.
 *
 * Progress is an enhancement, never a gate. A first-time visitor gets the
 * ladder immediately with no fetch, no spinner and no request for a phone
 * number — asking someone to identify themselves before they have ordered is
 * exactly the friction this programme is supposed not to have. If this
 * browser has ordered before, the number is already remembered, and the
 * journey fills in a moment later.
 *
 * The six milestones stay a six-column grid down to 360px. Anything that
 * stacks or scrolls hides the shape of the journey, and the shape — it gets
 * better as you go — is the entire pitch.
 *
 * Nothing here is trusted. Progress is whatever the server says; this
 * component only draws it.
 */
export function BiteClubStrip() {
  const phone = useSyncExternalStore(subscribePhone, rememberedPhone, serverPhone);
  const [snapshot, setSnapshot] = useState<LoyaltySnapshot | null>(null);
  const ladder = useRef<HTMLOListElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (phone.replace(/\D/g, "").length < 10) return;
    let cancelled = false;

    fetchSnapshot(phone)
      .then((data) => !cancelled && setSnapshot(data))
      .catch(() => {
        // a failed lookup simply leaves the ladder as it is
      });

    return () => {
      cancelled = true;
    };
  }, [phone]);

  /* The ladder counts itself out the first time it is scrolled to, and only
     then — replaying it on every pass back up the page would turn the one
     moment worth having into wallpaper. Progress that arrives after the
     section is already on screen still animates: the markers stagger from
     the moment they mount, whichever comes last. */
  useEffect(() => {
    const el = ladder.current;
    if (!el || revealed) return;

    /* No observer (very old browsers, some test runners) means no cue to
       animate on — show the real progress rather than a ladder frozen at
       zero. Deferred by a tick so the first paint still matches the server's. */
    if (typeof IntersectionObserver !== "function") {
      const t = setTimeout(() => setRevealed(true), 0);
      return () => clearTimeout(t);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  const completed = snapshot?.state.completedOrders ?? 0;
  const known = snapshot?.customer != null;
  const offer = snapshot?.offer ?? null;
  const offerMilestone = offer ? milestoneForType(offer.type) : null;

  /* This browser has ordered before and its journey is still in flight.
     Everyone else — a first-time visitor, or someone whose lookup came back —
     can be placed on the ladder right now. Waiting only for the fetch that is
     actually happening is what lets a newcomer see the pin immediately while
     still sparing a returning customer the sight of it on the 1st Bite before
     it corrects itself to theirs. */
  const pending = phone.replace(/\D/g, "").length >= 10 && !snapshot;

  const earned = Math.min(completed, MILESTONES.length);

  /* The reward in hand names the button; otherwise it is the plain invitation.
     Both come from the ladder config, so the wording lives in one place. */
  const cta = offerMilestone?.cta || biteClub.orderCta;

  return (
    <section
      aria-labelledby="bite-club-heading"
      className="mt-12 rounded-3xl border border-gold-500/20 bg-gradient-to-b from-blush-100/70 to-cream-50 px-5 py-8 sm:px-10 sm:py-10 lg:mt-16"
    >
      <div className="text-center">
        <p className="kicker">{biteClub.exclusive}</p>
        <h3 id="bite-club-heading" className="display mt-3 text-[clamp(1.5rem,5vw,2.1rem)]">
          {biteClub.name} <span className="text-gold-500">♡</span>
        </h3>
        <p className="accent mt-1.5 text-sm font-medium italic sm:text-base">
          {biteClub.promise}
        </p>

        {known ? (
          <p className="mx-auto mt-3 max-w-[38ch] text-xs leading-relaxed text-ink-700 sm:text-sm">
            <span className="font-semibold text-ink-900">
              {completed} of {MILESTONES.length} Bites
            </span>
            {completed >= JOURNEY_LENGTH
              ? ` · ${biteClub.completeHeadline}`
              : snapshot?.next
                ? ` · ${snapshot.next.short} at your ${snapshot.next.label}`
                : ""}
          </p>
        ) : (
          <p className="mx-auto mt-3 max-w-[38ch] text-xs leading-relaxed text-ink-500 sm:text-sm">
            {biteClub.explainer}
          </p>
        )}
      </div>

      {/* the journey */}
      <ol
        ref={ladder}
        className="relative mx-auto mt-8 grid max-w-[640px] grid-cols-6 gap-1 sm:gap-3"
      >
        <span
          aria-hidden
          className="absolute inset-x-[8%] top-[14px] h-px bg-ink-900/10"
        />
        {/* How far along the line is filled — only ever drawn from server
            state, and only drawn at all once the ladder has been seen, so it
            travels alongside the ticks rather than arriving before them. */}
        <span
          aria-hidden
          className="absolute left-[8%] top-[14px] h-px bg-gradient-to-r from-fresh-500 to-fresh-600 transition-[width] ease-out"
          style={{
            width: revealed ? `${(earned / 6) * 84}%` : "0%",
            transitionDuration: `${earned * STEP + MARK_MS}ms`,
          }}
        />

        {MILESTONES.map((m) => {
          const major = m.tone === "major";
          const quiet = m.tone === "quiet";
          const done = revealed && m.n <= completed;
          /* A first-time visitor stands on the 1st Bite — that is what
             `completed + 1` means when nothing has been completed, and it is
             the most useful thing the ladder can tell them. It used to
             require `known`, so the one person with no idea where they were
             was the only person not shown. */
          const here = revealed && !pending && m.n === completed + 1;
          const ready = offerMilestone?.n === m.n;

          /* Each earned bite waits its turn; the pin lands after the last one. */
          const delay = done ? (m.n - 1) * STEP : earned * STEP;

          return (
            <li key={m.n} className="relative flex flex-col items-center text-center">
              {/* The resting marker — what the ladder looks like before it has
                  been seen, and what an earned bite pops on top of. */}
              <span
                className={`relative flex size-7 items-center justify-center rounded-full text-[0.7rem] font-semibold ${
                  major
                    ? "bg-gradient-to-br from-gold-400 to-gold-600 text-cream-50"
                    : quiet
                      ? "border border-ink-900/10 bg-cream-50 text-muted"
                      : "border border-gold-500/40 bg-cream-50 text-gold-600"
                }`}
              >
                {/* a reward waiting to be spent gets one quiet pulse of attention */}
                {ready && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/40" />
                )}
                <span className="relative">{quiet ? "♡" : m.n}</span>

                {done && (
                  <span
                    className="animate-bite-mark absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-fresh-500 to-fresh-600 text-white"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    ✓
                  </span>
                )}

                {here && (
                  <span
                    className="animate-bite-pin absolute inset-0 flex items-center justify-center rounded-full border-2 border-pin-500 bg-pin-100 text-pin-600"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {/* the hop only starts once the pin has landed */}
                    <MapPin
                      className="animate-pin-bounce size-[15px]"
                      style={{ animationDelay: `${delay + MARK_MS}ms` }}
                    />
                  </span>
                )}
              </span>

              {/* two lines' worth of height whether the label wraps or not,
                  so every ordinal below sits on the same line */}
              <span
                className={`mt-2 flex min-h-[2.1em] items-start justify-center text-[0.63rem] font-semibold leading-tight sm:min-h-[2.4em] sm:text-xs ${
                  major || done ? "text-ink-900" : quiet ? "text-muted" : "text-ink-700"
                }`}
              >
                {m.compact}
              </span>

              <span
                className={`mt-1 text-[0.55rem] uppercase tracking-wider sm:text-[0.65rem] ${
                  here ? "font-semibold text-pin-600" : "text-muted"
                }`}
              >
                {here ? biteClub.youAreHere : m.ordinal}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 text-center">
        {offer ? (
          <p className="text-xs font-semibold text-fresh-600 sm:text-sm">
            🎁 {offer.label} {biteClub.rewardReady}
          </p>
        ) : known ? (
          /* A returning customer already knows there is no membership; tell
             them where the next order lands instead. */
          <p className="text-[0.7rem] text-ink-500 sm:text-xs">
            Your next order is your {MILESTONES[Math.min(completed, 5)].label}.
          </p>
        ) : (
          <p className="text-[0.7rem] text-muted sm:text-xs">{biteClub.automatic}</p>
        )}

        <a
          href="#signature"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink-900 px-7 py-3.5 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
        >
          {cta}
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M3 8h9M8.5 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        <p className="mt-3 text-[0.7rem] text-muted">
          <a href="/bite-club" className="underline underline-offset-2 hover:text-ink-700">
            {known ? "See my full journey" : biteClub.lookupCta}
          </a>
        </p>
      </div>
    </section>
  );
}
