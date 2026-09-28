import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsSidebar } from '../content/docs-sidebar';

/**
 * Docs site contract (roadmap Issue 043): the MkDocs docs now live in the
 * `docs` content collection, the data-model reference is generated from
 * src/schemas, Pagefind indexes the docs and the recipe pages, and no MkDocs
 * leftovers remain.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8');

/** Content file (or generated page) behind a sidebar slug. */
function sourceOf(slug: string): string | null {
  if (slug === '') return 'src/content/docs/index.mdx';
  for (const candidate of [
    `src/content/docs/${slug}.md`,
    `src/content/docs/${slug}.mdx`,
    `src/pages/docs/${slug}.astro`,
  ]) {
    if (existsSync(join(root, candidate))) return candidate;
  }
  return null;
}

describe('docs site (roadmap #043)', () => {
  it('the sidebar has the four Foodie sections', () => {
    expect(docsSidebar.map((g) => g.label)).toEqual(['Getting started', 'Guides', 'Reference', 'Contributing']);
    const slugs = (label: string) => docsSidebar.find((g) => g.label === label)!.items.map((i) => i.slug);
    expect(slugs('Guides')).toEqual(['guides/development', 'guides/testing', 'guides/deployment']);
    expect(slugs('Reference')).toEqual(['reference/api', 'reference/state', 'reference/i18n']);
    expect(slugs('Contributing')).toEqual(['contributing/recipe-format', 'contributing/code']);
  });

  it('every sidebar entry resolves to a content file or a generated page', () => {
    const missing = docsSidebar.flatMap((g) => g.items).filter((i) => sourceOf(i.slug) === null);
    expect(missing.map((i) => i.slug)).toEqual([]);
  });

  it('the data-model reference is generated from src/schemas, not written by hand', () => {
    expect(existsSync(join(root, 'src/content/docs/reference/api.md'))).toBe(false);
    const page = read('src/pages/docs/reference/api.astro');
    expect(page).toContain("'../../../schemas/*.ts'");
    expect(page).toContain('describeModules');
  });

  it('Pagefind indexes the docs and the recipe detail bodies', () => {
    expect(read('src/layouts/DocsLayout.astro')).toMatch(/<article[^>]*data-pagefind-body/);
    expect(read('src/components/pages/RecipeDetail.astro')).toMatch(/<main[\s\S]*?data-pagefind-body[\s\S]*?>/);
  });

  it('no template (Inceptor) docs pages remain in the collection', () => {
    for (const dir of ['start-here', 'stack', 'how-we-work', 'ethics-ux', 'building', 'patterns', 'decisions', 'history']) {
      expect(existsSync(join(root, 'src/content/docs', dir)), dir).toBe(false);
    }
  });

  it.each([
    'docs/index.md',
    'docs/getting-started',
    'docs/guides',
    'docs/reference/api.md',
    'docs/contributing/recipe-format.md',
    'mkdocs.yml',
    'requirements.txt',
  ])('the MkDocs leftover %s is gone', (path) => {
    expect(existsSync(join(root, path))).toBe(false);
  });
});

describe('README and CONTRIBUTING (roadmap #044)', () => {
  const readme = read('README.md');
  const contributing = read('CONTRIBUTING.md');

  it('README shows real workflow badges for this repo (ci, deploy)', () => {
    for (const wf of ['ci.yml', 'deploy.yml']) {
      expect(readme).toContain(`https://github.com/ArtemioPadilla/foodie/actions/workflows/${wf}/badge.svg`);
      expect(existsSync(join(root, '.github/workflows', wf)), wf).toBe(true);
    }
  });

  it('README embeds the captures from docs/assets/, and they exist', () => {
    const images = [...readme.matchAll(/\]\((docs\/assets\/[^)]+\.png)\)/g)].map((m) => m[1]!);
    expect(images).toEqual(
      expect.arrayContaining([
        'docs/assets/screenshot-landing.png',
        'docs/assets/screenshot-recipe-detail.png',
        'docs/assets/screenshot-planner.png',
        'docs/assets/screenshot-tracking-progress.png',
      ]),
    );
    for (const img of images) expect(existsSync(join(root, img)), img).toBe(true);
  });

  it('README links the docs site and the legacy tag', () => {
    expect(readme).toContain('https://artemiopadilla.github.io/foodie/docs/');
    expect(readme).toContain('tree/legacy-vite-1.0.0');
  });

  it('CONTRIBUTING documents the IDD flow and the recipe flow', () => {
    expect(contributing).toMatch(/issue[\s\S]*prometeo[\s\S]*forja[\s\S]*centinela[\s\S]*PR/);
    expect(contributing).toContain('## Contributing a recipe');
    expect(contributing).toContain('src/tests/catalog-schema.test.ts');
    expect(contributing).toContain('/contribute/');
    expect(contributing).not.toMatch(/Astro 5/);
  });
});
