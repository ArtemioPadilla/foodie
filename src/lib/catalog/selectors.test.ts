import { describe, expect, it } from 'vitest';
import { makeIngredient, makeRecipe, mockBeverages } from '@/tests/fixtures/foodie-domain';
import {
  dietaryTagKey,
  filterRecipes,
  getBeverageById,
  getBeveragesByCategory,
  getIngredientName,
  getRecipeById,
  getRecipesByIngredient,
  pickLang,
  recipeHasDietaryTag,
  searchBeverages,
  searchRecipes,
  sortRecipes,
} from './selectors';

/**
 * Port of legacy `tests/unit/contexts/BeverageContext.test.tsx` (25 tests).
 * The 7 loading / fetch / provider-guard tests have no pure equivalent — the
 * fetch moves to `useCatalog()` (Issue 016) where they are re-created against
 * TanStack Query; the 18 selector behaviours are covered here.
 */
describe('getBeverageById', () => {
  it('returns beverage with matching ID', () => {
    expect(getBeverageById(mockBeverages, 'bev_water')?.id).toBe('bev_water');
  });

  it('returns undefined for non-existent ID', () => {
    expect(getBeverageById(mockBeverages, 'non-existent')).toBeUndefined();
  });

  it('handles empty beverage list', () => {
    expect(getBeverageById([], 'bev_water')).toBeUndefined();
  });
});

describe('getBeveragesByCategory', () => {
  it('returns beverages with matching category', () => {
    const water = getBeveragesByCategory(mockBeverages, 'water');
    expect(water).toHaveLength(1);
    expect(water[0]?.category).toBe('water');
  });

  it('returns empty array for non-existent category', () => {
    expect(getBeveragesByCategory(mockBeverages, 'non-existent')).toEqual([]);
  });

  it('returns multiple beverages for same category', () => {
    const more = [...mockBeverages, { ...mockBeverages[1]!, id: 'bev_espresso', name: { en: 'Espresso', es: 'Espresso', fr: 'Espresso' } }];
    expect(getBeveragesByCategory(more, 'coffee').length).toBeGreaterThanOrEqual(2);
  });
});

describe('searchBeverages', () => {
  it('returns all beverages for empty query', () => {
    expect(searchBeverages(mockBeverages, '')).toHaveLength(mockBeverages.length);
  });

  it('returns all beverages for whitespace-only query', () => {
    expect(searchBeverages(mockBeverages, '   ')).toHaveLength(mockBeverages.length);
  });

  it('does not return the same array instance (safe to mutate)', () => {
    expect(searchBeverages(mockBeverages, '')).not.toBe(mockBeverages);
  });

  it('filters beverages by name (case-insensitive)', () => {
    const results = searchBeverages(mockBeverages, 'water');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((b) => b.name.en.toLowerCase().includes('water'))).toBe(true);
  });

  it('handles uppercase search terms', () => {
    expect(searchBeverages(mockBeverages, 'WATER').length).toBeGreaterThan(0);
  });

  it('handles partial matches', () => {
    expect(searchBeverages(mockBeverages, 'wat').length).toBeGreaterThan(0);
  });

  it('returns empty array for no matches', () => {
    expect(searchBeverages(mockBeverages, 'nonexistent')).toEqual([]);
  });

  it('trims whitespace from search query', () => {
    expect(searchBeverages(mockBeverages, '  water  ')).toEqual(searchBeverages(mockBeverages, 'water'));
  });

  it('uses translated names for search', () => {
    expect(searchBeverages(mockBeverages, 'agua', 'es').map((b) => b.id)).toEqual(['bev_water']);
    expect(searchBeverages(mockBeverages, 'eau', 'fr').map((b) => b.id)).toEqual(['bev_water']);
    expect(searchBeverages(mockBeverages, 'agua', 'en')).toEqual([]);
  });
});

describe('pickLang', () => {
  it('returns the requested locale and falls back to English when blank', () => {
    expect(pickLang({ en: 'Water', es: 'Agua', fr: 'Eau' }, 'fr')).toBe('Eau');
    expect(pickLang({ en: 'Water', es: '', fr: 'Eau' }, 'es')).toBe('Water');
  });
});

