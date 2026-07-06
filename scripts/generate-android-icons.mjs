/**
 * Generate Android launcher icons from public/gayatri-icon.svg.
 */

import { mkdirSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const svgPath = resolve(rootDir, "public", "gayatri-icon.svg");
const resDir = resolve(rootDir, "android", "app", "src", "main", "res");
const svg = Buffer.from(readFileSync(svgPath, "utf-8"));

const densities = [
  { name: "mdpi", legacy: 48, adaptive: 108 },
  { name: "hdpi", legacy: 72, adaptive: 162 },
  { name: "xhdpi", legacy: 96, adaptive: 216 },
  { name: "xxhdpi", legacy: 144, adaptive: 324 },
  { name: "xxxhdpi", legacy: 192, adaptive: 432 },
];

async function renderContained(size, paddingRatio = 0) {
  const imageSize = Math.round(size * (1 - paddingRatio * 2));
  const rendered = await sharp(svg).resize(imageSize, imageSize).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: rendered, gravity: "center" }])
    .png()
    .toBuffer();
}

async function generate() {
  for (const density of densities) {
    const mipmapDir = resolve(resDir, `mipmap-${density.name}`);
    mkdirSync(mipmapDir, { recursive: true });

    const legacy = await renderContained(density.legacy, 0.03);
    const foreground = await renderContained(density.adaptive, 0.17);

    await sharp(legacy).toFile(resolve(mipmapDir, "ic_launcher.png"));
    await sharp(legacy).toFile(resolve(mipmapDir, "ic_launcher_round.png"));
    await sharp(foreground).toFile(resolve(mipmapDir, "ic_launcher_foreground.png"));

    console.log(
      `${density.name}: legacy ${density.legacy}x${density.legacy}, foreground ${density.adaptive}x${density.adaptive}`,
    );
  }
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
