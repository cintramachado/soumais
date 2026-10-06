import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(scriptDirectory, "../public");
const sourcePath = path.join(publicDirectory, "brand/soul-mais-cristo.jpg");
const iconsDirectory = path.join(publicDirectory, "icons");
const appIconPath = path.resolve(scriptDirectory, "../src/app/icon.png");

await mkdir(iconsDirectory, { recursive: true });

for (const size of [192, 512]) {
  await sharp(sourcePath)
    .resize(size, size, {
      fit: "contain",
      background: "#f5f7f4",
    })
    .png()
    .toFile(path.join(iconsDirectory, `icon-${size}.png`));
}

await sharp(sourcePath)
  .resize(128, 128, {
    fit: "contain",
    background: "#f5f7f4",
  })
  .png()
  .toFile(appIconPath);