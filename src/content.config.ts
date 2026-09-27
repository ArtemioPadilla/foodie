import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { toAstroSchema } from './lib/catalog/astro-schema';
import { CATALOG_COLLECTIONS } from './lib/catalog/collections';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // `splash` reserved for the /docs landing; default content pages omit it
    template: z.enum(['splash']).optional(),
    // For the landing page hero
    hero: z
      .object({
        tagline: z.string().optional(),
        actions: z
          .array(
            z.object({
              text: z.string(),
              link: z.string(),
              variant: z.enum(['primary', 'secondary']).default('primary'),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    /** Author handle (kept generic so the scaffold doesn't presume a single author). */
    author: z.string().default('artemiopadilla'),
  }),
});

// ── Foodie catalog (roadmap Issue 011, D6) ───────────────────────────────────
// `public/data/*.json` stays the single source of truth (also fetched at
// runtime by `useCatalog`). Loading it as content collections validates every
// record against the Zod schemas from `src/schemas/` at build time, so a bad
// community recipe breaks `astro build`, not the app in production (US-1.1).
// Paths, parsers and schemas live in `src/lib/catalog/collections.ts` so the
// same table is exercised by `src/tests/catalog-schema.test.ts`; the Zod 4
// schemas are bridged to Astro's bundled Zod 3 via `toAstroSchema()`.
const recipes = defineCollection({
  loader: file(CATALOG_COLLECTIONS.recipes.file, { parser: CATALOG_COLLECTIONS.recipes.parser }),
  schema: toAstroSchema(CATALOG_COLLECTIONS.recipes.schema),
});

const ingredients = defineCollection({
  loader: file(CATALOG_COLLECTIONS.ingredients.file, {
    parser: CATALOG_COLLECTIONS.ingredients.parser,
  }),
  schema: toAstroSchema(CATALOG_COLLECTIONS.ingredients.schema),
});

const beverages = defineCollection({
  loader: file(CATALOG_COLLECTIONS.beverages.file, {
    parser: CATALOG_COLLECTIONS.beverages.parser,
  }),
  schema: toAstroSchema(CATALOG_COLLECTIONS.beverages.schema),
});

// One entry per taxonomy: `getEntry('categories', 'mealTypes').data.items`.
const categories = defineCollection({
  loader: file(CATALOG_COLLECTIONS.categories.file, {
    parser: CATALOG_COLLECTIONS.categories.parser,
  }),
  schema: toAstroSchema(CATALOG_COLLECTIONS.categories.schema),
});

export const collections = { docs, blog, recipes, ingredients, beverages, categories };
