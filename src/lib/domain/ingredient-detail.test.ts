import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, type Locale } from '@/i18n';
import { CATALOG_COLLECTIONS } from '@/lib/catalog/collections';
import { CategoryGroupSchema, IngredientSchema, RecipeSchema, type Category } from '@/schemas';
import { makeIngredient, makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  buildIngredientDetailPaths,
  formatPrice,
  formatUnitPrice,
  ingredientDetailMeta,
  recipesUsingIngredient,
  resolveAlternatives,
  resolveComponents,
  type IngredientDetailCatalog,
} from './ingredient-detail';

/**
 * Ingredient detail helpers (roadmap Issue 019). The `getStaticPaths` test
 * runs the exact parser + schema the content collections use against the
 * real `public/data/*.json`: 105 ingredients × 3 locales = 315 pages, with
 * "recipes with this ingredient" computed at build.
 */

const root = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

function loadCatalog(): IngredientDetailCatalog {
  const recipes = CATALOG_COLLECTIONS.recipes.parser(read(CATALOG_COLLECTIONS.recipes.file)).map((row) => RecipeSchema.parse(row));
  const ingredients = CATALOG_COLLECTIONS.ingredients
    .parser(read(CATALOG_COLLECTIONS.ingredients.file))
    .map((row) => IngredientSchema.parse(row));
  const groups = CATALOG_COLLECTIONS.categories.parser(read(CATALOG_COLLECTIONS.categories.file)).map((row) => CategoryGroupSchema.parse(row));
  const items = (id: string): Category[] => groups.find((g) => g.id === id)?.items ?? [];
  return { recipes, ingredients, ingredientCategories: items('ingredientCategories') };
}

const catalog = loadCatalog();

describe('getStaticPaths (buildIngredientDetailPaths) on the real catalog', () => {
  it('builds 105 pages per locale — 315 in total — with unique ids', () => {
    const perLocale = LOCALES.map((lang) => buildIngredientDetailPaths(catalog, lang));
    expect(perLocale.map((paths) => paths.length)).toEqual([105, 105, 105]);
    expect(perLocale.flat()).toHaveLength(315);
    const ids = perLocale[0]?.map((p) => p.params.id) ?? [];
    expect(new Set(ids).size).toBe(105);
  });

  it('computes "recipes with this ingredient" from every recipe line', () => {
    const paths = buildIngredientDetailPaths(catalog, 'en');
    for (const path of paths) {
      const expected = catalog.recipes.filter((r) => r.ingredients.some((l) => l.ingredientId === path.params.id)).map((r) => r.id).sort();
      expect(path.props.recipes.map((r) => r.id).sort()).toEqual(expected);
    }
    // Every recipe line points at a catalog ingredient, so each recipe shows up on ≥ 1 page.
    const listed = new Set(paths.flatMap((p) => p.props.recipes.map((r) => r.id)));
    expect(listed.size).toBe(catalog.recipes.length);
  });

  it('localises the category and resolves composite components', () => {
    const [first] = buildIngredientDetailPaths(catalog, 'es').filter((p) => p.props.ingredient.isComposite);
    expect(first).toBeDefined();
    expect(first?.props.components.length).toBeGreaterThan(0);
    expect(first?.props.components.every((c) => c.known)).toBe(true);
    const protein = buildIngredientDetailPaths(catalog, 'fr').find((p) => p.props.ingredient.category === 'protein');
    expect(protein?.props.categoryName).toBe('Protéines');
  });

  it.each([
    ['src/pages/ingredients/[id].astro', 'en'],
    ['src/pages/es/ingredients/[id].astro', 'es'],
    ['src/pages/fr/ingredients/[id].astro', 'fr'],
  ] as Array<[string, Locale]>)('%s builds its paths for %s', (file, lang) => {
    const source = read(file);
    expect(source).toMatch(/export async function getStaticPaths\(\)/);
    expect(source).toContain(`getIngredientDetailPaths('${lang}')`);
    expect(source).toContain(`const lang = '${lang}' as const;`);
    expect(source).toContain('alternates={meta.alternates}');
  });

  it('the shared loader reads the ingredients and recipes collections', () => {
    const loader = read('src/lib/catalog/ingredient-detail-paths.ts');
    expect(loader).toContain("getCollection('ingredients')");
    expect(loader).toContain("getCollection('recipes')");
  });

  it('the index pages mount the IngredientBrowser island with client:load and the detail its IngredientActions with client:visible', () => {
    expect(read('src/components/pages/Ingredients.astro')).toContain('<IngredientBrowser lang={lang} client:load />');
    expect(read('src/components/pages/IngredientDetail.astro')).toMatch(/<IngredientActions\s+client:visible/);
    for (const file of ['src/pages/ingredients/index.astro', 'src/pages/es/ingredients/index.astro', 'src/pages/fr/ingredients/index.astro']) {
      expect(read(file)).toContain('<Ingredients lang={lang} />');
    }
  });
});

