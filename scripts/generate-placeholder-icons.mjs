import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const output = resolve("assets/icons");
await mkdir(output, { recursive: true });

const icons = [
  { file: "firmament.png", symbol: "✦", color: "#A7FF83", secondary: "#183C32" },
  { file: "divination.png", symbol: "⌬", color: "#8EB7FF", secondary: "#172B55" },
  { file: "sports.png", symbol: "◉", color: "#F4B8FF", secondary: "#431C4E" },
];

for (const icon of icons) {
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="120" y1="80" x2="900" y2="960" gradientUnits="userSpaceOnUse">
          <stop stop-color="${icon.color}"/>
          <stop offset="1" stop-color="${icon.secondary}"/>
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <rect width="1024" height="1024" rx="210" fill="#0B0F15"/>
      <circle cx="260" cy="220" r="220" fill="${icon.color}" opacity=".35" filter="url(#blur)"/>
      <circle cx="760" cy="810" r="260" fill="${icon.secondary}" opacity=".75" filter="url(#blur)"/>
      <rect x="88" y="88" width="848" height="848" rx="184" fill="url(#g)"/>
      <rect x="112" y="112" width="800" height="800" rx="160" fill="#0B0F15" opacity=".2"/>
      <text x="512" y="635" text-anchor="middle" font-family="sans-serif" font-size="430" font-weight="700" fill="#F7FBFF">${icon.symbol}</text>
      <circle cx="512" cy="512" r="330" fill="none" stroke="#F7FBFF" stroke-width="12" opacity=".45"/>
    </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(output, icon.file));
}

console.log(`Created ${icons.length} placeholder app icons in ${output}`);
