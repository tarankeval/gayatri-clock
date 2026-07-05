/**
 * Generate PWA PNG icons from the SVG source.
 * Converts gayatri-icon.svg → gayatri-icon-192.png and gayatri-icon-512.png
 */

import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const publicDir = resolve(rootDir, "public");

const svgPath = resolve(publicDir, "gayatri-icon.svg");
const svgContent = readFileSync(svgPath, "utf-8");

const sizes = [
  { size: 192, output: "gayatri-icon-192.png" },
  { size: 512, output: "gayatri-icon-512.png" },
];

async function generate() {
  for (const { size, output } of sizes) {
    const outputPath = resolve(publicDir, output);
    console.log(`Generating ${size}x${size} → ${output}`);

    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    const stats = await sharp(outputPath).metadata();
    const sizeKB = stats.size ? (stats.size / 1024).toFixed(1) : "?";
    console.log(`  Done: ${outputPath} (${stats.width}x${stats.height}, ${sizeKB} KB)`);
  }
  console.log("\nAll icons generated!");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