describe('relations', () => {
  const tomato = makeIngredient({ id: 'ing_010', name: { en: 'Tomato', es: 'Tomate', fr: 'Tomate' } });
  const basil = makeIngredient({ id: 'ing_011', name: { en: 'Basil', es: 'Albahaca', fr: 'Basilic' } });
  const sauce = makeIngredient({
    id: 'ing_020',
    name: { en: 'Tomato Sauce', es: 'Salsa de tomate', fr: 'Sauce tomate' },
    isComposite: true,
    alternatives: ['ing_011', 'tomato', 'Ketchup', 'ing_020'],
    components: [
      { ingredientId: 'ing_010', quantity: 2.5, unit: 'cup', notes: { en: 'ripe', es: 'maduro', fr: 'mûre' } },
      { ingredientId: 'ing_999', quantity: 1, unit: 'tbsp' },
    ],
  });
  const byId = new Map([tomato, basil, sauce].map((i) => [i.id, i]));
  const byName = new Map([tomato, basil, sauce].map((i) => [i.name.en.toLowerCase(), i]));

  it('resolves components with localised names, units and notes', () => {
    expect(resolveComponents(sauce, byId, 'es')).toEqual([
      { ingredientId: 'ing_010', name: 'Tomate', amount: '2 ½ taza', notes: 'maduro', known: true },
      { ingredientId: 'ing_999', name: 'ing_999', amount: '1 cda', known: false },
    ]);
  });

  it('resolves alternatives by id, then English name; keeps free text; never links to itself', () => {
    expect(resolveAlternatives(sauce, byId, byName, 'fr')).toEqual([
      { label: 'Basilic', id: 'ing_011' },
      { label: 'Tomate', id: 'ing_010' },
      { label: 'Ketchup' },
      { label: 'ing_020' },
    ]);
  });

  it('lists recipes using the ingredient (optional lines too), best rated first', () => {
    const a = makeRecipe({ id: 'rec_a', rating: 4.1 });
    const b = makeRecipe({ id: 'rec_b', rating: 4.9, ingredients: [{ ingredientId: 'ing_001', quantity: 1, unit: 'piece', optional: true }] });
    const c = makeRecipe({ id: 'rec_c', ingredients: [{ ingredientId: 'ing_777', quantity: 1, unit: 'piece', optional: false }] });
    expect(recipesUsingIngredient('ing_001', [a, b, c]).map((r) => r.id)).toEqual(['rec_b', 'rec_a']);
  });
});

describe('formatting and metadata', () => {
  it('formats prices per locale', () => {
    expect(formatPrice(1.5, 'USD', 'en')).toBe('$1.50');
    expect(formatPrice(1.5, 'USD', 'es')).toMatch(/1,50/);
    expect(formatUnitPrice(makeIngredient({ avgPrice: 3, unit: 'lb' }), 'en')).toBe('$3.00 / lb');
  });

  it('builds title, description fallback and hreflang alternates', () => {
    const ingredient = makeIngredient();
    const meta = ingredientDetailMeta(
      { ingredient, categoryName: 'Proteínas', components: [], alternatives: [], recipes: [makeRecipe()] },
      { lang: 'es', origin: 'https://example.org', base: '/foodie/', siteName: 'Foodie' },
    );
    expect(meta.title).toBe('Pechuga de Pollo — Foodie');
    expect(meta.description).toContain('Pechuga de Pollo (Proteínas)');
    expect(meta.url).toBe('https://example.org/foodie/es/ingredients/ing_001/');
    expect(meta.alternates.map((a) => a.hreflang)).toEqual(['en', 'es', 'fr', 'x-default']);
  });

  it('prefers the catalog description when there is one', () => {
    const ingredient = makeIngredient({ description: { en: 'A sauce', es: 'Una salsa', fr: 'Une sauce' } });
    const meta = ingredientDetailMeta(
      { ingredient, categoryName: 'x', components: [], alternatives: [], recipes: [] },
      { lang: 'fr', origin: 'https://example.org', base: '/', siteName: 'Foodie' },
    );
    expect(meta.description).toBe('Une sauce');
  });
});
