import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { galleryManifest } from '../content/gallery';
import { galleryRecipes } from '../content/gallery-recipes';

/**
 * Roadmap Issue 021 — the Foodie domain components are consolidated and
 * documented:
 *   1. every component file in src/components/domain/ has a `domain` gallery
 *      entry (demo island) and a usage snippet, and is covered by
 *      docs/component-guidelines/foodie.md;
 *   2. React 19 idioms: no `React.FC` / `forwardRef` in the Foodie code
 *      (domain components, Foodie islands, page bodies) — `ref` is a prop;
 *   3. no legacy global `.btn-*` / `.card` styles: everything goes through
 *      the kit.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8');
const list = (rel: string, re: RegExp) =>
  readdirSync(join(root, rel))
    .filter((f) => re.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `${rel}/${f}`);

const domainFiles = list('src/components/domain', /\.tsx$/);
const FOODIE_ISLANDS = [
  'RecipeBrowser',
  'RecipeDetailActions',
  'IngredientBrowser',
  'IngredientActions',
  'FavoriteRecipes',
  'ShowcaseFoodie',
].map((name) => `src/components/islands/${name}.tsx`);
const pageBodies = list('src/components/pages', /\.astro$/);

describe('Foodie domain components — gallery + guidelines (roadmap #021)', () => {
  const domainEntries = galleryManifest.filter((e) => e.category === 'domain');
  const guidelines = read('docs/component-guidelines/foodie.md');

  it.each(domainFiles)('%s has a gallery entry, a demo island, a snippet and a guidelines section', (file) => {
    const entry = domainEntries.find((e) => e.source === file);
    expect(entry, `no gallery.ts entry with source ${file}`).toBeDefined();
    expect(entry!.island).toBe('ShowcaseFoodie');
    expect(galleryRecipes[entry!.slug], `no gallery-recipes snippet for ${entry!.slug}`).toBeDefined();
    const component = file.split('/').pop()!.replace('.tsx', '');
    expect(guidelines).toMatch(new RegExp(`^## ${component}$`, 'm'));
  });

  it('the ShowcaseFoodie island implements every domain slug', () => {
    const island = read('src/components/islands/ShowcaseFoodie.tsx');
    for (const entry of domainEntries) expect(island).toContain(`'${entry.slug}': `);
  });

  it('the guidelines README lists foodie.md', () => {
    expect(read('docs/component-guidelines/README.md')).toContain('[`foodie.md`](./foodie.md)');
  });
});

describe('Foodie code uses React 19 idioms and the kit (roadmap #021)', () => {
  it.each([...domainFiles, ...FOODIE_ISLANDS, ...pageBodies])('%s has no React.FC / forwardRef', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\bReact\.FC\b|\bFC</);
    expect(src).not.toMatch(/\bforwardRef\b/);
  });

  it.each([...domainFiles, ...FOODIE_ISLANDS, ...pageBodies])('%s uses no legacy .btn-* / .card classes', (file) => {
    const classTokens = (read(file).match(/class(?:Name)?=(?:"[^"]*"|\{[^}]*\})/g) ?? []).join(' ');
    expect(classTokens).not.toMatch(/(^|[\s"'`])btn(-[a-z]+)?(?=[\s"'`]|$)/);
    expect(classTokens).not.toMatch(/(^|[\s"'`])card(?=[\s"'`]|$)/);
  });

  it('global stylesheets declare no legacy .btn-* / .card rules', () => {
    for (const file of list('src/styles', /\.css$/)) {
      const css = read(file);
      expect(css, file).not.toMatch(/^\s*\.btn(-[a-z]+)?\s*[,{:]/m);
      expect(css, file).not.toMatch(/^\s*\.card\s*[,{:]/m);
    }
  });
});
