import type { StaticImageData } from "next/image";

import chocoBags from "@/public/choco/choco-bags.png";
import chocoBowl from "@/public/choco/choco-bowl.png";
import chocoDefault from "@/public/choco/choco-default.png";
import chocoDirections from "@/public/choco/choco-directions.png";
import chocoHeart from "@/public/choco/choco-heart.png";
import chocoThumbsUp from "@/public/choco/choco-thumbs-up.png";

/* ── Choco, the Paris Bites mascot ────────────────────────
   The official brand assets, one entry per pose. Static imports so Next
   knows each PNG's intrinsic size (no layout shift) and can generate the
   blur placeholder.

   Generated from assets/choco-raw by scripts/prep-choco.mjs — that script
   only trims fully transparent margin and caps the width, so the character,
   its colours and its aspect ratio are exactly as supplied.
   ──────────────────────────────────────────────────────── */
export const chocoPoses = {
  /** default pose, spoon in hand */
  default: chocoDefault,
  /** holding an Oreo bowl — for the menu */
  bowl: chocoBowl,
  /** holding the "Made with Love" heart — for the brand story */
  heart: chocoHeart,
  /** thumbs up — sign-off */
  thumbsUp: chocoThumbsUp,
  /** carrying Paris Bites shopping bags — for the cart */
  bags: chocoBags,
  /** pointing with the "This Way" signboard — for directions */
  directions: chocoDirections,
} satisfies Record<string, StaticImageData>;

export type ChocoPose = keyof typeof chocoPoses;
