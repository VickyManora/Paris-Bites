"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { heroTicket } from "@/lib/content";
import { MILESTONES, biteClub } from "@/lib/loyalty/config";
import { ticketView } from "@/lib/loyalty/ticket";
import {
  rememberedPhone,
  serverPhone,
  subscribePhone,
  useLoyalty,
} from "@/lib/loyalty/client";
import { phaseAt, timeUntilOpen } from "@/lib/live-activity";
import * as cart from "@/lib/cart-store";
import { ease } from "../motion/Reveal";

/** the dots fill left to right, one every STEP ms, once progress arrives */
const STEP = 90;

/**
 * The hero's reward ticket: what this customer stands to gain, and one tap
 * to go and get it.
 *
 * It replaces the badge row above the headline, which is the most valuable
 * strip on the page — so it carries the one thing worth putting there. A
 * returning customer sees the reward they have already earned and have not
 * spent; a first-time visitor sees what their first order is worth. Either
 * way the whole block is a single link, so there is no reading-then-hunting
 * for a button.
 *
 * Deliberately NOT a marquee. The message here is personal and specific —
 * "your ₹99 Signature Bowl is waiting" — and scrolling text cannot be tapped
 * at the moment it is understood. The only thing that moves is a slow band
 * of light across the ticket, and only while a reward is actually unspent.
 *
 * Nothing here decides anything. Progress and the offer are whatever the
 * server said; this draws them. The wording comes from the milestone itself,
 * so the hero can never describe a reward the cart then prices differently.
 */
