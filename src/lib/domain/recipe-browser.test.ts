import { describe, expect, it } from 'vitest';
import { makeIngredient, makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  DEFAULT_RECIPE_BROWSER_STATE,
  RECIPE_SORT_CHOICES,
  applyRecipeBrowserState,
  clearRecipeBrowserFilters,
  countActiveFilters,
  parseRecipeBrowserState,
  serializeRecipeBrowserState,
  toggleListValue,
} from './recipe-browser';

const eggs = makeRecipe(); // rec_001 breakfast american easy 10 min 4.5★ glutenFree
const tacos = makeRecipe({
  id: 'rec_002',
  name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' },
  description: { en: 'Street tacos', es: 'Tacos callejeros', fr: 'Tacos de rue' },
  type: 'dinner',
  cuisine: ['mexican'],
  totalTime: 30,
  difficulty: 'medium',
  tags: ['comfort-food'],
  dietaryLabels: { glutenFree: false, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false },
  rating: 4.8,
  ingredients: [{ ingredientId: 'ing_beef', quantity: 500, unit: 'g', optional: false }],
});
const soup = makeRecipe({
  id: 'rec_003',
  name: { en: 'Lentil Soup', es: 'Sopa de Lentejas', fr: 'Soupe de Lentilles' },
  description: { en: 'Hearty soup', es: 'Sopa contundente', fr: 'Soupe copieuse' },
  type: 'lunch',
  cuisine: ['mediterranean'],
  totalTime: 45,
  difficulty: 'hard',
  tags: ['vegan', 'healthy'],
  dietaryLabels: { glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false },
  rating: 3.9,
  ingredients: [{ ingredientId: 'ing_lentils', quantity: 200, unit: 'g', optional: false }],
});
const recipes = [eggs, tacos, soup];
const ingredients = [
  makeIngredient({ id: 'ing_001', avgPrice: 0.5 }),
  makeIngredient({ id: 'ing_002', avgPrice: 0.01 }),
  makeIngredient({ id: 'ing_beef', avgPrice: 0.05 }),
  makeIngredient({ id: 'ing_lentils', avgPrice: 0.002 }),
];

describe('parseRecipeBrowserState', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parseRecipeBrowserState('')).toEqual(DEFAULT_RECIPE_BROWSER_STATE);
    expect(parseRecipeBrowserState('?')).toEqual(DEFAULT_RECIPE_BROWSER_STATE);
    expect(DEFAULT_RECIPE_BROWSER_STATE.sort).toBe('rating-desc');
  });

  it('reads every parameter, csv lists and repeated keys, with or without "?"', () => {
    const state = parseRecipeBrowserState(
      '?q=eggs&type=breakfast,lunch&cuisine=mexican&cuisine=greek&diet=vegan&difficulty=easy&time=30&favorites=1&sort=time-asc&view=list',
    );
    expect(state).toEqual({
      search: 'eggs',
      types: ['breakfast', 'lunch'],
      cuisines: ['mexican', 'greek'],
      dietaryTags: ['vegan'],
      difficulties: ['easy'],
      maxTime: 30,
      favoritesOnly: true,
      sort: 'time-asc',
      view: 'list',
    });
    expect(parseRecipeBrowserState(new URLSearchParams('favorites=true')).favoritesOnly).toBe(true);
  });

  it('ignores invalid values instead of throwing', () => {
    const state = parseRecipeBrowserState('sort=bogus&view=table&time=abc&favorites=0&type=,,');
    expect(state.sort).toBe('rating-desc');
    expect(state.view).toBe('grid');
    expect(state.maxTime).toBeUndefined();
    expect(state.favoritesOnly).toBe(false);
    expect(state.types).toEqual([]);
    expect(parseRecipeBrowserState('time=-5').maxTime).toBeUndefined();
  });

  it('accepts legacy sort aliases persisted by the Vite app', () => {
    expect(parseRecipeBrowserState('sort=newest').sort).toBe('newest');
  });
});

describe('serializeRecipeBrowserState', () => {
  it('serialises nothing for the defaults and only the changed fields otherwise', () => {
    expect(serializeRecipeBrowserState(DEFAULT_RECIPE_BROWSER_STATE)).toBe('');
    expect(
      serializeRecipeBrowserState({ ...DEFAULT_RECIPE_BROWSER_STATE, favoritesOnly: true }),
    ).toBe('favorites=1');
    expect(
      serializeRecipeBrowserState({
        ...DEFAULT_RECIPE_BROWSER_STATE,
        search: 'pasta ',
        types: ['dinner'],
        cuisines: ['italian', 'french'],
        sort: 'name-asc',
        view: 'list',
      }),
    ).toBe('q=pasta+&type=dinner&cuisine=italian%2Cfrench&sort=name-asc&view=list');
    // A blank search is dropped; a trailing space survives (the box is controlled by this value).
    expect(serializeRecipeBrowserState({ ...DEFAULT_RECIPE_BROWSER_STATE, search: '   ' })).toBe('');
    expect(parseRecipeBrowserState('q=onion+').search).toBe('onion ');
  });

  it('round-trips through parse', () => {
    const state = parseRecipeBrowserState('diet=gluten-free,dairy-free&difficulty=medium&time=60&sort=cost-asc');
    expect(parseRecipeBrowserState(serializeRecipeBrowserState(state))).toEqual(state);
  });
});