// ── Recipes / ingredients (roadmap Issue 016 — RecipeContext / IngredientContext semantics) ──
const eggs = makeRecipe(); // rec_001, breakfast, american, easy, 10 min, rating 4.5, 10 reviews, 2025-01-01
const tacos = makeRecipe({
  id: 'rec_002',
  name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' },
  description: { en: 'Street food', es: 'Comida callejera', fr: 'Cuisine de rue' },
  type: 'dinner',
  cuisine: ['mexican'],
  prepTime: 15,
  cookTime: 20,
  totalTime: 35,
  difficulty: 'medium',
  tags: ['gluten-free', 'high-protein'],
  // Explicit flags: the fixture default marks everything vegetarian, and since
  // roadmap Issue 017 `filterRecipes` matches dietary flags too.
  dietaryLabels: { glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false },
  rating: 4.8,
  reviewCount: 40,
  dateAdded: '2025-03-01',
  ingredients: [{ ingredientId: 'ing_beef', quantity: 500, unit: 'g', optional: false }],
});
const soup = makeRecipe({
  id: 'rec_003',
  name: { en: 'Onion Soup', es: 'Sopa de Cebolla', fr: 'Soupe à l’Oignon' },
  type: 'lunch',
  cuisine: ['french'],
  prepTime: 10,
  cookTime: 50,
  totalTime: 60,
  difficulty: 'hard',
  tags: ['vegetarian', 'comfort-food'],
  rating: 3.9,
  reviewCount: 25,
  dateAdded: '2024-06-15',
  ingredients: [{ ingredientId: 'ing_onion', quantity: 3, unit: 'piece', optional: false }],
});
const recipes = [eggs, tacos, soup];
const ingredients = [
  makeIngredient(),
  makeIngredient({ id: 'ing_onion', name: { en: 'Onion', es: 'Cebolla', fr: 'Oignon' }, avgPrice: 0.5 }),
  makeIngredient({ id: 'ing_beef', name: { en: 'Beef', es: 'Res', fr: 'Bœuf' }, avgPrice: 0.02 }),
];

describe('getRecipeById', () => {
  it('finds by id and returns undefined otherwise', () => {
    expect(getRecipeById(recipes, 'rec_002')?.name.en).toBe('Beef Tacos');
    expect(getRecipeById(recipes, 'nope')).toBeUndefined();
    expect(getRecipeById([], 'rec_001')).toBeUndefined();
  });
});

describe('getIngredientName', () => {
  it('returns the localised name and falls back to the id (legacy IngredientContext)', () => {
    expect(getIngredientName(ingredients, 'ing_onion', 'fr')).toBe('Oignon');
    expect(getIngredientName(ingredients, 'ing_onion', 'es')).toBe('Cebolla');
    expect(getIngredientName(ingredients, 'ing_onion')).toBe('Onion');
    expect(getIngredientName(ingredients, 'ing_unknown', 'fr')).toBe('ing_unknown');
  });
});

describe('getRecipesByIngredient', () => {
  it('lists the recipes whose lines reference the ingredient', () => {
    expect(getRecipesByIngredient(recipes, 'ing_001').map((r) => r.id)).toEqual(['rec_001']);
    expect(getRecipesByIngredient(recipes, 'ing_none')).toEqual([]);
  });
});

describe('searchRecipes', () => {
  it('returns every recipe for a blank or whitespace query', () => {
    expect(searchRecipes(recipes, '')).toHaveLength(3);
    expect(searchRecipes(recipes, '   ', 'fr')).toHaveLength(3);
  });

  it('matches the name in any locale, case-insensitively and trimmed', () => {
    expect(searchRecipes(recipes, '  TACOS ', 'en').map((r) => r.id)).toEqual(['rec_002']);
    expect(searchRecipes(recipes, 'huevos', 'en').map((r) => r.id)).toEqual(['rec_001']);
    expect(searchRecipes(recipes, 'oignon', 'es').map((r) => r.id)).toEqual(['rec_003']);
  });

  it('also matches the description in the requested language only', () => {
    expect(searchRecipes(recipes, 'callejera', 'es').map((r) => r.id)).toEqual(['rec_002']);
    expect(searchRecipes(recipes, 'callejera', 'en')).toEqual([]);
    expect(searchRecipes(recipes, 'zzz')).toEqual([]);
  });
});

