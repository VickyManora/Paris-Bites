/**
 * Browser icons, generated from the gold Eiffel tower mark.
 *
 *   node scripts/prep-icons.mjs
 *
 * The source is gold art on an opaque white square. Two things have to
 * happen before it works as a favicon:
 *
 * 1. White becomes transparent, so the icon is the tower and the heart
 *    rather than a white tile — and so it reads on a dark tab strip as well
 *    as a light one. This is the standard un-premultiply, not a colour-key:
 *    alpha comes from how far each pixel is from white and the colour is
 *    divided back out, which keeps the lattice's anti-aliased edges clean
 *    instead of leaving a white fringe around every strut.
 *
 * 2. The margin is trimmed and the art is squared up and scaled to the full
 *    icon, because at 16px any padding inside the square is most of the icon.
 *
 * `app/icon.png` and `app/apple-icon.png` are Next file conventions: Next
 * emits the <link rel="icon"> tags itself, no markup needed.
 *
 * Apple touch icons are composited onto the brand cream, because iOS does
 * not honour transparency on a home-screen tile — it would render black.
 *
 * Sources live in assets/brand-raw/, outside public/, so the originals are
 * never served. paris-bites-medallion.png is the earlier circular PB mark,
 * kept there if we ever want to go back to it.
 */
import sharp from "sharp";

const SRC = "assets/brand-raw/paris-bites-chrome-tab.png";
const CREAM = { r: 0xff, g: 0xfd, b: 0xfb, alpha: 1 };

/** white → transparent, un-premultiplied so edges keep their colour */
async function whiteToAlpha(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // distance from white, taken on the lightest channel: white → 0, ink → high
    const alpha = 255 - Math.min(r, g, b);

    // the "white" ground is not exactly 255 everywhere — a couple of levels
    // of noise would otherwise leave a fully opaque border that survives the
    // trim, and the mark would go back to floating in the middle of the icon
    if (alpha <= 6) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }

    const white = 255 - alpha;
    out[i] = Math.max(0, Math.min(255, Math.round(((r - white) * 255) / alpha)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(((g - white) * 255) / alpha)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(((b - white) * 255) / alpha)));
    out[i + 3] = alpha;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

const source = await sharp(SRC).metadata();
const trimmed = await sharp(await whiteToAlpha(SRC)).trim({ threshold: 1 }).png().toBuffer();
const { width, height } = await sharp(trimmed).metadata();
const side = Math.max(width, height);

/** the trimmed mark, centred on a transparent square so nothing is cropped */
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
