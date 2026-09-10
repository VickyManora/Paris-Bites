import type { StaticImageData } from "next/image";

import biscoffBliss from "@/public/waffles/waffle-biscoff-bliss.png";
import blueberryDream from "@/public/waffles/waffle-blueberry-dream.png";
import deathByChocolate from "@/public/waffles/waffle-death-by-chocolate.png";
import kitkatBreak from "@/public/waffles/waffle-kitkat-break.png";
import nutellaIndulgence from "@/public/waffles/waffle-nutella-indulgence.png";
import strawberryBliss from "@/public/waffles/waffle-strawberry-bliss.png";

/* ── Waffle photography ───────────────────────────────────
   Keyed by the waffle `id` in content.ts. Static imports so Next knows the
   intrinsic size (no layout shift) and can build the blur placeholder.

   Every shot is 1402x1122 — exactly 5:4 — which is why the card's image slot
   is `aspect-[5/4]`: at that ratio `object-cover` crops nothing at all.

   All six waffles are photographed. A waffle with no entry here would fall
   back to the "photo coming soon" panel rather than borrow another
   product's picture — that path is kept for anything added later.

   Generated from assets/waffles-raw by scripts/prep-waffles.mjs.
   ───────────────────────────────────────────────────────── */
export const wafflePhotos: Record<string, StaticImageData> = {
  "waffle-death-by-chocolate": deathByChocolate,
  "waffle-kitkat-break": kitkatBreak,
  "waffle-strawberry-bliss": strawberryBliss,
  "waffle-blueberry-dream": blueberryDream,
  "waffle-nutella-indulgence": nutellaIndulgence,
  "waffle-biscoff-bliss": biscoffBliss,
};

export function wafflePhoto(id: string): StaticImageData | undefined {
  return wafflePhotos[id];
}
