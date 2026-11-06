import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const sharp = require("sharp");

const sourcePng = path.join(root, "public", "brand", "icon-512.png");
const destPng = path.join(__dirname, "icon.png");
const destIco = path.join(__dirname, "icon.ico");

/** Rayon type icône Windows 11 (~22 % du côté). */
const CORNER_RATIO = 0.22;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

if (!fs.existsSync(sourcePng)) {
  console.error(`Icône source introuvable : ${sourcePng}`);
  process.exit(1);
}

/**
 * Recadre l’icône en carré arrondi avec coins transparents.
 * @param {number} size
 */
async function roundedPng(size) {
  const radius = Math.max(2, Math.round(size * CORNER_RATIO));
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`,
  );

  return sharp(sourcePng)
    .resize(size, size, { fit: "cover" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const master = await roundedPng(512);
fs.writeFileSync(destPng, master);

const sized = await Promise.all(ICO_SIZES.map((s) => roundedPng(s)));
const ico = await pngToIco(sized);
fs.writeFileSync(destIco, ico);

console.log(`OK → icône arrondie ${destIco} (${ICO_SIZES.join("/")} px)`);
