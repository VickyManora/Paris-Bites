/**
 * Waffle product shots arrive at 1402x1122 with the waffle floating in a
 * transparent frame. This trims that margin away and caps the width, so the
 * waffle can overhang its card the same way the bowls do in the menu grid.
 *
 * Trim only removes fully transparent pixels — the waffle itself is never
 * cropped and its aspect ratio is never touched.
 *
 *   node scripts/prep-waffles.mjs
 *
 * Originals live in assets/waffles-raw/, outside public/, so the full-size
 * files are not deployed. To add a waffle photo: drop it there, add a line to
 * SOURCES, re-run, then add the import to lib/waffle-images.ts.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// the overhanging waffle renders at ~240px, so 720 covers a 3x display
const MAX_WIDTH = 720;
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
    .trim({ threshold: 1 })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(`${OUT}/${id}.png`);

  console.log(
    `${id.padEnd(28)} ${before.width}x${before.height} → ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`,
  );
}
