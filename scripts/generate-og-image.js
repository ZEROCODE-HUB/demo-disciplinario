let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("❌ sharp no está instalado. Corre: npm install --save-dev sharp");
  process.exit(0);
}

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const svg = readFileSync(resolve(root, "public", "og-image.svg"), "utf-8");

const pngBuffer = await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toBuffer();

writeFileSync(resolve(root, "public", "og-image.png"), pngBuffer);
console.log("✅ OG image generated: public/og-image.png");
