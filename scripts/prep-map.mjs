/**
 * The illustrated Aundh map used in the Visit section.
 *
 *   node scripts/prep-map.mjs
 *
 * No crop and no trim: every landmark customers navigate by — Nexus Westend
 * Mall, The White House, Mula River, Nagras Rd, New DP Rd, D-Mart — is drawn
 * into the artwork, and the Paris Bites marker sits near the middle. Cropping
 * to a different aspect would cut one of them off, so the component renders
 * it at its own ratio and this script only resizes and recompresses.
 *
 * Source lives in assets/brand-raw/, outside public/, so the 1.6MB original
 * is never served.
 */
import sharp from "sharp";

const SRC = "assets/brand-raw/location-map-aundh.png";
const OUT = "public/brand/location-map-aundh.png";
// renders at ~760px on desktop, so 1600 covers a 2x display
const MAX_WIDTH = 1600;

const before = await sharp(SRC).metadata();
const info = await sharp(SRC)
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(OUT);

console.log(
  `${before.width}x${before.height} → ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB  (aspect ${(info.width / info.height).toFixed(3)} preserved)`,
);
