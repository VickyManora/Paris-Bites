"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { hero, links } from "@/lib/content";
import { wafflePhotos } from "@/lib/waffle-images";
import { BowlArt } from "./art/BowlArt";
import { Chunk } from "./art/Chunk";
import { RisingLines, ease } from "./motion/Reveal";
import { usePointerParallax } from "./motion/Tilt";
import { RewardTicket } from "./loyalty/RewardTicket";
import { CountUp } from "./motion/CountUp";

const heroWaffle = wafflePhotos["waffle-biscoff-bliss"];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const drizzleY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : -170],
  );
  const bowlsY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 58]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0.2]);

  // the whole arrangement swings toward the cursor: the pair rotates in 3D,
  // and each layer slides a different distance so they separate in depth
  const {
    ref: artRef,
    x: pointerX,
    y: pointerY,
    handlers: pointerHandlers,
  } = usePointerParallax<HTMLDivElement>();
  const pointerTiltY = useTransform(pointerX, [-0.5, 0.5], [-11, 11]);
  const pointerTiltX = useTransform(pointerY, [-0.5, 0.5], [7, -7]);
  const scrollTiltY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : 14],
  );
  const scrollTiltX = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : -9],
  );
  const tiltY = useTransform<number, number>(
    [pointerTiltY, scrollTiltY],
    ([pointer, scroll]) => pointer + scroll,
  );
  const tiltX = useTransform<number, number>(
    [pointerTiltX, scrollTiltX],
    ([pointer, scroll]) => pointer + scroll,
  );
  const frontX = useTransform(pointerX, [-0.5, 0.5], [-26, 26]);
  const frontY = useTransform(pointerY, [-0.5, 0.5], [-16, 16]);
  const backX = useTransform(pointerX, [-0.5, 0.5], [-12, 12]);
  const backY = useTransform(pointerY, [-0.5, 0.5], [-8, 8]);
  const chunkX = useTransform(pointerX, [-0.5, 0.5], [34, -34]);
  const chunkY = useTransform(pointerY, [-0.5, 0.5], [20, -20]);

  return (
    <section
      id="home"
      ref={ref}
      className="warm-glow grain relative isolate min-h-[100svh] overflow-hidden bg-cream-100 pt-28 pb-14 sm:pt-36 sm:pb-20 lg:flex lg:items-center lg:pt-36 lg:pb-12"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-56 bg-gradient-to-t from-cream-100 to-transparent" />

      <div className="relative z-[1] mx-auto grid w-full max-w-[1400px] items-center gap-5 px-5 sm:gap-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-0">
        <motion.div
          style={{ y: copyY, opacity: fade }}
          className="max-w-xl lg:col-start-1 lg:row-start-1"
        >
          {/* The one thing on the first screen that is about this customer
              rather than about the shop: the reward they have already earned,
              and a single tap to go and spend it. Above the headline, because
              money already banked is a better reason to keep reading than a
              headline is. */}
          <RewardTicket className="mb-6 sm:mb-7" />

          <h1 className="display text-[clamp(2.7rem,7.4vw,5rem)]">
            <RisingLines lines={hero.headline} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
            className="mt-5 max-w-[44ch] text-[0.975rem] leading-relaxed text-ink-500 sm:mt-7 sm:max-w-[48ch] sm:text-base"
          >
            {hero.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.64, ease }}
            className="mt-7 flex flex-wrap items-center gap-3 sm:mt-10"
          >
            <motion.a
              href="#menu"
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 480, damping: 26 }}
              className="group relative overflow-hidden rounded-full bg-ink-900 px-8 py-4 text-sm font-medium text-cream-50 transition-all duration-500"
            >
              <span className="relative z-10">{hero.cta}</span>
              <span className="absolute inset-0 -translate-y-full bg-gold-600 transition-transform duration-500 group-hover:translate-y-0" />
            </motion.a>
            <motion.a
              href={links.maps}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 480, damping: 26 }}
              className="rounded-full border border-ink-900/15 px-7 py-4 text-sm font-medium text-ink-700 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              {hero.secondaryCta}
            </motion.a>
          </motion.div>
        </motion.div>

        {/* ── art ── */}
        <div
          ref={artRef}
          {...pointerHandlers}
          className="relative h-[360px] sm:h-[540px] lg:h-auto lg:aspect-[1.42] lg:col-start-2 lg:row-start-1 lg:row-span-2 [perspective:1400px]"
        >
          <motion.div
            style={{ y: drizzleY }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, delay: 0.2, ease }}
            aria-hidden
            className="absolute inset-x-[-8%] top-[6%] z-0 h-[70%] rounded-full blur-3xl"
          >
            <div
              className="size-full rounded-full"
              style={{
                background:
                  "radial-gradient(52% 54% at 62% 34%, rgba(240,201,210,0.85), transparent 70%), radial-gradient(44% 46% at 26% 56%, rgba(250,232,214,0.9), transparent 72%)",
              }}
            />
          </motion.div>

          <motion.div
            style={{
              y: bowlsY,
              rotateX: tiltX,
              rotateY: tiltY,
              transformStyle: "preserve-3d",
            }}
            className="absolute inset-0"
          >
            {/* one bowl, one waffle — the two things Paris Bites sells. The
                waffle is landscape where the bowl is square, so it takes more
                width to carry the same visual weight. */}
            <motion.div
              initial={{ opacity: 0, y: 70, rotate: 5 }}
              animate={{ opacity: 1, y: 0, rotate: 3 }}
              transition={{ duration: 1.3, delay: 0.5, ease }}
              className="absolute bottom-[13%] right-0 w-[98%] max-w-[400px] origin-bottom sm:bottom-[6%] [transform-style:preserve-3d] sm:right-[1%] sm:w-[60%] lg:right-[1%] lg:w-[64%] lg:max-w-[470px]"
            >
              <motion.div style={{ x: backX, y: backY }}>
                <Image
                  src={heroWaffle}
                  alt="Paris Bites Biscoff Bliss waffle"
                  sizes="(max-width: 1024px) 62vw, 470px"
                  priority
                  className="h-auto w-full drop-shadow-[0_26px_34px_rgba(53,28,13,0.18)]"
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 80, rotate: -6 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ duration: 1.3, delay: 0.36, ease }}
              className="absolute bottom-0 left-[6%] z-10 w-[76%] max-w-[330px] origin-bottom [transform-style:preserve-3d] sm:left-[27%] sm:w-[46%] lg:left-[4%] lg:w-[52%] lg:max-w-[380px]"
            >
              <div className="[transform:translateZ(90px)] [transform-style:preserve-3d]">
                <motion.div style={{ x: frontX, y: frontY }}>
                  <BowlArt
                    tone="cream"
                    id="oreo-licious"
                    label="Oreo Licious Bowl"
                    width={330}
                    sizes="(max-width: 1024px) 50vw, 330px"
                    className="h-auto w-full drop-shadow-[0_26px_34px_rgba(53,28,13,0.2)]"
                    priority
                    pour
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {[
            {
              l: "0%",
              b: "8%",
              s: 38,
              r: -18,
              k: "chocolate" as const,
              d: "0s",
            },
            {
              l: "24%",
              b: "-1%",
              s: 26,
              r: 34,
              k: "hazelnut" as const,
              d: "1.2s",
            },
            {
              l: "62%",
              b: "-2%",
              s: 40,
              r: 12,
              k: "chocolate" as const,
              d: "2.4s",
            },
            {
              l: "90%",
              b: "6%",
              s: 28,
              r: -40,
              k: "hazelnut" as const,
              d: "0.6s",
            },
            {
              l: "44%",
              b: "-4%",
              s: 22,
              r: 62,
              k: "chocolate" as const,
              d: "3.1s",
            },
          ].map((b, i) => (
            <motion.div
              key={i}
              className="absolute z-20"
              style={{ left: b.l, bottom: b.b, x: chunkX, y: chunkY }}
            >
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.9 + i * 0.1, ease }}
              >
                <span
                  className="animate-drift block"
                  style={{ animationDelay: b.d }}
                >
                  <Chunk kind={b.k} size={b.s} rotate={b.r} id={`hero-${i}`} />
                </span>
              </motion.span>
            </motion.div>
          ))}
        </div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.88 }}
          className="hidden max-w-xl grid-cols-3 gap-x-4 border-t border-ink-900/10 pt-5 sm:grid sm:pt-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-5 sm:pt-7 lg:col-start-1 lg:row-start-2 lg:mt-12 xl:flex xl:flex-wrap xl:gap-x-12 xl:gap-y-6"
        >
          {hero.stats.map((s, i) => (
            /* three across on a phone: the 2x2 grid ran past the fold on a
               16 Pro Max, so the fourth steps out below sm rather than being
               removed — it returns from 640px up */
            <div key={s.label} className={i === 3 ? "hidden sm:block" : undefined}>
              <dt className="display text-2xl sm:text-3xl">
                {"countUp" in s && typeof s.countUp === "number" ? (
                  <>
                    <CountUp to={s.countUp} />
                    {/* whatever follows the digits, e.g. the "+" of 2500+ */}
                    {s.value.replace(/^[\d,]+/, "")}
                  </>
                ) : (
                  s.value
                )}
              </dt>
              <dd className="mt-1 text-xs tracking-wide text-muted">
                {s.label}
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        style={{ opacity: fade }}
        className="absolute bottom-7 left-1/2 z-[3] hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="kicker">Scroll</span>
        <span className="h-10 w-px bg-gradient-to-b from-gold-500/70 to-transparent" />
      </motion.div>
    </section>
  );
}
