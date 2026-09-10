"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { brand, nav } from "@/lib/content";
import { useCart } from "./cart/CartContext";
import { Choco } from "./art/Choco";
import { Logo } from "./brand/Logo";
import { ease } from "./motion/Reveal";

export function Nav() {
  const [active, setActive] = useState(nav.links[0].label);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pricing, setOpen: setCartOpen } = useCart();

  // how far down the page you are, as a gold hairline under the bar
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 border-b transition-opacity duration-500 ${
            scrolled
              ? "border-ink-900/8 bg-cream-50/85 opacity-100 shadow-[0_10px_30px_-24px_rgba(79,44,22,0.5)] backdrop-blur-xl"
              : "border-transparent opacity-0"
          }`}
        />

        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className={`absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 transition-opacity duration-500 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`relative mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 transition-all duration-500 sm:px-8 ${
            scrolled ? "py-3" : "py-5"
          }`}
        >
          {/* the descriptor line is dropped at this size — see Logo */}
          <a href="#home" className="shrink-0">
            <Logo
              priority
              sizes="(max-width: 640px) 104px, 136px"
              className={`transition-all duration-500 ${
                scrolled ? "h-10 sm:h-12" : "h-12 sm:h-16"
              }`}
            />
          </a>

          <nav className="glass hidden items-center rounded-full p-1.5 lg:flex">
            {nav.links.map((l) => {
              const isActive = active === l.label;
              return (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setActive(l.label)}
                  className="relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-gold-500 shadow-[0_8px_20px_-10px_rgba(169,125,51,0.8)]"
                      transition={{ duration: 0.45, ease }}
                    />
                  )}
                  <span
                    className={`relative z-10 ${
                      isActive ? "text-white" : "text-ink-500 hover:text-ink-900"
                    }`}
                  >
                    {l.label}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="glass hidden items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium text-ink-700 xl:flex">
              <span className="size-1.5 rounded-full bg-gold-500" />
              {nav.hours}
            </span>

            {/* cart */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${pricing.count} item${pricing.count === 1 ? "" : "s"}`}
              className="glass relative flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:text-gold-600"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <path
                  d="M3.2 4.2h1.9l1.9 8.4h7.6l1.7-6.2H6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="8.3" cy="15.6" r="1.3" fill="currentColor" />
                <circle cx="14.2" cy="15.6" r="1.3" fill="currentColor" />
              </svg>
              <AnimatePresence>
                {pricing.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold-600 text-[0.65rem] font-semibold text-white"
                  >
                    {pricing.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.a
              href="#menu"
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 480, damping: 26 }}
              className="hidden rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-cream-50 transition-all duration-300 hover:bg-gold-600 sm:inline-block sm:px-6"
            >
              Order now
            </motion.a>

            <motion.button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              onClick={() => setOpen((v) => !v)}
              className="glass relative z-50 flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:text-gold-600 lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <path
                  d={open ? "M5 5l10 10M15 5L5 15" : "M3.5 6.5h13M3.5 13.5h13"}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-0 z-40 bg-cream-100/97 backdrop-blur-xl lg:hidden"
          >
            <nav className="relative flex h-full flex-col justify-center gap-1 px-8">
              {nav.links.map((l, i) => (
                <motion.a
                  key={l.label}
                  href={l.href}
                  onClick={() => {
                    setActive(l.label);
                    setOpen(false);
                  }}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.06 + i * 0.06, ease }}
                  whileTap={{ scale: 0.96, x: 6 }}
                  className="display origin-left border-b border-ink-900/10 py-5 text-3xl transition-colors hover:text-gold-600"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-8 text-sm text-muted"
              >
                {nav.hours} · {brand.area}, {brand.city}
              </motion.p>

              {/* the overlay's lower right is otherwise dead space, and this
                  is the one place on mobile with room for the full character */}
              <Choco
                pose="default"
                float="sway"
                delay={0.5}
                sizes="42vw"
                className="absolute bottom-8 right-6 w-[42%] max-w-[190px]"
              />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
