"use client";

import { useEffect, useState } from "react";

import { liveActivity } from "@/lib/content";
import { activityAt, type Activity } from "@/lib/live-activity";
import { CountUp } from "./motion/CountUp";

/**
 * A quiet line of life beside the hero stats.
 *
 * The figures are simulated — this project has no order backend, so
 * nothing here is a sale. The on-screen disclaimer was removed at the
 * owner's request, so the wording carries the load: "served", never "sold",
 * and the status never implies selling outside service hours.
 *
 * Nothing time-dependent renders on the server: the clock differs
 * between server and browser, so the first paint is the neutral shell
 * and the state arrives after mount. It then re-reads every 45s,
 * which is enough to catch the occasional +1 without polling hard.
 */
export function LiveActivity({
  className = "",
  align = "start",
}: {
  className?: string;
  align?: "start" | "center";
}) {
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const read = () => setActivity(activityAt(new Date()));
    read();
    const id = setInterval(read, 45_000);
    return () => clearInterval(id);
  }, []);

  const open = activity?.phase === "open";
  const status = !activity
    ? liveActivity.heading
    : activity.phase === "open"
      ? liveActivity.statusOpen
      : activity.phase === "before"
        ? liveActivity.statusBefore
        : liveActivity.statusClosed;
  const note = !activity
    ? liveActivity.heading
    : activity.phase === "open"
      ? liveActivity.servingTonight
      : activity.phase === "before"
        ? liveActivity.opening
        : liveActivity.ended;

  return (
    <div className={`flex flex-col gap-1.5 ${align === "center" ? "items-center" : ""} ${className}`}>
      {/* one wrapping row: status, then the pair. Three stacked rows pushed
          the hero stats past the fold on a 16 Pro Max. */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${align === "center" ? "justify-center" : ""}`}>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
            open
              ? "border-fresh-500/30 bg-fresh-100"
              : "border-gold-500/25 bg-blush-100/60"
          }`}
        >
          <span className="relative flex size-1.5">
            {open && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-fresh-500 opacity-70" />
            )}
            <span
              className={`relative inline-flex size-1.5 rounded-full ${open ? "bg-fresh-500" : "bg-muted/50"}`}
            />
          </span>
          <span
            className={`text-[0.625rem] font-semibold uppercase tracking-[0.18em] ${
              open ? "text-fresh-600" : "text-gold-600"
            }`}
          >
            {status}
          </span>
        </span>

        <span className="text-xs text-ink-500">{note}</span>

        {activity && (
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span aria-hidden className="hidden text-gold-500/50 sm:inline">
              ·
            </span>
            <span className="display text-base text-ink-900">
              <CountUp to={activity.bowls} />
            </span>
            <span className="text-xs text-muted">{liveActivity.bowls}</span>
            <span aria-hidden className="text-gold-500/50">·</span>
            <span className="display text-base text-ink-900">
              <CountUp to={activity.waffles} />
            </span>
            <span className="text-xs text-muted">{liveActivity.waffles}</span>
          </span>
        )}
      </div>
    </div>
  );
}
