/**
 * `getStaticPaths()` source of the three `pages/{,es/,fr/}ingredients/[id].astro`
 * wrappers (roadmap Issue 019). Reads the content collections once per locale
 * build and hands the pure `buildIngredientDetailPaths()` (tested in Vitest
 * against `public/data/*.json`) the catalog it needs.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n';
import { buildIngredientDetailPaths, type IngredientDetailPath } from '@/lib/domain/ingredient-detail';

export async function getIngredientDetailPaths(lang: Locale): Promise<IngredientDetailPath[]> {
  const [ingredients, recipes, ingredientCategories] = await Promise.all([
    getCollection('ingredients'),
    getCollection('recipes'),
    getEntry('categories', 'ingredientCategories'),
  ]);
  return buildIngredientDetailPaths(
    {
      ingredients: ingredients.map((entry: CollectionEntry<'ingredients'>) => entry.data),
      recipes: recipes.map((entry: CollectionEntry<'recipes'>) => entry.data),
      ingredientCategories: ingredientCategories?.data.items ?? [],
    },
    lang,
  );
}
