import { withBase } from '@/lib/href';

/**
 * `<img>` sources for a recipe photo (roadmap Issue 045,
 * docs/recipes/catalog-data.md § Images).
 *
 * Photos are committed pre-optimised as `public/images/recipes/<id>-<w>.webp`
 * at 320, 640 and 960 px; the catalog's `imageUrl` names one of them. From it
 * this derives the base-aware `src` plus a `srcset` over the three widths.
 * Any other site-relative URL gets `withBase()` and no `srcset`; an absolute
 * URL is passed through untouched.
 */
export const RECIPE_IMAGE_WIDTHS = [320, 640, 960] as const;

/** Intrinsic size of the exported photos (4:3), for `width`/`height` → no CLS. */
export const RECIPE_IMAGE_SIZE = { width: 640, height: 480 } as const;

export const RECIPE_IMAGE_SIZES = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

const PIPELINE = /^\/?images\/recipes\/(.+)-(\d+)\.webp$/;

export interface RecipeImageSources {
  src: string;
  srcSet?: string;
  sizes?: string;
}

export function recipeImageSources(imageUrl: string): RecipeImageSources {
  if (/^[a-z][a-z\d+.-]*:/i.test(imageUrl) || imageUrl.startsWith('//')) return { src: imageUrl };
  const match = PIPELINE.exec(imageUrl);
  if (!match) return { src: withBase(imageUrl) };
  const stem = match[1]!;
  const url = (width: number) => withBase(`/images/recipes/${stem}-${width}.webp`);
  return {
    src: url(RECIPE_IMAGE_SIZE.width),
    srcSet: RECIPE_IMAGE_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', '),
    sizes: RECIPE_IMAGE_SIZES,
  };
}