describe('filterRecipes', () => {
  it('returns a copy of everything for empty filters', () => {
    const out = filterRecipes(recipes, {});
    expect(out).toEqual(recipes);
    expect(out).not.toBe(recipes);
  });

  it('filters by type, cuisine and difficulty (exact / any-of)', () => {
    expect(filterRecipes(recipes, { types: ['dinner'] }).map((r) => r.id)).toEqual(['rec_002']);
    expect(filterRecipes(recipes, { cuisines: ['french', 'american'] }).map((r) => r.id)).toEqual([
      'rec_001',
      'rec_003',
    ]);
    expect(filterRecipes(recipes, { difficulties: ['easy', 'hard'] })).toHaveLength(2);
  });

  it('matches dietaryLabels and tags against the recipe tags or flags (any-of)', () => {
    expect(filterRecipes(recipes, { dietaryLabels: ['vegetarian'] }).map((r) => r.id)).toEqual([
      'rec_001',
      'rec_003',
    ]);
    expect(filterRecipes(recipes, { tags: ['comfort-food', 'high-protein'] })).toHaveLength(2);
    expect(filterRecipes(recipes, { tags: ['keto'] })).toEqual([]);
  });

  it('matches dietaryLabels against the dietaryLabels flags too (roadmap Issue 017)', () => {
    // `eggs` has glutenFree: true but is not tagged 'gluten-free'; the data
    // marks 26 recipes dairyFree without a single 'dairy-free' tag.
    expect(dietaryTagKey('gluten-free')).toBe('glutenFree');
    expect(dietaryTagKey('vegan')).toBe('vegan');
    expect(recipeHasDietaryTag(eggs, 'gluten-free')).toBe(true);
    expect(recipeHasDietaryTag(eggs, 'vegan')).toBe(false);
    expect(filterRecipes(recipes, { dietaryLabels: ['gluten-free'] }).map((r) => r.id)).toContain(
      'rec_001',
    );
    expect(filterRecipes(recipes, { dietaryLabels: ['kosher'] })).toEqual([]);
  });

  it('caps total, prep and cook time', () => {
    expect(filterRecipes(recipes, { maxTime: 35 }).map((r) => r.id)).toEqual(['rec_001', 'rec_002']);
    expect(filterRecipes(recipes, { maxPrepTime: 10 }).map((r) => r.id)).toEqual(['rec_001', 'rec_003']);
    expect(filterRecipes(recipes, { maxCookTime: 5 }).map((r) => r.id)).toEqual(['rec_001']);
    expect(filterRecipes(recipes, { maxTime: 0 })).toHaveLength(3); // 0 = unset, as in legacy
  });

  it('combines search with the other filters and supports ingredient ids', () => {
    expect(filterRecipes(recipes, { search: 'tacos', types: ['breakfast'] })).toEqual([]);
    expect(filterRecipes(recipes, { search: 'sopa', types: ['lunch'] }, 'es')).toHaveLength(1);
    expect(filterRecipes(recipes, { ingredients: ['ing_onion', 'ing_beef'] })).toHaveLength(2);
  });
});

describe('sortRecipes', () => {
  const ids = (list: ReturnType<typeof sortRecipes>) => list.map((r) => r.id);

  it('does not mutate the input', () => {
    const copy = [...recipes];
    sortRecipes(recipes, 'rating-asc');
    expect(recipes).toEqual(copy);
  });

  it('sorts by rating, time, popularity and date (plus legacy aliases)', () => {
    expect(ids(sortRecipes(recipes, 'rating-desc'))).toEqual(['rec_002', 'rec_001', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'rating'))).toEqual(['rec_002', 'rec_001', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'rating-asc'))).toEqual(['rec_003', 'rec_001', 'rec_002']);
    expect(ids(sortRecipes(recipes, 'time-asc'))).toEqual(['rec_001', 'rec_002', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'prepTime'))).toEqual(['rec_001', 'rec_002', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'time-desc'))).toEqual(['rec_003', 'rec_002', 'rec_001']);
    expect(ids(sortRecipes(recipes, 'popular'))).toEqual(['rec_002', 'rec_003', 'rec_001']);
    expect(ids(sortRecipes(recipes, 'recent'))).toEqual(['rec_002', 'rec_001', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'newest'))).toEqual(['rec_002', 'rec_001', 'rec_003']);
  });

  it('sorts by difficulty rank in both directions', () => {
    expect(ids(sortRecipes(recipes, 'difficulty-asc'))).toEqual(['rec_001', 'rec_002', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'difficulty-desc'))).toEqual(['rec_003', 'rec_002', 'rec_001']);
  });

  it('sorts by the localised name', () => {
    expect(ids(sortRecipes(recipes, 'name-asc'))).toEqual(['rec_002', 'rec_003', 'rec_001']);
    expect(ids(sortRecipes(recipes, 'name-desc'))).toEqual(['rec_001', 'rec_003', 'rec_002']);
    // es: Huevos Revueltos, Sopa de Cebolla, Tacos de Res
    expect(ids(sortRecipes(recipes, 'name', { lang: 'es' }))).toEqual(['rec_001', 'rec_003', 'rec_002']);
  });

  it('sorts by cost when the ingredient catalog is supplied, otherwise keeps order', () => {
    // eggs: 4 × 3 = 12 (+ unknown ing_002 skipped); tacos: 500 × 0.02 = 10; soup: 3 × 0.5 = 1.5
    expect(ids(sortRecipes(recipes, 'cost-asc', { ingredients }))).toEqual(['rec_003', 'rec_002', 'rec_001']);
    expect(ids(sortRecipes(recipes, 'cost-desc', { ingredients }))).toEqual(['rec_001', 'rec_002', 'rec_003']);
    expect(ids(sortRecipes(recipes, 'cost'))).toEqual(['rec_001', 'rec_002', 'rec_003']);
  });
});
