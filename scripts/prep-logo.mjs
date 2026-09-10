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
 *   app/icon.png       the tower alone on chocolate — favicon / tab icon,
 *                      the one piece that still reads at 16px
 *   app/apple-icon.png the same, at the size iOS asks for
 *
 * Nothing is recoloured or stretched: every output is a straight crop of the
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

/* The tower for the icon. Boxed away from the script letters that crowd it on
   both sides — below y≈1005 the "s" of Paris and the "B" of Bites reach into
   these columns, so the crop stops at the lower platform. The thin upper
   spire is left out too: the whole tower is 1:3.3 and shrinks to a faint
   sliver in a square icon, while the arch and the two platforms still read
   as the tower at 16px. */
const TOWER = { left: 928, top: 600, width: 187, height: 397 };

const CHOC = { r: 0x35, g: 0x1c, b: 0x0d, alpha: 1 }; // --choc-700

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

/** the tower, centred on a chocolate square with room to breathe */
async function icon(size) {
  const cut = await sharp(SRC).extract(TOWER).png().toBuffer();
  const trimmed = await sharp(cut).trim({ threshold: 1 }).png().toBuffer();
  const tower = await sharp(trimmed)
    .resize({ height: Math.round(size * 0.82) })
    .png()
    .toBuffer();
  const { width, height } = await sharp(tower).metadata();

  return sharp({ create: { width: size, height: size, channels: 4, background: CHOC } })
    .composite([
      {
        input: tower,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png({ compressionLevel: 9, effort: 10 });
}

await mkdir(OUT, { recursive: true });

const outputs = [
  [`${OUT}/logo-lockup.png`, await piece(LOCKUP, 900)],
  [`${OUT}/logo-wordmark.png`, await piece(WORDMARK, 720)],
  ["app/icon.png", await icon(512)],
  ["app/apple-icon.png", await icon(180)],
];

for (const [path, image] of outputs) {
  const info = await image.toFile(path);
  console.log(`${path.padEnd(28)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}