export function RewardTicket({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const phone = useSyncExternalStore(subscribePhone, rememberedPhone, serverPhone);
  /* One shared lookup for the whole page — see lib/loyalty/client.ts. A
     failed one leaves the invitation showing, which is still true. */
  const { snapshot, status } = useLoyalty(phone);
  const [closedNote, setClosedNote] = useState<string | null>(null);

  /* The service clock differs between server and browser, so the first paint
     carries no note and it arrives after mount. Half a minute is plenty —
     this is a expectation-setter, not the countdown in the live band. */
  useEffect(() => {
    const read = () => setClosedNote(serviceNote(new Date()));
    read();
    const id = setInterval(read, 30_000);
    return () => clearInterval(id);
  }, []);

  const { offerClaimed } = useSyncExternalStore(
    cart.subscribe,
    cart.getSnapshot,
    cart.getServerSnapshot,
  );

  /* Five states, one shape — decided in lib/loyalty/ticket.ts, where it can
     be tested, and only drawn here. */
  const { tone, ribbon, lead, cta, glyph, href, earned, known, readyAt } = ticketView(
    snapshot,
    offerClaimed,
  );
  const rewarded = tone === "reward";

  /* We have a number for this browser and the server has not answered yet.
     Until it does the ticket says so rather than guessing: ticketView has
     nothing to go on but a null snapshot, which reads as a first-time
     visitor — and telling a customer on their 4th Bite that their 1st order
     gets 20% off is a worse first impression than a moment of "checking". */
  const pending = status === "loading" && !snapshot;

  /* The welcome gift is the one state the ticket can act on by itself. Every
     other reward already has a row in the database and is applied in the cart,
     where the bowls it depends on are; this one needs nothing but the tap. */
  const claimable = tone === "invite" && !pending;

  const [celebrating, setCelebrating] = useState(false);

  function claim() {
    cart.claimOffer();

    /* The scroll waits for the stamp. Sending them to the menu at the instant
       of tapping throws away the only moment the discount is the thing on
       screen — and that moment is what the tap was for. */
    if (reduce) {
      window.location.hash = "menu";
      return;
    }

    setCelebrating(true);
    window.setTimeout(() => {
      setCelebrating(false);
      window.location.hash = "menu";
    }, 1150);
  }

  return (
    /* One wrapper, and it exists only to carry the rise. The lift cannot go on
       the link itself: Motion owns that element's transform (the entrance, and
       the press), and a CSS animation on the same property outranks an inline
       style — the press would stop registering.

       The shadow belongs to the card and deepens with it, rather than being a
       second box sitting underneath. A separate layer needs its own radius,
       and a shadow spread far enough to read softly clamps that radius to
       nothing — which draws a square-cornered halo under a rounded card. */
    <span className={`ticket-float animate-ticket-lift block w-full max-w-[26rem] ${className}`}>
      {/* A link goes somewhere; a claim does something. The welcome gift is
          the second, so it renders as a button — which is also what gives it
          the space bar, the right role and the right announcement. */}
      <Card
        {...(claimable
          ? { as: "button" as const, type: "button" as const, onClick: claim }
          : { as: "a" as const, href })}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.3, ease }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
        aria-label={
          pending ? `${biteClub.name}. ${biteClub.checking}` : `${ribbon}. ${lead}. ${cta}`
        }
        /* The pair the lift animates between. Written here rather than as a
           shadow utility so the resting value is stated once: the keyframes
           read it, and so does the card when motion is turned off. */
        style={
          {
            "--ticket-shadow-rest": rewarded
              ? "0 18px 40px -28px rgba(169,125,51,0.9)"
              : "0 14px 34px -26px rgba(169,125,51,0.7)",
            "--ticket-shadow-lift": rewarded
              ? "0 26px 46px -26px rgba(169,125,51,0.95)"
              : "0 22px 40px -24px rgba(169,125,51,0.8)",
          } as CSSProperties
        }
        className={`ticket-card animate-ticket-lift-shadow group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 pb-3 pt-[1.6rem] text-left transition-colors sm:gap-3.5 sm:px-5 ${
          rewarded
            ? "border-gold-500/45 bg-gradient-to-r from-blush-100 to-cream-50 hover:border-gold-500/70"
            : "border-ink-900/10 bg-gradient-to-r from-blush-100/60 via-cream-50/85 to-cream-50/80 backdrop-blur-sm hover:border-gold-500/45"
        }`}
      >
        {/* The ribbon. A real one is the first thing you see on a gift and the
            part you remember, so it sits above the offer rather than beside it:
            a gold band pinned to the top-left with a notch cut out of its tail,
            the way a ribbon end is cut. Its words are decorative — the offer
            itself is the line below, and the link's own label carries both. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 flex h-[1.15rem] items-center rounded-tl-2xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 pl-4 pr-4 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-cream-50 sm:pl-5"
          style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 9px) 50%, 100% 100%, 0 100%)" }}
        >
          {/* the satin highlight along the top of the band */}
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-cream-50/25 to-transparent" />
          <span className="relative">{pending ? biteClub.name : ribbon}</span>
        </span>

        {/* the two notches that make this read as a ticket someone is holding
            rather than a banner the site is showing them. Filled with the hero's
            own cream so they punch through the border. */}
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-inherit bg-cream-100"
        />
        <span
          aria-hidden
          className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-inherit bg-cream-100"
        />

        {/* one slow band of light, and only while there is something unspent —
            the movement is the reward's, not the page's */}
        {rewarded && (
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <span className="animate-ticket-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-gold-400/35 to-transparent" />
          </span>
        )}

        {pending ? (
          /* Two bars the size of the two lines they stand in for, so nothing
             moves when the real words arrive. */
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-gold-500/25"
              />
              <span aria-hidden className="h-3 w-[58%] animate-pulse rounded-full bg-ink-900/10" />
            </span>
            <span className="text-[0.7rem] leading-relaxed text-muted sm:text-xs">
              {biteClub.checking}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="shrink-0 text-sm leading-none text-gold-600">
                {glyph}
              </span>
              <span className="truncate text-[0.82rem] font-semibold text-ink-900 sm:text-sm">
                {lead}
              </span>
            </span>

            <span className="truncate text-[0.7rem] leading-relaxed text-ink-500 sm:text-xs">
              {cta}
              {closedNote && <span className="text-muted"> · {closedNote}</span>}
            </span>
          </span>
        )}

        <span className="flex shrink-0 flex-col items-end gap-2">
          <Dots earned={earned} known={known} readyAt={readyAt} pending={pending} />
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            aria-hidden
            className="text-ink-700 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            <path
              d="M3 8h9M8.5 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* The moment of claiming. A stamp coming down on the ticket, the way
            a gift certificate gets franked — it lands over the offer it just
            took, so the thing that changed is the thing being looked at. */}
        <AnimatePresence>
          {celebrating && (
            <motion.span
              key="stamp"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-r from-fresh-100 via-cream-50 to-fresh-100"
            >
              <motion.span
                initial={{ scale: 2.4, opacity: 0, rotate: -14 }}
                animate={{ scale: 1, opacity: 1, rotate: -7 }}
                transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.7 }}
                className="rounded-lg border-[2.5px] border-fresh-600 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-fresh-600 sm:text-sm"
              >
                {heroTicket.claimedStamp}
              </motion.span>

              {/* the ring the stamp knocks outward as it lands */}
              <motion.span
                initial={{ scale: 0.2, opacity: 0.55 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 0.75, ease: "easeOut", delay: 0.1 }}
                className="absolute size-20 rounded-full border-2 border-gold-500"
              />

              {SPARKS.map((spark, i) => (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: spark.x, y: spark.y, scale: 1, opacity: 0 }}
                  transition={{ duration: 0.72, ease: "easeOut", delay: 0.08 + i * 0.012 }}
                  className="absolute size-1.5 rounded-full"
                  style={{ background: spark.gold ? "var(--gold-500)" : "var(--blush-300)" }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </Card>
    </span>
  );
}

/* Where the sparks go. Precomputed rather than random so every claim looks
   the same and the burst can be eyeballed — a scatter that regenerates each
   render is one you can never quite tune. */
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const reach = 58 + (i % 3) * 16;
  return {
    x: Math.cos(angle) * reach * 1.7,
    y: Math.sin(angle) * reach * 0.62,
    gold: i % 2 === 0,
  };
});

