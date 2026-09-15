/**
 * What the hero's ticket says.
 *
 * A pure function over the snapshot the server sent, for the same reason the
 * engine is pure: the first screen's promise and the cart's price have to come
 * from one place, and a decision made inside a component cannot be tested
 * without a browser and a database.
 *
 * Every word of a reward comes from its own milestone in config.ts. Nothing
 * here invents a prize, a percentage or a product.
 */
import { heroTicket } from "../content";
import { MILESTONES, biteClub, milestoneForType } from "./config";
import type { LoyaltySnapshot } from "./service-types";

const TOTAL = MILESTONES.length;

export type TicketTone =
  /** a reward is earned and unspent — money already theirs */
  | "reward"
  /** we know them, nothing to spend, journey still running */
  | "journey"
  /** all six done */
  | "vip"
  /** the welcome gift, taken from the hero and waiting in the cart */
  | "claimed"
  /** we have never seen this browser order */
  | "invite";

export type TicketView = {
  tone: TicketTone;
  /** the two words on the ribbon, so the flourish matches the state */
  ribbon: string;
  /** the prize, or the position — the line that earns the glance */
  lead: string;
  /** why to tap, phrased as the reward rather than as a transaction */
  cta: string;
  glyph: string;
  /** where the reward can actually be spent */
  href: string;
  /** bites completed, capped at the journey's length */
  earned: number;
  known: boolean;
  /** the milestone holding the unspent reward, so its dot can pulse */
  readyAt: number | null;
};

export function ticketView(
  snapshot: LoyaltySnapshot | null,
  /** whether this browser has already taken the welcome gift */
  welcomeClaimed = false,
): TicketView {
  const completed = snapshot?.state.completedOrders ?? 0;
  const known = snapshot?.customer != null;
  const earned = Math.min(completed, TOTAL);
  const prize = snapshot?.offer ? milestoneForType(snapshot.offer.type) : null;
  const next = snapshot?.next ?? null;

  /* The reward in hand outranks everything else it could say. It is the only
     line that argues for ordering tonight rather than some night. */
  if (prize) {
    return {
      tone: "reward",
      ribbon: heroTicket.ribbon.reward,
      lead: `${prize.short} · ${biteClub.rewardReady}`,
      cta: prize.cta,
      glyph: "🎁",
      /* a percentage applies to anything, so that one goes to the top of the
         menu; a reward tied to particular bowls goes to those bowls */
      href: prize.mechanic?.kind === "percent" ? "#menu" : "#signature",
      earned,
      known,
      readyAt: prize.n,
    };
  }

  if (known && completed >= TOTAL) {
    return {
      tone: "vip",
      ribbon: heroTicket.ribbon.vip,
      lead: biteClub.completeHeadline,
      cta: biteClub.orderCta,
      glyph: "👑",
      href: "#menu",
      earned,
      known,
      readyAt: null,
    };
  }

  if (known && next) {
    return {
      tone: "journey",
      ribbon: heroTicket.ribbon.journey,
      /* No "next up" prefix: with the prize appended this line has about 34
         characters before it truncates on a phone, and the prize is the half
         worth keeping. The call to action below says it is still ahead. */
      lead: `${completed} of ${TOTAL} Bites · ${next.short}`,
      /* the 4th Bite carries no reward, so the next prize can be two away */
      cta: next.ordersAway === 1 ? heroTicket.oneAway : heroTicket.moreAway(next.ordersAway),
      glyph: "♡",
      href: "#menu",
      earned,
      known,
      readyAt: null,
    };
  }

  /* Taken, and waiting at checkout. The ticket stops selling the gift and
     starts confirming it: someone who has just tapped a thing wants to know
     it landed, and repeating the offer would make them wonder whether it did. */
  if (welcomeClaimed) {
    return {
      tone: "claimed",
      ribbon: heroTicket.ribbon.claimed,
      lead: heroTicket.claimedLead,
      cta: heroTicket.claimedCta,
      glyph: "✓",
      href: "#menu",
      earned: 0,
      known: false,
      readyAt: null,
    };
  }

  return {
    tone: "invite",
    ribbon: heroTicket.ribbon.invite,
    lead: heroTicket.inviteLead,
    cta: heroTicket.inviteCta,
    glyph: "♡",
    href: "#menu",
    earned: 0,
    known: false,
    readyAt: null,
  };
}
