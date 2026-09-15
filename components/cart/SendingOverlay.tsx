"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Choco } from "../art/Choco";
import { ease } from "../motion/Reveal";

/**
 * The wait, made into a moment.
 *
 * Placing an order is a round trip to the database and back, which on a
 * good connection is a beat and on a bad one is a couple of seconds. Rather
 * than a spinner, Choco does three short turns — one pose and one line each,
 * about a second apart.
 *
 * Three is deliberate: enough that a slow request never repeats the same
 * frame twice in a row, few enough that a fast one still lands on the first
 * and feels instant rather than interrupted.
 */
const BEATS = [
  { pose: "bowl" as const, line: "Packing your bowl…" },
  { pose: "heart" as const, line: "Made fresh, made with love" },
  { pose: "thumbsUp" as const, line: "Almost there…" },
];

/** how long each beat holds before the next */
const BEAT_MS = 1500;

export function SendingOverlay({ show }: { show: boolean }) {
  /* The beats live in a child that mounts with the overlay, so every order
     starts at "Packing your bowl…" without an effect reaching back to reset
     a counter. Unmounting is the reset. */
  return <AnimatePresence>{show && <Beats />}</AnimatePresence>;
}

function Beats() {
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setBeat((n) => (n + 1) % BEATS.length),
      BEAT_MS,
    );
    return () => clearInterval(id);
  }, []);

  const current = BEATS[beat];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cream-50/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {/* the pose swaps under a crossfade; the character never jumps */}
      <div className="relative flex h-[190px] w-[190px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.pose}
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 8 }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.4, ease }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Choco
              pose={current.pose}
              float={reduce ? "none" : "bob"}
              y={0}
              sizes="(max-width: 640px) 230px, 190px"
              className="w-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={current.line}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease }}
          className="display mt-4 text-center text-lg"
        >
          {current.line}
        </motion.p>
      </AnimatePresence>

      {/* a gold thread that fills while we wait, so the pause reads as progress */}
      <span
        aria-hidden
        className="mt-6 h-px w-32 overflow-hidden bg-ink-900/10"
      >
        <motion.span
          className="block h-px w-full origin-left bg-gradient-to-r from-gold-400 to-gold-600"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: BEAT_MS * 0.003, ease: "linear" }}
        />
      </span>
    </motion.div>
  );
}
