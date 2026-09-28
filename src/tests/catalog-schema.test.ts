/**
 * Catalog schema gate (roadmap Issues 010/011, US-1.1).
 *
 * `public/data/*.json` is the single source of the Foodie catalog. This test
 * parses the four files IN FULL with the Zod schemas from `src/schemas/`, so an
 * invalid record is a red CI check (`validate-recipe-pr.yml`) and a broken
 * build — never a runtime crash in production.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { file as fileLoader, type LoaderContext } from 'astro/loaders';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  BeveragesFileSchema,
  CategoriesFileSchema,
  IngredientPricesFileSchema,
  IngredientsFileSchema,
  LOCALES,
  RecipesFileSchema,
} from '@/schemas';
import { toAstroSchema } from '@/lib/catalog/astro-schema';
import {
  CATALOG_COLLECTION_NAMES,
  CATALOG_COLLECTIONS,
  CATEGORY_ENTRY_IDS,
  type CatalogCollectionName,
} from '@/lib/catalog/collections';
import { findDuplicateRecipes } from '../../scripts/check-duplicates.mjs';

const root = resolve(__dirname, '../..');
const DATA_DIR = resolve(root, 'public/data');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

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

describe('public/data/ingredient-prices.json (roadmap Issue 041, ADR 0014)', () => {
  // PR #28's store price sheet, re-keyed onto catalog ids: 51 quotes (the 45
  // that match an ingredient's English name, 6 aliases, honey twice).
  const prices = parseOrReport(
    IngredientPricesFileSchema,
    loadJson('ingredient-prices.json'),
    'ingredient-prices.json',
  );
  const ingredients = IngredientsFileSchema.parse(loadJson('ingredients.json')).ingredients;

  it('is { [ingredientId]: { price, unit, currency, legacyKey } } with 51 quotes', () => {
    expect(Object.keys(prices)).toHaveLength(51);
    expect(prices.ing_001).toEqual({ price: 4.29, unit: 'dozen', currency: 'USD', legacyKey: 'eggs' });
  });

  it('every quote is keyed by an existing catalog ingredient', () => {
    const ids = new Set(ingredients.map((i) => i.id));
    expect(Object.keys(prices).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('keys are sorted so diffs stay readable', () => {
    const keys = Object.keys(prices);
    expect(keys).toEqual([...keys].sort());
  });

  it('rejects a non-positive price or a unit that is not a pack unit', () => {
    expect(
      IngredientPricesFileSchema.safeParse({ ing_001: { price: 0, unit: 'lb', currency: 'USD', legacyKey: 'x' } }).success,
    ).toBe(false);
    expect(
      IngredientPricesFileSchema.safeParse({ ing_001: { price: 1, unit: '1 lb', currency: 'USD', legacyKey: 'x' } }).success,
    ).toBe(false);
    expect(
      IngredientPricesFileSchema.safeParse({ ing_001: { price: 1, unit: 'lb', currency: 'usd', legacyKey: 'x' } }).success,
    ).toBe(false);
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

// ── Content collections (Issue 011) ──────────────────────────────────────────
//
// `astro:content` is a Vite virtual module that only exists inside Astro's
// own Vite pipeline, so `getCollection()` cannot be called from this Vitest
// config. Instead we run the SAME `file()` loader, parser and schema that
// `src/content.config.ts` wires into `defineCollection` — against the real
// files, with an in-memory DataStore standing in for Astro's. `astro build`
// (part of `npm run check`) then syncs the real collections as a second gate.

const EXPECTED_ENTRIES: Record<CatalogCollectionName, number> = {
  recipes: 50,
  ingredients: 105,
  beverages: 39,
  categories: 4,
  prices: 51,
};

type StoredEntry = { id: string; data: Record<string, unknown>; filePath?: string };

function createLoaderContext(name: CatalogCollectionName, schema: z.ZodType) {
  const entries = new Map<string, StoredEntry>();
  const problems: string[] = [];
  const logger = {
    options: { dest: { write: () => true }, level: 'silent' },
    label: name,
    fork: () => logger,
    info: () => {},
    debug: () => {},
    warn: (msg: string) => problems.push(`warn: ${msg}`),
    error: (msg: string) => problems.push(`error: ${msg}`),
  };
  const store = {
    get: (key: string) => entries.get(key),
    entries: () => [...entries.entries()],
    set: (entry: StoredEntry) => {
      entries.set(entry.id, entry);
      return true;
    },
    values: () => [...entries.values()],
    keys: () => [...entries.keys()],
    delete: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
    has: (key: string) => entries.has(key),
    addModuleImport: () => {},
  };
  const meta = new Map<string, string>();
  const context = {
    collection: name,
    store,
    meta,
    logger,
    config: { root: pathToFileURL(`${root}/`) },
    // Mirrors Astro's content layer: validate against the collection schema.
    parseData: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const result = schema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `${name}/${id}: ${result.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')}`,
        );
      }
      return result.data as Record<string, unknown>;
    },
    renderMarkdown: async () => ({ html: '', metadata: {} }),
    generateDigest: (data: Record<string, unknown> | string) =>
      JSON.stringify(data).length.toString(),
  } as unknown as LoaderContext;
  return { context, entries, problems };
}

describe('content collections mirror public/data (src/content.config.ts)', () => {
  it('defines recipes, ingredients, beverages, categories and prices with the file() loader + Zod schemas', () => {
    const cfg = read('src/content.config.ts');
    expect(cfg).toMatch(/import \{ file, glob \} from 'astro\/loaders'/);
    expect(cfg).toContain("from './lib/catalog/collections'");
    for (const name of CATALOG_COLLECTION_NAMES) {
      expect(cfg).toMatch(new RegExp(`const ${name} = defineCollection\\(`));
      expect(cfg).toContain(`file(CATALOG_COLLECTIONS.${name}.file`);
      expect(cfg).toContain(`schema: toAstroSchema(CATALOG_COLLECTIONS.${name}.schema)`);
    }
    expect(cfg).toMatch(
      /export const collections = \{[^}]*\brecipes\b[^}]*\bingredients\b[^}]*\bbeverages\b[^}]*\bcategories\b[^}]*\bprices\b[^}]*\}/,
    );
  });

  it('every collection file path points at public/data', () => {
    for (const name of CATALOG_COLLECTION_NAMES) {
      const { file } = CATALOG_COLLECTIONS[name];
      expect(file).toMatch(/^\.\/public\/data\/[a-z-]+\.json$/);
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  for (const name of CATALOG_COLLECTION_NAMES) {
    it(`getCollection('${name}') yields ${EXPECTED_ENTRIES[name]} schema-valid entries keyed by record id`, async () => {
      const { file, parser, schema } = CATALOG_COLLECTIONS[name];
      const { context, entries, problems } = createLoaderContext(name, schema);
      await fileLoader(file, { parser }).load(context);
      expect(problems).toEqual([]);
      expect(entries.size).toBe(EXPECTED_ENTRIES[name]);
      for (const [key, entry] of entries) {
        expect(entry.id).toBe(key);
        expect(entry.data.id).toBe(key);
      }
    });
  }

  it("the categories collection has one entry per taxonomy, each with 'items'", async () => {
    const { file, parser, schema } = CATALOG_COLLECTIONS.categories;
    const { context, entries } = createLoaderContext('categories', schema);
    await fileLoader(file, { parser }).load(context);
    expect([...entries.keys()].sort()).toEqual([...CATEGORY_ENTRY_IDS].sort());
    const mealTypes = entries.get('mealTypes')?.data.items as Array<{ id: string }>;
    expect(mealTypes.map((m) => m.id)).toContain('breakfast');
  });

  it('an invalid record fails the loader (US-1.1: bad JSON breaks the build)', async () => {
    const { parser, schema } = CATALOG_COLLECTIONS.recipes;
    const { context } = createLoaderContext('recipes', schema);
    const broken = { recipes: [{ id: 'rec_bad', name: { en: 'Only English' } }] };
    // Feed the parser directly: same code path the loader runs after readFile.
    const rows = parser(JSON.stringify(broken));
    await expect(
      context.parseData({ id: 'rec_bad', data: rows[0] as Record<string, unknown> }),
    ).rejects.toThrow(/rec_bad/);
  });
});

describe('toAstroSchema (Zod 4 → Astro Zod 3 bridge)', () => {
  const bridged = toAstroSchema(CATALOG_COLLECTIONS.recipes.schema);
  const recipes = RecipesFileSchema.parse(loadJson('recipes.json')).recipes;

  it('accepts every real recipe and returns the Zod 4 output unchanged', () => {
    for (const recipe of recipes) {
      const result = bridged.safeParse(recipe);
      expect(result.success, recipe.id).toBe(true);
      if (result.success) expect(result.data).toEqual(recipe);
    }
  });

  it('forwards Zod 4 issues with their paths so astro build names the bad field', () => {
    const [first] = recipes;
    const broken = { ...first!, name: { en: 'Only English' }, rating: 9 };
    const result = bridged.safeParse(broken);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toEqual(expect.arrayContaining(['name.es', 'name.fr', 'rating']));
    }
  });
});

// ── Unique ids + duplicate names (port of scripts/checkDuplicates.js) ───────

describe('unique ids (scripts/check-duplicates.mjs)', () => {
  const recipes = RecipesFileSchema.parse(loadJson('recipes.json')).recipes;
  const ingredients = IngredientsFileSchema.parse(loadJson('ingredients.json')).ingredients;
  const beverages = BeveragesFileSchema.parse(loadJson('beverages.json'));
  const categories = CategoriesFileSchema.parse(loadJson('categories.json'));

  it('recipes have unique ids and unique English names', () => {
    expect(findDuplicateRecipes(recipes)).toEqual({ duplicateIds: [], duplicateNames: [] });
  });

  it('the duplicate finder actually detects duplicates', () => {
    const [first] = recipes;
    const report = findDuplicateRecipes([
      ...recipes,
      { id: first!.id, name: { en: ` ${first!.name.en.toUpperCase()} ` } },
    ]);
    expect(report.duplicateIds).toEqual([{ id: first!.id, indices: [0, recipes.length] }]);
    expect(report.duplicateNames).toHaveLength(1);
  });

  it('ingredients, beverages and each taxonomy have unique ids', () => {
    const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes(ingredients.map((i) => i.id))).toEqual([]);
    expect(dupes(beverages.map((b) => b.id))).toEqual([]);
    for (const group of CATEGORY_ENTRY_IDS) {
      expect(dupes(categories[group].map((c) => c.id)), group).toEqual([]);
    }
  });

  it('ids do not collide across catalogs (safe to mix in tracking entries)', () => {
    const all = [
      ...recipes.map((r) => r.id),
      ...ingredients.map((i) => i.id),
      ...beverages.map((b) => b.id),
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});

// ── Trilingual text everywhere (port of scripts/validateTranslations.js) ────

/**
 * Walk any JSON value; every object that carries at least one locale key is a
 * MultiLangText and must carry ALL locales as non-blank strings.
 */
