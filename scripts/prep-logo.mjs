/**
 * The supplied logo is a 2048px, ~500KB PNG holding three stacked pieces on a
 * transparent ground: the Eiffel-tower + "Paris Bites" script, a rule with a
 * flourish, and the "Chocolaterie & Desserts" line. This cuts it into the
 * pieces the site actually uses and writes them to public/brand/ and app/.
 *
 *   node scripts/prep-logo.mjs
 *
 *   logo-lockup.png    the whole thing — footer, where there is room for the
 *                      descriptor line to stay legible
 *   logo-wordmark.png  tower + script only — the nav, where the descriptor
 *                      would render at ~4px and turn to mush
 * Browser icons are NOT generated here — they come from the circular
 * medallion, via scripts/prep-icons.mjs.
 *
 * Neither cut is recoloured or stretched: each is a straight crop of the
 * original, trimmed of transparent margin and scaled proportionally.
 *
 * The original lives in assets/brand-raw/, outside public/, so the full-size
 * file is never deployed.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/brand-raw/paris-bites-logo.png";
const OUT = "public/brand";

/* Rows measured off the original (2048x1843). The three pieces are separated
   by fully transparent bands, so these cuts fall in empty space. */
const LOCKUP = { top: 380, height: 1080 }; // tower → descriptor line
const WORDMARK = { top: 380, height: 830 }; // tower → script, above the rule

/** crop → trim transparent margin → cap width. Trim needs its own pass:
    in a single pipeline sharp applies it before the extract, not after. */
async function piece(crop, maxWidth) {
  const cut = await sharp(SRC).extract({ left: 0, width: 2048, ...crop }).png().toBuffer();
  return sharp(cut)
    .trim({ threshold: 1 })
    .png()
    .toBuffer()
    .then((trimmed) =>
      sharp(trimmed).resize({ width: maxWidth, withoutEnlargement: true }).png({
        compressionLevel: 9,
        effort: 10,
      }),
    );
}

await mkdir(OUT, { recursive: true });

const outputs = [
  [`${OUT}/logo-lockup.png`, await piece(LOCKUP, 900)],
  [`${OUT}/logo-wordmark.png`, await piece(WORDMARK, 720)],
];

for (const [path, image] of outputs) {
  const info = await image.toFile(path);
  console.log(`${path.padEnd(28)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}
