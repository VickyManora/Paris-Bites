import type { StaticImageData } from "next/image";

import cartPhoto from "@/public/cart.jpg";
import logoLockup from "@/public/brand/logo-lockup.png";
import logoWordmark from "@/public/brand/logo-wordmark.png";

/* ── The Paris Bites logo ─────────────────────────────────
   Two cuts of the one supplied logo. Static imports so Next knows each
   PNG's intrinsic size and reserves the space before it loads.

   Generated from assets/brand-raw by scripts/prep-logo.mjs — that script
   only crops, trims transparent margin and scales, so the artwork itself
   is exactly as supplied.
   ──────────────────────────────────────────────────────── */
export const logos = {
  /** tower + script, no descriptor — for small sizes, e.g. the nav */
  wordmark: logoWordmark,
  /** the full logo, descriptor line included — where there is room for it */
  lockup: logoLockup,
} satisfies Record<string, StaticImageData>;

export type LogoVariant = keyof typeof logos;

/** The cart itself. Shown in the Visit section so customers know what to
 *  look for on the street — 1248x832, a clean 3:2. */
export const cartImage = cartPhoto;
