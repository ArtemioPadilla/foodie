// Generate Foodie's brand raster assets from the single SVG source
// (public/icons/logo-source.svg — the legacy Foodie chef-hat icon):
//
//   public/icons/pwa-192.png, pwa-512.png, pwa-maskable-512.png
//   public/apple-touch-icon.png (180×180, flattened on emerald)
//   public/favicon.svg (hat-only mark, legible at 16px) + favicon.ico (32×32)
//   public/og-image.png (1200×630) + public/og-source.svg
//
// Pure SVG → sharp. `sharp` is NOT a project dependency (roadmap Issue 003 /
// D2): install it ad hoc and never commit it to package.json —
//
//   npm i -D --no-save sharp && node scripts/generate-brand-assets.mjs
//
// Re-run whenever logo-source.svg or the brand copy below changes. Text uses
// whatever sans-serif fontconfig resolves (DejaVu Sans on Linux CI images).

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pub = (p) => resolve(root, 'public', p);

const BRAND = '#10b981'; // emerald — --color-primary-500
const NAME = 'Foodie';
const TAGLINE = 'Your Personal Meal Planning Assistant';
const SITE = 'artemiopadilla.github.io/foodie';
const SANS = "'DejaVu Sans', 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif";

const logoSvg = readFileSync(pub('icons/logo-source.svg'), 'utf-8');
// Inner markup of the logo (everything between the root <svg> tags) so it can
// be re-composed at other scales without nested <svg> quirks in librsvg.
const logoInner = logoSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// The chef-hat mark only (drops the "Foodie" wordmark, which is unreadable
// below ~64px). It lives inside the first <g transform="translate(128, 100)">.
const hatMark = logoInner.match(/<g transform="translate\(128, 100\)">[\s\S]*?<\/g>\s*<\/g>/)?.[0];
if (!hatMark) throw new Error('logo-source.svg: chef-hat group not found — update the selector');

const wrap = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">${body}</svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 });

// 1. PWA "any" icons: the logo as-is (rounded emerald tile + hat + wordmark).
for (const size of [192, 512]) {
  await png(logoSvg, size).toFile(pub(`icons/pwa-${size}.png`));
}

// 2. Maskable icon: full-bleed emerald, artwork inside the 80% safe zone.
const maskable = wrap(
  512,
  `<rect width="512" height="512" fill="${BRAND}"/>` +
    `<g transform="translate(51.2 51.2) scale(0.8)">${logoInner.replace(/<rect width="512" height="512" rx="64" fill="#10b981"\/>/, '')}</g>`,
);
await png(maskable, 512).toFile(pub('icons/pwa-maskable-512.png'));

// 3. Apple touch icon: iOS adds its own mask, so flatten on emerald (no
//    transparent corners) and use the hat-only mark for legibility.
const hatTile = (size, radius) =>
  wrap(
    size,
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>` +
      // hat group spans x≈32..224, y≈16..320 inside its own translate(128,100)
      // → its centre is (256, 268) in the logo's 512×512 space;
      // → re-center and scale so it fills ~76% of the tile.
      `<g transform="translate(${size / 2} ${size / 2}) scale(${(size * 0.76) / 320}) translate(-256 -268)">${hatMark}</g>`,
  );
await png(hatTile(512, 0), 180).toFile(pub('apple-touch-icon.png'));

// 4. Favicons: SVG (crisp at any size) + a 32×32 PNG wrapped in an ICO
//    container (single-image ICO with PNG payload — supported by every
//    evergreen browser and Windows ≥ Vista).
const faviconSvg = hatTile(64, 12);
writeFileSync(pub('favicon.svg'), `${faviconSvg}\n`);
const favicon32 = await png(faviconSvg, 32).toBuffer();
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // image count
ico.writeUInt8(32, 6); // width
ico.writeUInt8(32, 7); // height
ico.writeUInt8(0, 8); // palette
ico.writeUInt8(0, 9); // reserved
ico.writeUInt16LE(1, 10); // color planes
ico.writeUInt16LE(32, 12); // bits per pixel
ico.writeUInt32LE(favicon32.length, 14); // payload size
ico.writeUInt32LE(22, 18); // payload offset
writeFileSync(pub('favicon.ico'), Buffer.concat([ico, favicon32]));

// 5. Also keep the 512 SVG variant in sync (some manifests prefer a vector).
writeFileSync(pub('icons/pwa-512.svg'), logoSvg);

// 6. Open Graph image — title + tagline on emerald, hat mark on the right.
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="${BRAND}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.5" r="0.55">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(880 315) scale(0.95) translate(-256 -268)">${hatMark}</g>
  <g transform="translate(72, 78)">
    <rect rx="999" width="236" height="40" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1"/>
    <circle cx="22" cy="20" r="6" fill="#fbbf24"/>
    <text x="40" y="26" font-family="${SANS}" font-size="16" fill="#ffffff" font-weight="600">EN · ES · FR · offline-first</text>
  </g>
  <text x="72" y="300" font-family="${SANS}" font-size="132" font-weight="800" fill="#ffffff" letter-spacing="-4">${NAME}</text>
  <text x="76" y="372" font-family="${SANS}" font-size="34" font-weight="500" fill="#ecfdf5">${TAGLINE}</text>
  <text x="76" y="440" font-family="${SANS}" font-size="22" fill="#d1fae5">Recipes · Meal planner · Shopping list · Pantry · Nutrition</text>
  <text x="76" y="570" font-family="'DejaVu Sans Mono', ui-monospace, monospace" font-size="18" fill="#a7f3d0">${SITE}</text>
</svg>
`;
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(pub('og-image.png'));
writeFileSync(pub('og-source.svg'), ogSvg);

console.log('Brand assets regenerated: icons/pwa-*.png, apple-touch-icon.png, favicon.svg/.ico, og-image.png');
