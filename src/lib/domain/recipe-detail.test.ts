import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, type Locale } from '@/i18n';
import { CATALOG_COLLECTIONS } from '@/lib/catalog/collections';
import { CategoryGroupSchema, IngredientSchema, RecipeSchema, type Category } from '@/schemas';
import { makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  buildIngredientMeta,
  buildRecipeDetailPaths,
  defaultPlanSlot,
  formatCountdown,
  isoMinutes,
  recipeDetailMeta,
  recipeJsonLd,
  relatedRecipes,
  scaledIngredientLines,
  shoppingItemsFor,
  unitLabel,
  type RecipeDetailCatalog,
} from './recipe-detail';
import { toPreferredUnit } from './units';

/**
 * Recipe detail helpers (roadmap Issue 018). The `getStaticPaths` test runs
 * the exact parser + schema the content collections use against the real
 * `public/data/*.json`, so "50 recipes × 3 locales = 150 static pages" is
 * asserted on the shipped catalog, not on a fixture.
 */

const root = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

function loadCatalog(): RecipeDetailCatalog {
  const recipes = CATALOG_COLLECTIONS.recipes.parser(read(CATALOG_COLLECTIONS.recipes.file)).map((row) => RecipeSchema.parse(row));
  const ingredients = CATALOG_COLLECTIONS.ingredients
    .parser(read(CATALOG_COLLECTIONS.ingredients.file))
    .map((row) => IngredientSchema.parse(row));
  const groups = CATALOG_COLLECTIONS.categories.parser(read(CATALOG_COLLECTIONS.categories.file)).map((row) => CategoryGroupSchema.parse(row));
  const items = (id: string): Category[] => groups.find((g) => g.id === id)?.items ?? [];
  return { recipes, ingredients, cuisines: items('cuisines'), mealTypes: items('mealTypes') };
}

const catalog = loadCatalog();

