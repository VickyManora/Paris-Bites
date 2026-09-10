"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export const ease = [0.16, 1, 0.3, 1] as const;

/** Fade + rise on scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? undefined : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Parent that staggers its Reveal-less children. */
export function Stagger({
  children,
  className = "",
  delay = 0,
  gap = 0.09,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      // under reduced motion the children must start (and stay) in the shown
      // state — leaving `initial` undefined left them stuck at opacity 0
      initial={reduce ? "shown" : "hidden"}
      whileInView="shown"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={{
        hidden: {},
        shown: {
          transition: reduce
            ? { duration: 0 }
            : { staggerChildren: gap, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const riseItem = {
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

/** Word-by-word headline rise, used for the big display lines. */
export function RisingLines({
  lines,
  className = "",
  lineClassName = "",
  delay = 0.15,
}: {
  lines: { text: string; accent?: boolean }[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span
          key={i}
          className={`block overflow-hidden pb-[0.14em] -mb-[0.14em] ${lineClassName}`}
        >
          <motion.span
            className={`block ${line.accent ? "accent" : ""}`}
            initial={reduce ? undefined : { y: "108%" }}
            animate={reduce ? undefined : { y: "0%" }}
            transition={{ duration: 1.05, delay: delay + i * 0.11, ease }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