function collectTranslationIssues(
  value: unknown,
  path: string,
  issues: string[],
  seen: { n: number },
) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectTranslationIssues(v, `${path}[${i}]`, issues, seen));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  const localeKeys = LOCALES.filter((l) => l in obj);
  if (localeKeys.length > 0) {
    seen.n++;
    for (const locale of LOCALES) {
      const text = obj[locale];
      if (typeof text !== 'string' || text.trim() === '') {
        issues.push(`${path}.${locale}: missing or empty translation`);
      }
    }
    return;
  }
  for (const [k, v] of Object.entries(obj))
    collectTranslationIssues(v, `${path}.${k}`, issues, seen);
}

describe('every MultiLangText has en, es and fr (validateTranslations.js semantics)', () => {
  for (const file of ['recipes.json', 'ingredients.json', 'beverages.json', 'categories.json']) {
    it(`${file}: no missing or blank translation`, () => {
      const issues: string[] = [];
      const seen = { n: 0 };
      collectTranslationIssues(loadJson(file), file, issues, seen);
      expect(seen.n).toBeGreaterThan(0);
      expect(issues).toEqual([]);
    });
  }

  it('recipes: name, description, instructions[].text and ingredients[].notes are trilingual', () => {
    const recipes = RecipesFileSchema.parse(loadJson('recipes.json')).recipes;
    for (const r of recipes) {
      for (const field of [r.name, r.description, ...r.instructions.map((s) => s.text)]) {
        for (const locale of LOCALES) expect(field[locale].trim(), r.id).not.toBe('');
      }
      for (const ing of r.ingredients) {
        if (ing.notes) for (const locale of LOCALES) expect(ing.notes[locale].trim()).not.toBe('');
      }
    }
  });
});

