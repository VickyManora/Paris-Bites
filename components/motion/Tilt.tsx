"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

const SPRING = { stiffness: 150, damping: 18, mass: 0.4 } as const;

/**
 * Pointer-tracked 3D tilt.
 *
 * The element you spread `handlers` onto is the tilting *surface* — give it
 * `rotateX`/`rotateY` and `transformStyle: "preserve-3d"`, and put the
 * perspective on its parent. Anything inside can then lift off the surface
 * with a `z` of its own, which is what makes the bowls read as physically
 * in front of the card rather than pasted on it.
 *
 * Every element between the perspective and a `z`-translated child needs
 * `preserve-3d` too, and none of them may clip overflow — that flattens the
 * whole stack back into 2D.
 *
 * Under `prefers-reduced-motion` the handlers are dropped and every value
 * stays parked at rest.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({
  max = 8,
  glare = 0.16,
}: { max?: number; glare?: number } = {}) {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();

  // pointer position within the element, -0.5 … 0.5 on both axes
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);

  // a warm highlight that tracks the cursor across the card face
  const glareX = useTransform(sx, (v) => `${(v + 0.5) * 100}%`);
  const glareY = useTransform(sy, (v) => `${(v + 0.5) * 100}%`);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(223,189,119,${glare}), transparent 58%)`;

  const handlers = reduce
    ? {}
    : {
        onPointerMove: (e: ReactPointerEvent<T>) => {
          // a finger dragging the page shouldn't yank the card around
          if (e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        },
        onPointerLeave: () => {
          px.set(0);
          py.set(0);
        },
      };

  return { ref, rotateX, rotateY, glareBackground, handlers, reduce };
}

/**
 * Pointer parallax for a whole section: normalised cursor position, springed.
 * Layers read from it at different amplitudes to build depth.
 */
export function usePointerParallax<T extends HTMLElement = HTMLDivElement>(
  spring = { stiffness: 55, damping: 20, mass: 0.6 },
) {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, spring);
  const y = useSpring(py, spring);

  const handlers = reduce
    ? {}
    : {
        onPointerMove: (e: ReactPointerEvent<T>) => {
          if (e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        },
        onPointerLeave: () => {
          px.set(0);
          py.set(0);
        },
      };

  // callers build their own layers with useTransform(x, [-0.5, 0.5], [-n, n]) —
  // a helper that called hooks for them would be a hooks-order hazard
  return { ref, x, y, handlers, reduce };
}