/**
 * The ticket's outer box, as a link or as a button.
 *
 * Motion needs to know which element it is animating at the type level, and
 * the two take different props, so the choice is made once here rather than
 * duplicating the whole card for the sake of one tag.
 */
type CardProps = React.ComponentProps<typeof motion.a> & { as: "a" };
type ButtonProps = React.ComponentProps<typeof motion.button> & { as: "button" };

function Card({ as, ...rest }: CardProps | ButtonProps) {
  if (as === "button") return <motion.button {...(rest as React.ComponentProps<typeof motion.button>)} />;
  return <motion.a {...(rest as React.ComponentProps<typeof motion.a>)} />;
}

/**
 * Six dots: the shape of the journey, small enough to sit in a hero.
 *
 * The shape is the pitch — it gets better as you go — so all six are always
 * drawn, even for a visitor with no progress at all. They fill left to right
 * when progress arrives rather than on mount, which is the moment worth
 * animating.
 */
function Dots({
  earned,
  known,
  readyAt,
  pending = false,
}: {
  earned: number;
  known: boolean;
  readyAt: number | null;
  /** the answer is still coming, so the row breathes instead of claiming a zero */
  pending?: boolean;
}) {
  return (
    <span aria-hidden className={`flex items-center gap-1 ${pending ? "animate-pulse" : ""}`}>
      {MILESTONES.map((m) => {
        const filled = m.n <= earned;
        const here = known && m.n === earned + 1;

        return (
          <span
            key={m.n}
            className={`relative size-1.5 rounded-full transition-colors duration-300 ${
              filled
                ? "bg-fresh-500"
                : here
                  ? "bg-pin-500"
                  : m.tone === "major"
                    ? "bg-gold-500/35"
                    : "bg-ink-900/15"
            }`}
            style={{ transitionDelay: filled ? `${(m.n - 1) * STEP}ms` : undefined }}
          >
            {readyAt === m.n && (
              <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/60" />
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * What to say about the clock, or nothing while the cart is open.
 *
 * A ticket that says "order now" at three in the afternoon is a small lie the
 * kitchen then has to take back, so the shut hours are named. Inside half a
 * day it counts down; beyond that a countdown reads as a wait rather than an
 * opening time, so it just names the hour.
 */
function serviceNote(now: Date): string | null {
  if (phaseAt(now) === "open") return null;

  const { total, hours, minutes } = timeUntilOpen(now);
  if (total <= 0) return null;
  if (hours >= 12) return heroTicket.opensAt;

  return `${heroTicket.opensIn} ${hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}`;
}