// ── Legacy cleanup (Issue 011) ───────────────────────────────────────────────

describe('legacy data-layer cleanup', () => {
  it('public/data/config.json is gone (AppContext hard-coded the same values)', () => {
    expect(existsSync(resolve(DATA_DIR, 'config.json'))).toBe(false);
    expect(readdirSync(DATA_DIR).sort()).toEqual([
      'beverages.json',
      'categories.json',
      'ingredient-prices.json',
      'ingredients.json',
      'recipes.json',
    ]);
  });

  it('legacy seed/validation scripts are archived under docs/archive/legacy-vite/scripts, not executable', () => {
    const dir = resolve(root, 'docs/archive/legacy-vite/scripts');
    const files = readdirSync(dir);
    for (const legacy of [
      'checkDuplicates.js',
      'validateJSON.js',
      'validateTranslations.js',
      'populate-data.mjs',
      'bulk-populate.mjs',
      'generate-recipes.mjs',
    ]) {
      expect(files, legacy).toContain(legacy);
      expect(statSync(resolve(dir, legacy)).mode & 0o111, `${legacy} must not be executable`).toBe(
        0,
      );
    }
    expect(files).toContain('README.md');
    expect(existsSync(resolve(root, 'scripts/checkDuplicates.js'))).toBe(false);
    expect(existsSync(resolve(root, 'scripts/check-duplicates.mjs'))).toBe(true);
  });

  it('docs/recipes/catalog-data.md explains JSON → PR → validate-recipe-pr.yml', () => {
    const doc = read('docs/recipes/catalog-data.md');
    expect(doc).toContain('public/data/recipes.json');
    expect(doc).toContain('validate-recipe-pr.yml');
    expect(doc).toContain('src/tests/catalog-schema.test.ts');
    expect(doc).toContain('check-duplicates.mjs');
    expect(read('docs/recipes/README.md')).toContain('catalog-data.md');
  });
});
