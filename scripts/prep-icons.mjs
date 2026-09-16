/**
 * Browser icons, generated from the dessert-cup cutout.
 *
 *   node scripts/prep-icons.mjs
 *
 * The source is a photograph of a Paris Bites cup, already cut out on a
 * transparent ground. All this does is trim the leftover margin, square the
 * cup up and scale it to the full icon: at 16px any padding inside the
 * square is most of the icon, so the cup has to run edge to edge.
 *
 * Transparency is kept for the tab icon, so the cup sits on the browser's
 * own tab strip rather than on a tile — that works in light and dark alike.
 * The Apple touch icon is composited onto the brand cream instead, because
 * iOS does not honour transparency on a home-screen tile: it renders black.
 *
 * `app/icon.png` and `app/apple-icon.png` are Next file conventions: Next
 * emits the <link rel="icon"> tags itself, no markup needed. The rest are
 * referenced by URL from app/manifest.ts, so they live in public/icons/.
 *
 * MASKABLE icons are the odd ones. Android crops a launcher icon to whatever
 * shape the device uses — circle, squircle, teardrop — so anything outside
 * the central 80% circle can be shaved off. An edge-to-edge cup would lose
 * its handle. Those variants therefore hold the art at 60% of the canvas on
 * a filled ground, which is the opposite of what every other icon here wants
 * and the reason `inset` exists at all.
 *
 * Sources live in assets/brand-raw/, outside public/, so the multi-megabyte
 * originals are never served. Two earlier marks are kept there in case we
 * want to go back: paris-bites-medallion.png (circular PB monogram) and
 * paris-bites-tower.png (gold Eiffel tower and heart).
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/brand-raw/paris-bites-chrome-tab.png";
const CREAM = { r: 0xff, g: 0xfd, b: 0xfb, alpha: 1 };

/** how much of a maskable canvas the artwork may occupy — see the note above */
const MASKABLE_SCALE = 0.6;

const source = await sharp(SRC).metadata();

const trimmed = await sharp(SRC).trim({ threshold: 1 }).png().toBuffer();
const { width, height } = await sharp(trimmed).metadata();
const side = Math.max(width, height);

/** the cup, centred on a transparent square so nothing is cropped */
const square = await sharp({
  create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: trimmed, gravity: "center" }])
  .png()
  .toBuffer();

await mkdir("public/icons", { recursive: true });

const out = [
  // the browser tab: transparent, so it sits on the tab strip in either theme
  { file: "app/icon.png", size: 512, flatten: false },
  // iOS home screen: flattened, because iOS renders a transparent tile black
  { file: "app/apple-icon.png", size: 180, flatten: true },
  // the manifest's own icons, referenced by URL from app/manifest.ts
  { file: "public/icons/icon-192.png", size: 192, flatten: true },
  { file: "public/icons/icon-512.png", size: 512, flatten: true },
  { file: "public/icons/maskable-192.png", size: 192, flatten: true, maskable: true },
  { file: "public/icons/maskable-512.png", size: 512, flatten: true, maskable: true },
];

for (const { file, size, flatten, maskable } of out) {
  let image;

  if (maskable) {
    /* the cup shrunk into the safe zone, then centred on a full-bleed cream
       ground so the launcher has something to crop that isn't the artwork */
    const art = await sharp(square)
      .resize(Math.round(size * MASKABLE_SCALE), Math.round(size * MASKABLE_SCALE), {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    image = sharp({
      create: { width: size, height: size, channels: 4, background: CREAM },
    }).composite([{ input: art, gravity: "center" }]);
  } else {
    image = sharp(square).resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    if (flatten) image = image.flatten({ background: CREAM });
  }

  const info = await image.png({ compressionLevel: 9, effort: 10 }).toFile(file);
  console.log(
    `${file.padEnd(30)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB${
      maskable ? "  (maskable — art at 60%)" : flatten ? "  (on cream)" : "  (transparent)"
    }`,
  );
}
console.log(`source ${source.width}x${source.height} → ${width}x${height} after trim`);
