import { describe, expect, it } from 'vitest';
import { makeIngredient, makeRecipe, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import {
  DEFAULT_INGREDIENT_BROWSER_STATE,
  activeIngredientTags,
  countIngredientFilters,
  filterIngredients,
  groupIngredientsByCategory,
  matchRecipesByIngredients,
  parseIngredientBrowserState,
  serializeIngredientBrowserState,
} from './ingredient-browser';

/** IngredientBrowser pure helpers (roadmap Issue 019). */

const chicken = makeIngredient(); // ing_001 · protein · GF/DF/NF/halal
const spinach = makeIngredient({
  id: 'ing_002',
  name: { en: 'Spinach', es: 'Espinaca', fr: 'Épinard' },
  category: 'vegetables',
  tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
});
const cheese = makeIngredient({
  id: 'ing_003',
  name: { en: 'Cheddar', es: 'Queso cheddar', fr: 'Cheddar' },
  category: 'dairy',
  tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false },
});
const mystery = makeIngredient({ id: 'ing_004', name: { en: 'Mystery', es: 'Misterio', fr: 'Mystère' }, category: 'unknown-cat' });

describe('URL state', () => {
  it('round-trips a full state and keeps defaults out of the URL', () => {
    const state = { search: 'pollo ', categories: ['protein', 'dairy'], tags: ['vegan' as const], selected: ['ing_001', 'ing_002'] };
    const query = serializeIngredientBrowserState(state);
    expect(query).toBe('q=pollo+&category=protein%2Cdairy&diet=vegan&have=ing_001%2Cing_002');
    expect(parseIngredientBrowserState(`?${query}`)).toEqual(state);
    expect(serializeIngredientBrowserState(DEFAULT_INGREDIENT_BROWSER_STATE)).toBe('');
  });

  it('drops unknown dietary tags and dedupes lists', () => {
    expect(parseIngredientBrowserState('diet=vegan,keto,vegan&category=dairy&category=dairy')).toEqual({
      ...DEFAULT_INGREDIENT_BROWSER_STATE,
      categories: ['dairy'],
      tags: ['vegan'],
    });
  });

  it('counts category and dietary filters only', () => {
    expect(countIngredientFilters({ search: 'x', categories: ['a', 'b'], tags: ['vegan'], selected: ['ing_001'] })).toBe(3);
  });
});

describe('activeIngredientTags', () => {
  it('lists true flags in display order and folds vegetarian into vegan', () => {
    expect(activeIngredientTags(spinach.tags)).toEqual(['vegan', 'glutenFree', 'dairyFree', 'nutFree', 'kosher', 'halal']);
    expect(activeIngredientTags(spinach.tags, { collapseVegetarian: false })).toContain('vegetarian');
    expect(activeIngredientTags(cheese.tags)).toEqual(['vegetarian', 'glutenFree', 'nutFree', 'kosher']);
  });
});

describe('filterIngredients', () => {
  const all = [chicken, spinach, cheese, mystery];
  const base = { search: '', categories: [], tags: [] };

  it('searches the localised name with EN fallback, accent-insensitive', () => {
    expect(filterIngredients(all, { ...base, search: 'espinaca' }, 'es').map((i) => i.id)).toEqual(['ing_002']);
    expect(filterIngredients(all, { ...base, search: 'epinard' }, 'fr').map((i) => i.id)).toEqual(['ing_002']);
    // EN name matches in every locale.
    expect(filterIngredients(all, { ...base, search: 'chicken' }, 'fr').map((i) => i.id)).toEqual(['ing_001']);
  });

  it('ORs categories and ANDs dietary tags', () => {
    expect(filterIngredients(all, { ...base, categories: ['protein', 'dairy'] }, 'en').map((i) => i.id)).toEqual(['ing_001', 'ing_003']);
    expect(filterIngredients(all, { ...base, tags: ['glutenFree', 'vegetarian'] }, 'en').map((i) => i.id)).toEqual(['ing_002', 'ing_003']);
    expect(filterIngredients(all, { ...base, tags: ['vegan'], categories: ['dairy'] }, 'en')).toEqual([]);
  });
});

describe('groupIngredientsByCategory', () => {
  it('follows the taxonomy order, localises labels, sorts items and puts unknown categories last', () => {
    const extraVeg = makeIngredient({ id: 'ing_010', name: { en: 'Arugula', es: 'Rúcula', fr: 'Roquette' }, category: 'vegetables' });
    const groups = groupIngredientsByCategory([mystery, cheese, spinach, chicken, extraVeg], mockIngredientCategories, 'es');
    expect(groups.map((g) => g.category)).toEqual(['protein', 'vegetables', 'dairy', 'unknown-cat']);
    expect(groups.map((g) => g.label)).toEqual(['Proteínas', 'Verduras', 'Lácteos', 'unknown cat']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['ing_002', 'ing_010']); // Espinaca < Rúcula
  });
});

describe('matchRecipesByIngredients (legacy "Recipes You Can Make")', () => {
  const eggs = makeRecipe(); // ing_001 + ing_002, both required
  const salad = makeRecipe({
    id: 'rec_002',
    rating: 4.9,
    ingredients: [
      { ingredientId: 'ing_002', quantity: 1, unit: 'cup', optional: false },
      { ingredientId: 'ing_003', quantity: 1, unit: 'cup', optional: false },
      { ingredientId: 'ing_009', quantity: 1, unit: 'cup', optional: false },
      { ingredientId: 'ing_001', quantity: 1, unit: 'piece', optional: true },
    ],
  });

  it('returns nothing without a selection', () => {
    expect(matchRecipesByIngredients([eggs, salad], [])).toEqual([]);
  });

  it('ranks by the share of required ingredients selected; optional lines do not count', () => {
    const matches = matchRecipesByIngredients([salad, eggs], ['ing_001', 'ing_002']);
    expect(matches.map((m) => [m.recipe.id, m.matchedIngredients, m.totalIngredients])).toEqual([
      ['rec_001', 2, 2],
      ['rec_002', 1, 3],
    ]);
    expect(matches[0]?.matchPercentage).toBe(100);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => makeRecipe({ id: `rec_${100 + i}` }));
    expect(matchRecipesByIngredients(many, ['ing_001'])).toHaveLength(12);
  });
});
