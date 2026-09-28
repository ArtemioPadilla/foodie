import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Committed images are already optimised (roadmap Issue 045,
 * docs/recipes/catalog-data.md § Images): Foodie has no build-time image
 * step, so the repository itself must hold final files.
 *
 * - Recipe photos live in `public/images/recipes/` as WebP, ≤ 150 KB each
 *   (exported at 320/640/960 px for `srcset`).
 * - No raster image anywhere in `public/` is over 200 KB.
 */
const PUBLIC = fileURLToPath(new URL('../../public', import.meta.url));
const RECIPES = join(PUBLIC, 'images', 'recipes');
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('image budget (roadmap #045)', () => {
  it('recipe images are WebP and at most 150 KB', () => {
    if (!existsSync(RECIPES)) return; // no recipe photos yet
    const bad = walk(RECIPES)
      .filter((path) => extname(path).toLowerCase() !== '.webp' || statSync(path).size > 150 * 1024)
      .map((path) => `${relative(PUBLIC, path)} (${Math.round(statSync(path).size / 1024)} KB)`);
    expect(bad).toEqual([]);
  });

  it('no raster image in public/ is over 200 KB', () => {
    const heavy = walk(PUBLIC)
      .filter((path) => RASTER.has(extname(path).toLowerCase()) && statSync(path).size > 200 * 1024)
      .map((path) => `${relative(PUBLIC, path)} (${Math.round(statSync(path).size / 1024)} KB)`);
    expect(heavy).toEqual([]);
  });
});
