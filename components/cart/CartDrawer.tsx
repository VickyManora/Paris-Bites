"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cart as copy, links, menu } from "@/lib/content";
import { whatsappMessage } from "@/lib/pricing";
import { useCart } from "./CartContext";
import { ease } from "../motion/Reveal";
import { Choco } from "../art/Choco";

export function CartDrawer() {
  const { open, setOpen, lines, pricing, setQty, name, setName, clear } = useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const href = `${links.whatsapp}?text=${encodeURIComponent(
    whatsappMessage(lines, name),
  )}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-ink-900/25 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-label={copy.title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-ink-900/10 bg-cream-50 shadow-[-30px_0_70px_-40px_rgba(79,44,22,0.5)]"
          >
            <header className="flex items-center justify-between border-b border-ink-900/10 px-6 py-5">
              <div>
                <h2 className="display text-xl">{copy.title}</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {pricing.count} item{pricing.count === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="flex size-10 items-center justify-center rounded-full border border-ink-900/10 text-ink-700 transition-colors hover:bg-cream-200"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Choco
                    pose="bags"
                    float="bob"
                    y={16}
                    sizes="(max-width: 640px) 44vw, 190px"
                    className="mb-6 w-[44%] max-w-[190px]"
                  />
                  <p className="display text-lg">{copy.empty}</p>
                  <p className="mt-2 text-sm text-muted">{copy.emptyHint}</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {lines.map(({ bowl, category, qty }) => (
                    <li
                      key={bowl.id}
                      className="flex items-start justify-between gap-4 border-b border-ink-900/8 pb-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{bowl.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{category.title}</p>
                        <p className="mt-1 text-sm text-ink-500">
                          {menu.currency}
                          {bowl.price} each
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex items-center rounded-full border border-ink-900/12">
                          <button
                            type="button"
                            aria-label={`Decrease ${bowl.name} quantity`}
                            onClick={() => setQty(bowl.id, qty - 1)}
                            className="flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${bowl.name} quantity`}
                            onClick={() => setQty(bowl.id, qty + 1)}
                            className="flex size-8 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-cream-200"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-14 text-right text-sm font-semibold text-ink-900 tabular-nums">
                          {menu.currency}
                          {bowl.price * qty}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <footer className="border-t border-ink-900/10 bg-cream-100 px-6 py-5">
                {pricing.combosApplied.length > 0 && (
                  <div className="mb-4 rounded-xl border border-gold-500/30 bg-blush-100 px-4 py-3">
                    {pricing.combosApplied.map((c) => (
                      <p key={c.category.id} className="text-xs text-ink-700">
                        <span className="font-semibold text-gold-600">
                          Combo applied ·
                        </span>{" "}
                        {c.count > 1 ? `${c.count} × ` : ""}2 {c.category.title} at{" "}
                        {menu.currency}
                        {c.category.combo}
                      </p>
                    ))}
                    <p className="mt-1 text-xs font-semibold text-gold-600">
                      {copy.savings}: {menu.currency}
                      {pricing.savings}
                    </p>
                  </div>
                )}

                <label className="block">
                  <span className="kicker">{copy.nameLabel}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={copy.namePlaceholder}
                    className="mt-2 w-full rounded-full border border-ink-900/12 bg-cream-50 px-5 py-3 text-sm text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-gold-500"
                  />
                </label>

                <div className="mt-5 flex items-baseline justify-between">
                  <span className="text-sm text-ink-500">{copy.total}</span>
                  <span className="display text-2xl">
                    <span className="font-sans text-[0.72em] font-medium text-gold-600">
                      {menu.currency}
                    </span>
                    {pricing.total}
                  </span>
                </div>

                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-6 py-4 text-sm font-medium text-cream-50 transition-colors hover:bg-gold-600"
                >
                  {copy.submit}
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path
                      d="M3 8h9M8.5 4l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[0.7rem] text-muted">{copy.note}</p>
                  <button
                    type="button"
                    onClick={clear}
                    className="shrink-0 text-[0.7rem] text-muted underline underline-offset-2 transition-colors hover:text-ink-700"
                  >
                    Clear
                  </button>
                </div>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
