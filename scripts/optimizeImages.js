#!/usr/bin/env node

/**
 * Optimize images for web using Sharp
 * Usage: node scripts/optimizeImages.js
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const IMAGES_DIR = './public/images';
const SIZES = [
  { width: 400, suffix: '-sm' },
  { width: 800, suffix: '-md' },
  { width: 1200, suffix: '-lg' },
];

async function optimizeImages() {
  console.log('🖼️  Optimizing images...\n');

  try {
    const files = await readdir(IMAGES_DIR);
    const imageFiles = files.filter(f =>
      f.match(/\.(jpg|jpeg|png|webp)$/i) && !f.includes('-sm') && !f.includes('-md') && !f.includes('-lg')
    );

    console.log(`Found ${imageFiles.length} images to optimize\n`);

    for (const file of imageFiles) {
      const inputPath = join(IMAGES_DIR, file);
      const baseName = file.replace(/\.[^.]+$/, '');
      const ext = file.split('.').pop();

      console.log(`Processing: ${file}`);

      // Generate responsive sizes
      for (const { width, suffix } of SIZES) {
        const outputPath = join(IMAGES_DIR, `${baseName}${suffix}.${ext}`);

        await sharp(inputPath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .jpeg({ quality: 85, progressive: true })
          .png({ compressionLevel: 9 })
          .webp({ quality: 85 })
          .toFile(outputPath);

        console.log(`  ✓ Created ${suffix} (${width}px)`);
      }

      // Generate WebP versions
      const webpPath = join(IMAGES_DIR, `${baseName}.webp`);
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      console.log(`  ✓ Created WebP version\n`);
    }

    console.log('✅ Image optimization complete!\n');
    return 0;
  } catch (error) {
    console.error('❌ Error optimizing images:', error.message);
    return 1;
  }
}

optimizeImages().then(process.exit);
