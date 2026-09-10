/**
 * Waffle product photography arrives at 1402x1122 (~2.1MB each). This caps the
 * width and recompresses; the frame is left exactly as shot — no crop, no
 * aspect change — so the 5:4 card slot in components/Waffles.tsx matches the
 * source ratio and nothing is ever cut off.
 *
 *   node scripts/prep-waffles.mjs
 *
 * Originals live in assets/waffles-raw/, outside public/, so the full-size
 * files are not deployed. To add a waffle photo: drop it there, add a line to
 * SOURCES, re-run, then add the import to lib/waffle-images.ts.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// cards render at ~440px wide on desktop, so 900 covers a 2x display
const MAX_WIDTH = 900;
const RAW = "assets/waffles-raw";
const OUT = "public/waffles";

/** original filename -> waffle id in lib/content.ts */
const SOURCES = {
  "death by chocolate waffle.png": "waffle-death-by-chocolate",
  "kitkat waffle.png": "waffle-kitkat-break",
  "strawberry waffle.png": "waffle-strawberry-bliss",
  "blueberry waffle.png": "waffle-blueberry-dream",
  "nutella waffle.png": "waffle-nutella-indulgence",
  "biscoff waffle.png": "waffle-biscoff-bliss",
};

await mkdir(OUT, { recursive: true });

for (const [file, id] of Object.entries(SOURCES)) {
  const src = `${RAW}/${file}`;
  const before = await sharp(src).metadata();

  const info = await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(`${OUT}/${id}.png`);

  console.log(
    `${id.padEnd(28)} ${before.width}x${before.height} → ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`,
  );
}
