/**
 * Bowl photos come out of the shoot at 1536x1024 with the cup floating in a
 * large transparent margin. This trims to the cup, caps the width, and writes
 * the result to public/bowls/<bowl-id>.png.
 *
 *   node scripts/prep-bowls.mjs
 *
 * Originals live in assets/bowls-raw/ — outside public/, so they are never
 * deployed. To add a bowl: drop the photo there, add a line to SOURCES, re-run.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const MAX_WIDTH = 900;
const RAW = "assets/bowls-raw";
const OUT = "public/bowls";

/** raw filename -> bowl id in lib/content.ts */
const SOURCES = {
  "death_by_chocolate.png": "death-by-chocolate",
  "oreo.png": "oreo-licious",
  "kitkat.png": "kitkat-break",
  "tiramisu.png": "tiramisu",
  "strawberrry.png": "strawberry-bliss",
  "biscoff.png": "biscoff-delight",
  "blueberry.png": "blueberry-bliss",
  "nutella.png": "nutella-bliss",
  "mini_bowl.png": "mini-bowl",
};

await mkdir(OUT, { recursive: true });

for (const [file, id] of Object.entries(SOURCES)) {
  const src = `${RAW}/${file}`;
  const dest = `${OUT}/${id}.png`;
  const before = (await sharp(src).metadata()).width;

  const info = await sharp(src)
    .trim({ threshold: 1 }) // drop the transparent margin
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(dest);

  console.log(
    `${file} → ${id}.png  ${before}px → ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`,
  );
}
