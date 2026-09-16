import type { StaticImageData } from "next/image";

import biscoffDelight from "@/public/bowls/biscoff-delight.png";
import blueberryBliss from "@/public/bowls/blueberry-bliss.png";
import deathByChocolate from "@/public/bowls/death-by-chocolate.png";
import kitkatBreak from "@/public/bowls/kitkat-break.png";
import miniBowl from "@/public/bowls/mini-bowl.png";
import nutellaBliss from "@/public/bowls/nutella-bliss.png";
import oreoLicious from "@/public/bowls/oreo-licious.png";
import strawberryBliss from "@/public/bowls/strawberry-bliss.png";
import tiramisu from "@/public/bowls/tiramisu.png";

/* ── Bowl photography ─────────────────────────────────────
   Keyed by the bowl `id` in content.ts. Static imports so Next
   knows each photo's intrinsic size and can generate the blur
   placeholder — a bowl with no entry here falls back to the
   hand-drawn SVG in components/art/Bowl.tsx.

   Photos are generated from public/_raw by scripts/prep-bowls.mjs.
   ──────────────────────────────────────────────────────── */
export const bowlPhotos: Record<string, StaticImageData> = {
  "death-by-chocolate": deathByChocolate,
  "oreo-licious": oreoLicious,
  "kitkat-break": kitkatBreak,
  "mini-bowl": miniBowl,
  tiramisu,
  "strawberry-bliss": strawberryBliss,
  "biscoff-delight": biscoffDelight,
  "blueberry-bliss": blueberryBliss,
  "nutella-bliss": nutellaBliss,
};

export function bowlPhoto(id: string): StaticImageData | undefined {
  return bowlPhotos[id];
}
