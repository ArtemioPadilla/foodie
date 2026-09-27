/**
 * Catalog schema gate (roadmap Issues 010/011, US-1.1).
 *
 * `public/data/*.json` is the single source of the Foodie catalog. This test
 * parses the four files IN FULL with the Zod schemas from `src/schemas/`, so an
 * invalid record is a red CI check (`validate-recipe-pr.yml`) and a broken
 * build — never a runtime crash in production.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  BeveragesFileSchema,
  CategoriesFileSchema,
  IngredientsFileSchema,
  RecipesFileSchema,
} from '@/schemas';

const root = resolve(__dirname, '../..');
const DATA_DIR = resolve(root, 'public/data');

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8'));
}

/** Parse with a schema and, on failure, surface every issue path in the assertion message. */
function parseOrReport<S extends z.ZodType>(schema: S, data: unknown, label: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 25)
      .map((i) => `  ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `${label} failed schema validation (${result.error.issues.length} issues):\n${issues}`,
    );
  }
  return result.data;
}

describe('public/data/*.json parses with the Zod schemas', () => {
  it('recipes.json is { recipes: Recipe[] } with 50 recipes', () => {
    const parsed = parseOrReport(RecipesFileSchema, loadJson('recipes.json'), 'recipes.json');
    expect(parsed.recipes).toHaveLength(50);
  });

  it('ingredients.json is { ingredients: Ingredient[] } with 105 ingredients', () => {
    const parsed = parseOrReport(
      IngredientsFileSchema,
      loadJson('ingredients.json'),
      'ingredients.json',
    );
    expect(parsed.ingredients).toHaveLength(105);
    // Composite ingredients carry components + yield.
    const composite = parsed.ingredients.filter((i) => i.isComposite);
    expect(composite.length).toBeGreaterThan(0);
    for (const ing of composite) {
      expect(ing.components?.length ?? 0).toBeGreaterThan(0);
      expect(ing.yield).toBeDefined();
    }
  });

  it('beverages.json is a bare Beverage[] with 39 beverages', () => {
    const parsed = parseOrReport(BeveragesFileSchema, loadJson('beverages.json'), 'beverages.json');
    expect(parsed).toHaveLength(39);
  });

  it('categories.json has the four taxonomies', () => {
    const parsed = parseOrReport(
      CategoriesFileSchema,
      loadJson('categories.json'),
      'categories.json',
    );
    expect(Object.keys(parsed).sort()).toEqual(
      ['cuisines', 'dietaryTags', 'ingredientCategories', 'mealTypes'].sort(),
    );
    expect(parsed.mealTypes.map((m) => m.id)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'dessert',
    ]);
  });
});

describe('cross-file referential integrity', () => {
  const recipes = RecipesFileSchema.parse(loadJson('recipes.json')).recipes;
  const ingredients = IngredientsFileSchema.parse(loadJson('ingredients.json')).ingredients;
  const categories = CategoriesFileSchema.parse(loadJson('categories.json'));
  const ingredientIds = new Set(ingredients.map((i) => i.id));

  it('every recipe ingredient (and variation) references an existing ingredient', () => {
    const missing: string[] = [];
    for (const r of recipes) {
      const refs = [...r.ingredients, ...(r.variations ?? []).flatMap((v) => v.changedIngredients)];
      for (const ri of refs) {
        if (!ingredientIds.has(ri.ingredientId)) missing.push(`${r.id} → ${ri.ingredientId}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every composite ingredient component references an existing ingredient', () => {
    const missing: string[] = [];
    for (const ing of ingredients) {
      for (const c of ing.components ?? []) {
        if (!ingredientIds.has(c.ingredientId)) missing.push(`${ing.id} → ${c.ingredientId}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('recipe meal types and ingredient categories exist in categories.json', () => {
    const mealTypes = new Set(categories.mealTypes.map((c) => c.id));
    const ingredientCategories = new Set(categories.ingredientCategories.map((c) => c.id));
    expect(recipes.filter((r) => !mealTypes.has(r.type)).map((r) => r.id)).toEqual([]);
    expect(
      ingredients.filter((i) => !ingredientCategories.has(i.category)).map((i) => i.id),
    ).toEqual([]);
  });
});
