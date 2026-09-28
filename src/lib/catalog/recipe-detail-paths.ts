/**
 * `getStaticPaths()` source of the three `pages/{,es/,fr/}recipes/[id].astro`
 * wrappers (roadmap Issue 018). Reads the content collections once per locale
 * build and hands the pure `buildRecipeDetailPaths()` (tested in Vitest
 * against `public/data/*.json`) the catalog it needs.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n';
import { buildRecipeDetailPaths, type RecipeDetailPath } from '@/lib/domain/recipe-detail';

export async function getRecipeDetailPaths(lang: Locale): Promise<RecipeDetailPath[]> {
  const [recipes, ingredients, cuisines, mealTypes] = await Promise.all([
    getCollection('recipes'),
    getCollection('ingredients'),
    getEntry('categories', 'cuisines'),
    getEntry('categories', 'mealTypes'),
  ]);
  return buildRecipeDetailPaths(
    {
      recipes: recipes.map((entry: CollectionEntry<'recipes'>) => entry.data),
      ingredients: ingredients.map((entry: CollectionEntry<'ingredients'>) => entry.data),
      cuisines: cuisines?.data.items ?? [],
      mealTypes: mealTypes?.data.items ?? [],
    },
    lang,
  );
}
