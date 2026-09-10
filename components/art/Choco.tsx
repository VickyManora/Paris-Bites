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
}) {
  const reduce = useReducedMotion();
  const decorative = alt === "";

  return (
    <motion.div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden={decorative || undefined}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, scale: 0.94 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: reduce ? 0.4 : 1, delay, ease }}
    >
      <span className={float === "none" ? "block" : `block animate-choco-${float}`}>
        <Image
          src={chocoPoses[pose]}
          alt={alt}
          sizes={sizes}
          placeholder="blur"
          priority={priority}
          draggable={false}
          className="h-auto w-full"
        />
      </span>
    </motion.div>
  );
}