describe('countActiveFilters / clearRecipeBrowserFilters / toggleListValue', () => {
  it('counts list entries, max time and favourites but not search/sort/view', () => {
    expect(countActiveFilters(DEFAULT_RECIPE_BROWSER_STATE)).toBe(0);
    const state = parseRecipeBrowserState('q=x&type=a,b&diet=vegan&time=15&favorites=1&sort=name-asc&view=list');
    expect(countActiveFilters(state)).toBe(5);
  });

  it('clears the filters but keeps search, sort and view (legacy "Clear all")', () => {
    const state = parseRecipeBrowserState('q=x&type=a&cuisine=b&diet=c&difficulty=d&time=15&favorites=1&sort=name-asc&view=list');
    expect(clearRecipeBrowserFilters(state)).toEqual({
      ...DEFAULT_RECIPE_BROWSER_STATE,
      search: 'x',
      sort: 'name-asc',
      view: 'list',
    });
  });

  it('toggles a value in and out of a list without mutating it', () => {
    const list = ['a'];
    expect(toggleListValue(list, 'b')).toEqual(['a', 'b']);
    expect(toggleListValue(list, 'a')).toEqual([]);
    expect(list).toEqual(['a']);
  });
});

describe('applyRecipeBrowserState', () => {
  const ctx = { lang: 'en' as const, ingredients };

  it('sorts by rating desc by default', () => {
    expect(applyRecipeBrowserState(recipes, DEFAULT_RECIPE_BROWSER_STATE, ctx).map((r) => r.id)).toEqual([
      'rec_002',
      'rec_001',
      'rec_003',
    ]);
  });

  it('searches the localised name/description with EN fallback', () => {
    const es = parseRecipeBrowserState('q=lentejas');
    expect(applyRecipeBrowserState(recipes, es, { lang: 'es' }).map((r) => r.id)).toEqual(['rec_003']);
    const desc = parseRecipeBrowserState('q=street');
    expect(applyRecipeBrowserState(recipes, desc, ctx).map((r) => r.id)).toEqual(['rec_002']);
  });

  it('applies meal type, cuisine, dietary tag (flags or tags), difficulty and max time together', () => {
    expect(applyRecipeBrowserState(recipes, parseRecipeBrowserState('type=dinner'), ctx).map((r) => r.id)).toEqual(['rec_002']);
    expect(applyRecipeBrowserState(recipes, parseRecipeBrowserState('cuisine=mediterranean,mexican'), ctx).map((r) => r.id)).toEqual(['rec_002', 'rec_003']);
    expect(applyRecipeBrowserState(recipes, parseRecipeBrowserState('diet=dairy-free'), ctx).map((r) => r.id)).toEqual(['rec_002', 'rec_003']);
    expect(applyRecipeBrowserState(recipes, parseRecipeBrowserState('diet=gluten-free&difficulty=easy'), ctx).map((r) => r.id)).toEqual(['rec_001']);
    expect(applyRecipeBrowserState(recipes, parseRecipeBrowserState('time=30'), ctx).map((r) => r.id)).toEqual(['rec_002', 'rec_001']);
  });

  it('keeps only favourites when favoritesOnly is set', () => {
    const state = parseRecipeBrowserState('favorites=1');
    expect(applyRecipeBrowserState(recipes, state, { ...ctx, favorites: ['rec_003'] }).map((r) => r.id)).toEqual(['rec_003']);
    expect(applyRecipeBrowserState(recipes, state, ctx)).toEqual([]);
  });

  it('orders by time, cost and name', () => {
    const ids = (q: string, lang: 'en' | 'fr' = 'en') =>
      applyRecipeBrowserState(recipes, parseRecipeBrowserState(q), { ...ctx, lang }).map((r) => r.id);
    expect(ids('sort=time-asc')).toEqual(['rec_001', 'rec_002', 'rec_003']);
    // eggs: 4×0.5 + 30×0.01 = 2.3; tacos: 500×0.05 = 25; soup: 200×0.002 = 0.4
    expect(ids('sort=cost-asc')).toEqual(['rec_003', 'rec_001', 'rec_002']);
    expect(ids('sort=cost-desc')).toEqual(['rec_002', 'rec_001', 'rec_003']);
    expect(ids('sort=name-asc')).toEqual(['rec_002', 'rec_003', 'rec_001']);
    expect(ids('sort=name-asc', 'fr')).toEqual(['rec_001', 'rec_003', 'rec_002']); // Œufs, Soupe, Tacos
  });

  it('offers every sort choice as a valid SortOption with a label key', () => {
    for (const choice of RECIPE_SORT_CHOICES) {
      expect(parseRecipeBrowserState(`sort=${choice.value}`).sort).toBe(choice.value);
      expect(choice.labelKey).toMatch(/^recipe\.sort/);
    }
  });
});
