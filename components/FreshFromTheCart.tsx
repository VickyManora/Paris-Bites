"use client";

import { liveActivity } from "@/lib/content";
import { LiveActivity } from "./LiveActivity";
import { Reveal } from "./motion/Reveal";

/**
 * A slim band between the hero and the story — the brand's pulse, kept out
 * of the hero so the first screen stays product and message only.
 *
 * Centred and deliberately short: one kicker, the status, the pair, one
 * closing line. The figures are simulated — see lib/live-activity.ts.
 */
export function FreshFromTheCart() {
  return (
    <section
      aria-label={liveActivity.kicker}
      className="grain relative isolate overflow-hidden bg-cream-50 py-12 sm:py-14"
    >
      {/* one soft blush wash, no edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(240,201,210,0.45), rgba(250,232,214,0.3) 48%, transparent 72%)",
        }}
      />

      <Reveal className="relative z-[1] mx-auto flex max-w-[1400px] flex-col items-center px-5 text-center sm:px-8">
        <SparkIcon className="text-gold-500/80" />
        <p className="kicker mt-3">{liveActivity.kicker}</p>

        <LiveActivity className="mt-5 items-center" align="center" />

        <p className="mt-5 text-sm text-ink-500">{liveActivity.closing}</p>
      </Reveal>
    </section>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 1.8c.5 4.9 1.8 7.7 4.5 8.5-2.7.8-4 3.6-4.5 8.5-.5-4.9-1.8-7.7-4.5-8.5 2.7-.8 4-3.6 4.5-8.5Z"
      />
      <path
        fill="currentColor"
        opacity=".55"
        d="M19.6 14.4c.26 2.4.9 3.8 2.24 4.2-1.34.4-1.98 1.8-2.24 4.2-.26-2.4-.9-3.8-2.24-4.2 1.34-.4 1.98-1.8 2.24-4.2Z"
      />
    </svg>
  );
}
