"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { chocoPoses, type ChocoPose } from "@/lib/choco-images";
import { ease } from "../motion/Reveal";

/**
 * Choco, the Paris Bites mascot.
 *
 * Two layers of motion, deliberately kept apart so they can't fight:
 * the wrapper does a one-shot entrance when it scrolls into view (motion,
 * `once`, matching Reveal), and an inner span carries a perpetual CSS float
 * — a keyframe rather than a JS loop, so it stays on the compositor and
 * costs nothing while idle. Both are dropped under prefers-reduced-motion.
 *
 * Always decorative unless you pass an `alt`: the mascot repeats what the
 * surrounding copy already says.
 */
export function Choco({
  pose,
  alt = "",
  sizes,
  className = "",
  float = "bob",
  delay = 0,
  y = 24,
  priority = false,
  appear = "inView",
}: {
  pose: ChocoPose;
  /** leave empty for decorative use — the default */
  alt?: string;
  /** responsive hint; the image itself renders fluid to its container */
  sizes: string;
  className?: string;
  /** `bob` tilts as it rises, `sway` adds drift, `lift` is the shorter
   *  hero cadence, `none` holds still */
  float?: "bob" | "sway" | "lift" | "none";
  delay?: number;
  /** entrance travel, in px */
  y?: number;
  /** set for above-the-fold use so the mascot doesn't pop in late */
  priority?: boolean;
  /**
   * When the entrance plays. `inView` waits for the mascot to be scrolled to,
   * which is right on a long page. `mount` plays immediately — use it inside
   * anything that appears already in front of the customer, like the cart's
   * sending overlay, where waiting on an intersection can leave an invisible
   * character on screen.
   */
  appear?: "inView" | "mount";
}) {
  const reduce = useReducedMotion();
  const decorative = alt === "";

  const shown = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  const entrance =
    appear === "mount"
      ? { animate: shown }
      : { whileInView: shown, viewport: { once: true, margin: "-8% 0px" } };

  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden={decorative || undefined}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, scale: 0.94 }}
      {...entrance}
      transition={{ duration: reduce ? 0.4 : 1, delay, ease }}
    >
      <span className={float === "none" ? "block" : `block animate-choco-${float}`}>
        <Image
          src={chocoPoses[pose]}
          alt={alt}
          sizes={sizes}
          priority={priority}
          draggable={false}
          className="h-auto w-full"
        />
      </span>
    </motion.div>
  );
}
