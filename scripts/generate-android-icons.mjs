import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import sharp from "sharp";

const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const foregroundSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

const [, , inputArgument, outputArgument] = process.argv;
const inputPath = inputArgument ? resolve(inputArgument) : null;
const androidResources = resolve(
  outputArgument ?? "android/app/src/main/res",
);

if (!inputPath) {
  console.error(
    "Usage: pnpm icons:android <path-to-1024x1024.png> [android-res-directory]",
  );
  process.exit(1);
}

try {
  await access(inputPath);
} catch {
  console.error(`Master icon not found: ${inputPath}`);
  process.exit(1);
}

const image = sharp(inputPath).ensureAlpha();
const metadata = await image.metadata();
if (metadata.width !== 1024 || metadata.height !== 1024) {
  console.error(
    `Expected a 1024×1024 PNG. Received ${metadata.width ?? "unknown"}×${metadata.height ?? "unknown"}.`,
  );
  process.exit(1);
}

for (const [folder, size] of Object.entries(sizes)) {
  const destination = resolve(androidResources, folder);
  await mkdir(destination, { recursive: true });
  await image
    .clone()
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(resolve(destination, "ic_launcher.png"));
  await image
    .clone()
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(resolve(destination, "ic_launcher_round.png"));
}

// Adaptive-icon foregrounds use a larger safe canvas so Android can crop/mask them.
for (const [folder, size] of Object.entries(foregroundSizes)) {
  const destination = resolve(androidResources, folder);
  await mkdir(destination, { recursive: true });
  await image
    .clone()
    .resize(Math.round(size * 0.66), Math.round(size * 0.66), {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: Math.floor(size * 0.17),
      bottom: Math.ceil(size * 0.17),
      left: Math.floor(size * 0.17),
      right: Math.ceil(size * 0.17),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(resolve(destination, "ic_launcher_foreground.png"));
}

const adaptiveDirectory = resolve(androidResources, "mipmap-anydpi-v26");
const drawableDirectory = resolve(androidResources, "drawable");
await mkdir(adaptiveDirectory, { recursive: true });
await mkdir(drawableDirectory, { recursive: true });

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n`;
const background = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="#10151D" />\n</shape>\n`;
await writeFile(resolve(adaptiveDirectory, "ic_launcher.xml"), adaptiveIcon);
await writeFile(resolve(adaptiveDirectory, "ic_launcher_round.xml"), adaptiveIcon);
await writeFile(resolve(drawableDirectory, "ic_launcher_background.xml"), background);

console.log(`Generated Android launcher icons in ${androidResources}`);