describe('getStaticPaths (buildRecipeDetailPaths) on the real catalog', () => {
  it('emits 50 static paths per locale — 150 recipe pages in total', () => {
    const perLocale = LOCALES.map((lang) => buildRecipeDetailPaths(catalog, lang));
    for (const paths of perLocale) expect(paths).toHaveLength(50);
    expect(perLocale.flat()).toHaveLength(150);
  });

  it('uses every recipe id exactly once, as the `[id]` param', () => {
    const ids = buildRecipeDetailPaths(catalog, 'en').map((p) => p.params.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(catalog.recipes.map((r) => r.id).sort());
  });

  it('resolves localised props at build (ingredient names, cuisines, meal type, related)', () => {
    const [first] = buildRecipeDetailPaths(catalog, 'es');
    expect(first).toBeDefined();
    const { recipe, ingredientMeta, cuisineNames, mealTypeName, related } = first!.props;
    for (const line of recipe.ingredients) {
      const ingredient = catalog.ingredients.find((i) => i.id === line.ingredientId);
      if (ingredient) expect(ingredientMeta[line.ingredientId]?.name).toBe(ingredient.name.es);
    }
    expect(cuisineNames).toHaveLength(recipe.cuisine.length);
    expect(mealTypeName).not.toBe('');
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
  });

  it.each([
    ['src/pages/recipes/[id].astro', 'en'],
    ['src/pages/es/recipes/[id].astro', 'es'],
    ['src/pages/fr/recipes/[id].astro', 'fr'],
  ] as Array<[string, Locale]>)('%s builds its paths for %s', (file, lang) => {
    const source = read(file);
    expect(source).toMatch(/export async function getStaticPaths\(\)/);
    expect(source).toContain(`getRecipeDetailPaths('${lang}')`);
    expect(source).toContain(`const lang = '${lang}' as const;`);
    expect(source).toContain('jsonLd={meta.jsonLd}');
    expect(source).toContain('alternates={meta.alternates}');
  });

  it('the shared loader reads the recipes collection', () => {
    const loader = read('src/lib/catalog/recipe-detail-paths.ts');
    expect(loader).toContain("getCollection('recipes')");
  });
});

describe('relatedRecipes', () => {
  const base = makeRecipe({ id: 'a', cuisine: ['mexican'], type: 'dinner' });
  const sameCuisine = makeRecipe({ id: 'b', cuisine: ['mexican'], type: 'lunch', rating: 3 });
  const sameType = makeRecipe({ id: 'c', cuisine: ['french'], type: 'dinner', rating: 5 });
  const unrelated = makeRecipe({ id: 'd', cuisine: ['french'], type: 'breakfast' });

  it('ranks shared cuisine above shared meal type, never includes itself or unrelated recipes', () => {
    expect(relatedRecipes(base, [base, unrelated, sameType, sameCuisine]).map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('honours the limit', () => {
    expect(relatedRecipes(base, [base, sameType, sameCuisine], 1)).toHaveLength(1);
  });

  it('every related recipe on the real catalog shares a cuisine or a meal type', () => {
    for (const path of buildRecipeDetailPaths(catalog, 'en')) {
      const { recipe, related } = path.props;
      for (const other of related) {
        expect(other.id).not.toBe(recipe.id);
        const shares = other.type === recipe.type || other.cuisine.some((c) => recipe.cuisine.includes(c));
        expect(shares).toBe(true);
      }
    }
  });
});

describe('recipeJsonLd', () => {
  const recipe = makeRecipe({
    instructions: [
      { step: 1, text: { en: 'Whisk', es: 'Batir', fr: 'Fouetter' }, time: 2 },
      { step: 2, text: { en: 'Cook', es: 'Cocinar', fr: 'Cuire' } },
    ],
  });
  const meta = { ing_001: { name: 'Huevo' }, ing_002: { name: 'Leche' } };
  const ld = recipeJsonLd(recipe, {
    lang: 'es',
    url: 'https://example.test/es/recipes/rec_001/',
    ingredientMeta: meta,
    fallbackImage: 'https://example.test/og-image.png',
    siteName: 'Foodie',
  });

  it('carries the schema.org Recipe fields the roadmap requires', () => {
    expect(ld['@type']).toBe('Recipe');
    expect(ld.name).toBe('Huevos Revueltos');
    expect(ld.image).toEqual(['https://example.test/og-image.png']);
    expect(ld.totalTime).toBe('PT10M');
    expect(ld.recipeYield).toBe('2 porciones');
    expect(ld.nutrition).toMatchObject({ '@type': 'NutritionInformation', calories: expect.stringContaining('calories') });
    expect(ld.recipeIngredient).toEqual(['4 pieza Huevo', '30 ml Leche']);
    expect(ld.recipeInstructions).toEqual([
      { '@type': 'HowToStep', position: 1, text: 'Batir' },
      { '@type': 'HowToStep', position: 2, text: 'Cocinar' },
    ]);
    expect(ld.inLanguage).toBe('es');
  });

  it('omits aggregateRating without reviews', () => {
    const none = recipeJsonLd(makeRecipe({ reviewCount: 0 }), {
      lang: 'en',
      url: 'u',
      ingredientMeta: {},
      fallbackImage: 'i',
      siteName: 'Foodie',
    });
    expect(none).not.toHaveProperty('aggregateRating');
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 10 });
  });

  it('formats ISO durations', () => {
    expect(isoMinutes(25)).toBe('PT25M');
    expect(isoMinutes(-3)).toBe('PT0M');
  });
});

describe('recipeDetailMeta', () => {
  it('localises title/description, emits hreflang alternates and one Recipe JSON-LD block', () => {
    const recipe = makeRecipe();
    const meta = recipeDetailMeta(
      { recipe, related: [], ingredientMeta: buildIngredientMeta(recipe, [], 'fr'), cuisineNames: [], mealTypeName: '' },
      { lang: 'fr', origin: 'https://example.test', base: '/foodie/', siteName: 'Foodie', fallbackImage: 'https://example.test/foodie/og-image.png' },
    );
    expect(meta.title).toBe('Œufs Brouillés — Foodie');
    expect(meta.description).toBe('Œufs moelleux');
    expect(meta.url).toBe('https://example.test/foodie/fr/recipes/rec_001/');
    expect(meta.alternates.map((a) => a.hreflang)).toEqual(['en', 'es', 'fr', 'x-default']);
    expect(meta.alternates[0]?.href).toBe('https://example.test/foodie/recipes/rec_001/');
    expect(meta.ogImage).toBeUndefined();
    expect(meta.jsonLd).toHaveLength(1);
    expect(meta.jsonLd[0]).toMatchObject({ '@type': 'Recipe', url: meta.url });
  });

  it('uses the recipe image as OG image when present', () => {
    const meta = recipeDetailMeta(
      { recipe: makeRecipe({ imageUrl: '/images/eggs.jpg' }), related: [], ingredientMeta: {}, cuisineNames: [], mealTypeName: '' },
      { lang: 'en', origin: 'https://example.test', base: '/foodie/', siteName: 'Foodie', fallbackImage: 'x' },
    );
    expect(meta.ogImage).toBe('https://example.test/foodie/images/eggs.jpg');
  });
});

describe('scaling, shopping and plan helpers', () => {
  const recipe = makeRecipe({
    servings: 2,
    ingredients: [
      { ingredientId: 'ing_001', quantity: 4, unit: 'piece', optional: false },
      { ingredientId: 'ing_002', quantity: 1, unit: 'cup', preparation: 'warm', optional: false },
      { ingredientId: 'ing_003', quantity: 0, unit: 'pinch', optional: true },
    ],
  });
  const meta = { ing_001: { name: 'Egg', category: 'protein' }, ing_002: { name: 'Milk', category: 'dairy' } };

  it('scales quantities by servings / recipe.servings and formats them', () => {
    const lines = scaledIngredientLines(recipe, 3, meta, 'en');
    expect(lines.map((l) => l.amount)).toEqual(['6 piece', '1 ½ cup', '']);
    expect(lines[1]).toMatchObject({ name: 'Milk', preparation: 'warm', optional: false });
    expect(lines[2]).toMatchObject({ name: 'ing_003', optional: true });
  });

  it('converts to the preferred unit system after scaling', () => {
    const lines = scaledIngredientLines(recipe, 2, meta, 'en', (q, u) => toPreferredUnit(q, u, 'metric'));
    expect(lines[1]?.amount).toMatch(/ml$/);
  });

  it('builds shopping items for the non-optional ingredients at the selected yield', () => {
    expect(shoppingItemsFor(recipe, 4, meta)).toEqual([
      { ingredientId: 'ing_001', quantity: 8, unit: 'piece', usedIn: ['rec_001'], category: 'protein' },
      { ingredientId: 'ing_002', quantity: 2, unit: 'cup', usedIn: ['rec_001'], category: 'dairy' },
    ]);
  });

  it('maps meal types onto planner slots', () => {
    expect(defaultPlanSlot('breakfast')).toBe('breakfast');
    expect(defaultPlanSlot('dinner')).toBe('dinner');
    expect(defaultPlanSlot('snack')).toBe('snacks');
    expect(defaultPlanSlot('dessert')).toBe('snacks');
  });

  it('formats the countdown and unit labels', () => {
    expect(formatCountdown(125)).toBe('02:05');
    expect(formatCountdown(-4)).toBe('00:00');
    expect(unitLabel('es', 'piece')).toBe('pieza');
    expect(unitLabel('en', 'fl oz')).toBe('fl oz');
  });
});
