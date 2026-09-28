import { describe, expect, it } from 'vitest';
import { recipeImageSources } from './recipe-image';

describe('recipeImageSources (roadmap #045)', () => {
  it('pipeline images get a base-aware src and a 320/640/960 srcset', () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const out = recipeImageSources('/images/recipes/rec_001-320.webp');
    expect(out.src).toBe(`${base}/images/recipes/rec_001-640.webp`);
    expect(out.srcSet).toBe(
      `${base}/images/recipes/rec_001-320.webp 320w, ${base}/images/recipes/rec_001-640.webp 640w, ${base}/images/recipes/rec_001-960.webp 960w`,
    );
    expect(out.sizes).toContain('100vw');
  });

  it('other site-relative images only get the base', () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    expect(recipeImageSources('/images/other/pic.png')).toEqual({ src: `${base}/images/other/pic.png` });
  });

  it('absolute URLs pass through', () => {
    expect(recipeImageSources('https://example.org/a.jpg')).toEqual({ src: 'https://example.org/a.jpg' });
    expect(recipeImageSources('data:image/png;base64,AAAA')).toEqual({ src: 'data:image/png;base64,AAAA' });
  });
});
