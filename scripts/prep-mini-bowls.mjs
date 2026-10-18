/**
 * Mini-bowl photos: assets/bowls-raw/mini/<name>.png -> public/bowls/mini/<bowl-id>.png
 *
 *   node scripts/prep-mini-bowls.mjs
 *
 * Most arrive as transparent cut-outs. Two do not — one sits on solid black,
 * one has a checkerboard painted in — so for those the background is cleared
 * by flood-filling from the image edges, which stops at the cup's outline.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const RAW = "assets/bowls-raw/mini";
const OUT = "public/bowls/mini";
const MAX_WIDTH = 600;

/** raw filename -> [bowl id, background to clear] */
const SOURCES = {
  "death by chocolate mini.png": ["death-by-chocolate", "black"],
  "Oreo Chocolate Dessert Cup mini.png": ["oreo-licious"],
  "kitkat mini.png": ["kitkat-break"],
  "Luxurious Paris Bites Tiramisu Cup mini.png": ["tiramisu"],
  "ParisBites Strawberry Chocolate Dessert Cup mini.png": ["strawberry-bliss"],
  "Lotus Biscoff Chocolate Dessert Cup mini.png": ["biscoff-delight"],
  "Paris Bites Blueberry Chocolate Dessert Cup mini.png": ["blueberry-bliss"],
  "nutella mini.png": ["nutella-bliss", "checker"],
};

const isBackground = {
  black: (r, g, b) => Math.max(r, g, b) < 40,
  checker: (r, g, b) => Math.min(r, g, b) > 140 && Math.max(r, g, b) - Math.min(r, g, b) < 14,
};

async function clearBackground(src, kind) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const test = isBackground[kind];
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!test(data[i], data[i + 1], data[i + 2])) continue;
    data[i + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

await mkdir(OUT, { recursive: true });

for (const [file, [id, kind]] of Object.entries(SOURCES)) {
  const src = `${RAW}/${file}`;
  const input = kind ? await clearBackground(src, kind) : src;
  const info = await sharp(input)
    .trim({ threshold: 1 })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(`${OUT}/${id}.png`);
  console.log(`${id}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)}KB`);
}
