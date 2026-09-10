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
 * emits the <link rel="icon"> tags itself, no markup needed.
 *
 * Sources live in assets/brand-raw/, outside public/, so the multi-megabyte
 * originals are never served. Two earlier marks are kept there in case we
 * want to go back: paris-bites-medallion.png (circular PB monogram) and
 * paris-bites-tower.png (gold Eiffel tower and heart).
 */
import sharp from "sharp";

const SRC = "assets/brand-raw/paris-bites-chrome-tab.png";
const CREAM = { r: 0xff, g: 0xfd, b: 0xfb, alpha: 1 };

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

const out = [
  { file: "app/icon.png", size: 512, flatten: false },
  { file: "app/apple-icon.png", size: 180, flatten: true },
];

for (const { file, size, flatten } of out) {
  let pipe = sharp(square).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (flatten) pipe = pipe.flatten({ background: CREAM });
  const info = await pipe.png({ compressionLevel: 9, effort: 10 }).toFile(file);
  console.log(
    `${file.padEnd(22)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB${
      flatten ? "  (on cream — iOS tiles ignore alpha)" : "  (transparent)"
    }`,
  );
}
console.log(`source ${source.width}x${source.height} → ${width}x${height} after trim`);
