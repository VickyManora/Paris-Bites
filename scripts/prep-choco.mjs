/**
 * Choco mascot assets arrive at ~1250px with a wide transparent margin and
 * ~1.4MB each. This trims the margin (so the PNG's own edges don't create
 * phantom spacing in a layout), caps the width, and writes to public/choco/.
 *
 *   node scripts/prep-choco.mjs
 *
 * The character is never cropped and the aspect ratio is never touched — trim
 * only removes fully transparent pixels. Originals live in assets/choco-raw/,
 * outside public/, so the full-size files are not deployed.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// largest on-screen use is ~240px, so 720 covers a 3x display
const MAX_WIDTH = 720;
const RAW = "assets/choco-raw";
const OUT = "public/choco";

/** original filename -> slug used by lib/choco-images.ts */
const SOURCES = {
  "choco.png": "choco-default",
  "choco with oreo bowl in hand.png": "choco-bowl",
  "choco with made with love heart.png": "choco-heart",
  "choco thumps up.png": "choco-thumbs-up",
  "choco carrying bag.png": "choco-bags",
  "choxo showing direction.png": "choco-directions",
};

await mkdir(OUT, { recursive: true });

for (const [file, slug] of Object.entries(SOURCES)) {
  const src = `${RAW}/${file}`;
  const before = await sharp(src).metadata();

  const info = await sharp(src)
    .trim({ threshold: 1 })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(`${OUT}/${slug}.png`);

  console.log(
    `${slug.padEnd(18)} ${before.width}x${before.height} → ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`,
  );
}
