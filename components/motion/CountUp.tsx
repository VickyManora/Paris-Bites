"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * A number that counts up to its value.
 *
 * Runs once when it scrolls into view, then animates again from
 * wherever it currently sits whenever `to` changes — so a live figure
 * ticking 2,630 → 2,631 slides rather than snapping.
 *
 * Plain rAF with an ease-out curve: a count-up does not need a
 * library, and this keeps it off the main animation pipeline. Under
 * prefers-reduced-motion the final value is shown immediately.
 */
export function CountUp({
  to,
  duration = 1.2,
  className = "",
  format = (n: number) => n.toLocaleString("en-IN"),
}: {
  to: number;
  /** seconds; only the first run uses the full duration */
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    // reduced motion is handled at render time by showing `to` directly —
    // setting state here would just be a synchronous no-op write
    if (!inView || reduce) return;

    const from = started.current ? shown : 0;
    // later updates are small, so they get a short slide rather than
    // the full opening run
    const ms = (started.current ? 0.45 : duration) * 1000;
    started.current = true;
    if (from === to) return;

    let raf = 0;
    const begin = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - begin) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `shown` is read as a starting point only; re-running on every
    // frame would restart the animation forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? to : shown)}
    </span>
  );
}
