#!/usr/bin/env node

/**
 * Icon Generator Script
 *
 * Generates all required PWA icons from the source SVG icon.
 * Uses sharp library for high-quality image conversion.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const SOURCE_ICON = join(PROJECT_ROOT, 'public', 'icons', 'icon.svg');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'icons');

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Icon sizes for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Apple touch icon size
const APPLE_ICON_SIZE = 180;

// Favicon sizes
const FAVICON_SIZES = [16, 32, 48];

async function generateIcons() {
  console.log('📦 Generating PWA icons...\n');

  try {
    // Read source SVG
    const svgBuffer = readFileSync(SOURCE_ICON);

    // Generate PWA icons
    for (const size of ICON_SIZES) {
      const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate Apple Touch Icon
    const appleTouchPath = join(OUTPUT_DIR, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath);

    console.log(`✅ Generated: apple-touch-icon.png (${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE})`);

    // Generate favicon.png (will be used for favicon.ico)
    const faviconPath = join(OUTPUT_DIR, 'favicon.png');
    await sharp(svgBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(faviconPath);

    console.log(`✅ Generated: favicon.png (32x32)`);

    // Copy SVG to public root for favicon.svg
    const faviconSvgPath = join(PROJECT_ROOT, 'public', 'favicon.svg');
    await sharp(svgBuffer)
      .toFile(faviconSvgPath);

    console.log(`✅ Generated: favicon.svg`);

    console.log('\n✨ All icons generated successfully!\n');
    console.log('📝 Note: For favicon.ico, you can use an online converter');
    console.log('   or install additional tools. The PNG favicons will work');
    console.log('   in modern browsers.\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateIcons();
