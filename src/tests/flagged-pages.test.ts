import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { galleryEnabled } from '../../flagged-pages.config.mjs';

/**
 * Template trim (roadmap Issue 046): the component gallery is the only
 * template reference surface left, and it ships only behind
 * flags.experimentalGallery — built in dev and in local/CI builds (the visual
 * suite screenshots it), never in the production deploy (FOODIE_DEPLOY=1).
 * The route list itself is checked against src/flagged-pages/ in
 * route-parity.test.ts.
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(`${root}${p}`, 'utf-8');

describe('galleryEnabled()', () => {
  it('is on by default outside the production deploy', () => {
    expect(galleryEnabled({})).toBe(true);
    expect(galleryEnabled({ FOODIE_DEPLOY: '' })).toBe(true);
    expect(galleryEnabled({ FOODIE_DEPLOY: '0' })).toBe(true);
  });

  it('is off in the production deploy build', () => {
    expect(galleryEnabled({ FOODIE_DEPLOY: '1' })).toBe(false);
    expect(galleryEnabled({ FOODIE_DEPLOY: 'true' })).toBe(false);
  });

  it('PUBLIC_FLAG_EXPERIMENTAL_GALLERY overrides the default either way', () => {
    expect(galleryEnabled({ FOODIE_DEPLOY: '1', PUBLIC_FLAG_EXPERIMENTAL_GALLERY: 'on' })).toBe(true);
    expect(galleryEnabled({ PUBLIC_FLAG_EXPERIMENTAL_GALLERY: 'false' })).toBe(false);
    expect(galleryEnabled({ PUBLIC_FLAG_EXPERIMENTAL_GALLERY: '0' })).toBe(false);
    // Anything else falls back to the deploy-based default.
    expect(galleryEnabled({ PUBLIC_FLAG_EXPERIMENTAL_GALLERY: 'maybe' })).toBe(true);
  });
});

describe('astro.config.mjs wiring', () => {
  const config = read('astro.config.mjs');

  it('injects the flagged pages and exports the decision to the browser flag', () => {
    expect(config).toContain('flaggedPages({ gallery: GALLERY })');
    expect(config).toContain('FOODIE_DEPLOY: process.env.FOODIE_DEPLOY');
    expect(config).toMatch(/process\.env\.PUBLIC_FLAG_EXPERIMENTAL_GALLERY = GALLERY \? 'true' : 'false'/);
  });

  it('the production deploy sets FOODIE_DEPLOY and does not force the gallery on', () => {
    const deploy = read('.github/workflows/deploy.yml');
    expect(deploy).toMatch(/FOODIE_DEPLOY: '1'/);
    expect(deploy).not.toContain('PUBLIC_FLAG_EXPERIMENTAL_GALLERY');
  });

  it('keeps no redirect into a removed template surface', () => {
    expect(config).not.toMatch(/asset\('(demos|showcase|blocks|blog)/);
  });
});

describe('removed template surfaces stay removed', () => {
  it.each([
    'src/pages/blog',
    'src/pages/demos',
    'src/pages/showcase',
    'src/pages/blocks',
    'src/pages/login.astro',
    'src/pages/contact.astro',
    'src/pages/gallery',
    'src/content/blog',
    'src/components/ui/ai',
  ])('%s does not exist', (path) => {
    expect(existsSync(`${root}${path}`)).toBe(false);
  });
});
