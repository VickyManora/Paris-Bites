/**
 * ─────────────────────────────────────────────────────────────
 *  THIS IS A SIMULATION. IT IS NOT SALES DATA.
 *
 *  This project has no backend: no API routes, no database, no
 *  order records. An order leaves the site as a WhatsApp deep
 *  link that the customer sends themselves, so a completed sale
 *  is never observed by this code and cannot be counted here.
 *
 *  The numbers below are therefore a presentation device, and the
 *  UI labels them as such (see `liveActivity.disclaimer` in
 *  content.ts). Nothing here may be described as bowls sold.
 *
 *  If an order system is added later, replace `activityAt()` with
 *  a fetch of real aggregates and delete the simulation entirely —
 *  the component reads one shape, so nothing else needs to change.
 * ─────────────────────────────────────────────────────────────
 */

/** service window, local time: 7 PM – 11 PM, every day */
export const SERVICE_OPEN_HOUR = 19;
export const SERVICE_CLOSE_HOUR = 23;

/** where the simulated counters stood on the launch day */
const LAUNCH = Date.UTC(2026, 8, 1); // 1 Sep 2026
const BASE_BOWLS = 2500;
const BASE_WAFFLES = 56;

export type ServicePhase = "before" | "open" | "closed";

export type Activity = {
  phase: ServicePhase;
  bowls: number;
  waffles: number;
  /** always true while this module is the data source */
  simulated: true;
};

/**
 * Deterministic 0–1 from an integer. The same day always yields the
 * same value, which is what keeps a day's figures identical across
 * refreshes, browser tabs and devices — no storage required, and
 * nothing to drift out of sync.
 */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** whole days since launch, floored at 0 */
function dayIndex(now: Date): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - LAUNCH) / 86_400_000));
}

/**
 * The day's opening totals: each past service day added a stable
 * +10–15 bowls and +2–3 waffles. Accumulated rather than averaged so
 * a given date always produces exactly one answer.
 */
function baselineFor(day: number): { bowls: number; waffles: number } {
  let bowls = BASE_BOWLS;
  let waffles = BASE_WAFFLES;
  // guard: a clock set far in the future must not spin here
  for (let d = 0; d < Math.min(day, 4000); d++) {
    bowls += 10 + Math.floor(seeded(d * 2 + 1) * 6); // +10..15
    waffles += 2 + Math.floor(seeded(d * 2 + 2) * 2); // +2..3
  }
  return { bowls, waffles };
}

export function phaseAt(now: Date): ServicePhase {
  const h = now.getHours();
  if (h < SERVICE_OPEN_HOUR) return "before";
  if (h >= SERVICE_CLOSE_HOUR) return "closed";
  return "open";
}

/**
 * Counters for a given moment.
 *
 * Before service the day's opening totals show, unchanged. During
 * service they creep up with elapsed time — a handful of bowls across
 * four hours, so a 45s poll sees an increment only now and then rather
 * than a number racing upward. After close they hold at the day's
 * final figure and never move again.
 */
export function activityAt(now: Date): Activity {
  const day = dayIndex(now);
  const { bowls, waffles } = baselineFor(day);
  const phase = phaseAt(now);

  // how much this service day will add in total, stable for the day
  const bowlsToday = 6 + Math.floor(seeded(day * 7 + 3) * 5); // 6..10
  const wafflesToday = 2 + Math.floor(seeded(day * 7 + 4) * 2); // 2..3

  if (phase === "before") return { phase, bowls, waffles, simulated: true };
  if (phase === "closed") {
    return { phase, bowls: bowls + bowlsToday, waffles: waffles + wafflesToday, simulated: true };
  }

  const minutes =
    (now.getHours() - SERVICE_OPEN_HOUR) * 60 + now.getMinutes();
  const progress = Math.min(1, minutes / ((SERVICE_CLOSE_HOUR - SERVICE_OPEN_HOUR) * 60));

  return {
    phase,
    bowls: bowls + Math.floor(bowlsToday * progress),
    waffles: waffles + Math.floor(wafflesToday * progress),
    simulated: true,
  };
}
