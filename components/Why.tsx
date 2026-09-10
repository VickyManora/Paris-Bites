"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { why } from "@/lib/content";
import { BowlArt } from "./art/BowlArt";
import { Chunk } from "./art/Chunk";
import { Reveal, RisingLines } from "./motion/Reveal";
import { Choco } from "./art/Choco";

/**
 * Desktop: the four points sit in two outer columns around a centred bowl.
 * Mobile: one column that reads 1 → 4 in order, bowl on top.
 */
const PLACEMENT = [
  "lg:col-start-1 lg:row-start-1 lg:text-right",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2 lg:text-right",
  "lg:col-start-3 lg:row-start-2",
];

export function Why() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const bowlY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 90, reduce ? 0 : -90]);
  const bowlScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.94]);
  // a slow turn on both axes — enough to catch the eye, not enough to distort
  const bowlRotateY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-14, 14]);
  const bowlRotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [8, -8]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.08, 0.9]);
  // the confetti drifts past at its own speed — depth you get without a cursor,
  // so touch devices see the layering too
  const chunkNear = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [70, -70]);
  const chunkFar = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [34, -34]);

  return (
    <section
      id="why"
      ref={ref}
      className="grain relative isolate overflow-hidden bg-cream-50 py-24 sm:py-32"
    >
      {/* blush wash so this section separates from the hero without going dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(52% 42% at 50% 8%, rgba(249,227,232,0.75), transparent 68%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="kicker mb-5">{why.kicker}</p>
          <h2 className="display text-[clamp(1.9rem,4.8vw,3.3rem)]">
            <RisingLines lines={why.heading} delay={0} />
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[1fr_minmax(230px,0.78fr)_1fr] lg:grid-rows-2 lg:items-center lg:gap-x-10 lg:gap-y-24">
          <motion.div
            style={{
              y: bowlY,
              scale: bowlScale,
              rotateX: bowlRotateX,
              rotateY: bowlRotateY,
              transformStyle: "preserve-3d",
            }}
            className="relative mx-auto w-[58%] max-w-[290px] [perspective:1200px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:w-full"
          >
            <motion.div
              style={{ scale: glowScale }}
              className="absolute inset-x-[-28%] bottom-[-8%] top-[8%] rounded-full opacity-80 blur-3xl"
            >
              <div
                className="size-full rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(240,201,210,0.75), transparent 66%)",
                }}
              />
            </motion.div>
            <BowlArt
              tone="berry"
              id="strawberry-bliss"
              label="Strawberry Chocolate Bliss"
              width={290}
              sizes="(max-width: 1024px) 58vw, 290px"
              className="relative h-auto w-full drop-shadow-[0_24px_32px_rgba(53,28,13,0.16)]"
              spoon
            />
          </motion.div>

          {why.items.map((f, i) => (
            <Item
              key={f.n}
              {...f}
              delay={(i % 2) * 0.1}
              className={PLACEMENT[i]}
              align={i % 2 === 0 ? "right" : "left"}
            />
          ))}
        </div>

        {/* inline under the CTA on narrow screens so it can never sit on top
            of the copy; only once there is room does it move to the corner */}
        <Choco
          pose="heart"
          float="bob"
          delay={0.1}
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 26vw, 210px"
          className="mx-auto mt-14 w-[40%] max-w-[150px] sm:w-[26%] lg:absolute lg:bottom-0 lg:right-0 lg:mx-0 lg:mt-0 lg:w-[15%] lg:max-w-[210px]"
        />

        <Reveal delay={0.15} className="mt-20 flex justify-center">
          <motion.a
            href="#menu"
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
            className="group relative overflow-hidden rounded-full bg-ink-900 px-9 py-4 text-sm font-medium text-cream-50 transition-all duration-500"
          >
            <span className="relative z-10">{why.cta}</span>
            <span className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0" />
          </motion.a>
        </Reveal>
      </div>

      {[
        { l: "5%", b: "6%", s: 34, r: -22, k: "chocolate" as const, d: "0s", near: true },
        { l: "19%", b: "12%", s: 24, r: 40, k: "hazelnut" as const, d: "1.4s", near: false },
        { l: "74%", b: "8%", s: 38, r: 14, k: "chocolate" as const, d: "2.2s", near: true },
        { l: "88%", b: "14%", s: 26, r: -48, k: "hazelnut" as const, d: "0.8s", near: false },
      ].map((b, i) => (
        <motion.div
          key={i}
          className="absolute z-[1] hidden opacity-90 sm:block"
          style={{ left: b.l, bottom: b.b, y: b.near ? chunkNear : chunkFar }}
        >
          <span className="animate-drift block" style={{ animationDelay: b.d }}>
            <Chunk kind={b.k} size={b.s} rotate={b.r} id={`why-${i}`} />
          </span>
        </motion.div>
      ))}
    </section>
  );
}

function Item({
  n,
  title,
  body,
  delay,
  align,
  className = "",
}: {
  n: string;
  title: string;
  body: string;
  delay: number;
  align: "left" | "right";
  className?: string;
}) {
  return (
    <Reveal delay={delay} className={`relative ${className}`}>
      <p className="kicker mb-2 tracking-[0.1em] text-gold-600 lg:hidden">
        {n.padStart(2, "0")}
      </p>

      <span
        className={`ghost-numeral pointer-events-none absolute -top-10 z-0 hidden text-[7rem] lg:block ${
          align === "right" ? "-right-2 translate-x-full" : "-left-2 -translate-x-full"
        }`}
      >
        {n}
      </span>

      <div className="relative z-10">
        <h3 className="display text-lg sm:text-xl">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-500 lg:max-w-[34ch] lg:inline-block">
          {body}
        </p>
      </div>
    </Reveal>
  );
}
