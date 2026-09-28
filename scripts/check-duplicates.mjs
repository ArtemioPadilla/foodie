#!/usr/bin/env node
/**
 * scripts/check-duplicates.mjs — port of the legacy `checkDuplicates.js`.
 *
 * Reports recipes in `public/data/recipes.json` that share an `id` or an
 * English name (case- and whitespace-insensitive). The same logic runs inside
 * `src/tests/catalog-schema.test.ts` (and therefore in `validate-recipe-pr.yml`
 * and `npm run check`); the CLI is kept for quick local use:
 *
 *   node scripts/check-duplicates.mjs            # ./public/data/recipes.json
 *   node scripts/check-duplicates.mjs path.json  # any { recipes: [] } or [] file
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const DEFAULT_RECIPES_FILE = './public/data/recipes.json';

/** Lower-cased, trimmed English name used as the duplicate key. */
export function normalizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim();
}

/**
 * @param {Array<{ id?: string, name?: { en?: string } }>} recipes
 * @returns {{ duplicateIds: Array<{ id: string, indices: number[] }>,
 *             duplicateNames: Array<{ name: string, indices: number[] }> }}
 */
export function findDuplicateRecipes(recipes) {
  const byId = new Map();
  const byName = new Map();
  recipes.forEach((recipe, index) => {
    const id = String(recipe?.id ?? '');
    byId.set(id, [...(byId.get(id) ?? []), index]);
    const name = normalizeName(recipe?.name?.en);
    byName.set(name, [...(byName.get(name) ?? []), index]);
  });
  const duplicateIds = [...byId]
    .filter(([, indices]) => indices.length > 1)
    .map(([id, indices]) => ({ id, indices }));
  const duplicateNames = [...byName]
    .filter(([, indices]) => indices.length > 1)
    .map(([name, indices]) => ({ name: recipes[indices[0]]?.name?.en ?? name, indices }));
  return { duplicateIds, duplicateNames };
}

/** Accepts both `{ recipes: [] }` and a bare array. */
export function extractRecipes(json) {
  return Array.isArray(json) ? json : (json?.recipes ?? []);
}

export async function checkDuplicates(file = DEFAULT_RECIPES_FILE) {
  const recipes = extractRecipes(JSON.parse(await readFile(file, 'utf8')));
  const { duplicateIds, duplicateNames } = findDuplicateRecipes(recipes);
  const lines = [];
  for (const { id, indices } of duplicateIds) {
    lines.push(`Duplicate recipe id "${id}" at indices ${indices.join(', ')}`);
  }
  for (const { name, indices } of duplicateNames) {
    lines.push(`Duplicate recipe name "${name}" at indices ${indices.join(', ')}`);
  }
  return { count: recipes.length, ok: lines.length === 0, lines };
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const file = process.argv[2] ?? DEFAULT_RECIPES_FILE;
  checkDuplicates(file)
    .then(({ count, ok, lines }) => {
      if (ok) {
        console.log(`No duplicates found. Checked ${count} recipes in ${file}.`);
        return 0;
      }
      for (const line of lines) console.error(line);
      return 1;
    })
    .catch((error) => {
      console.error(`Error checking duplicates: ${error.message}`);
      return 1;
    })
    .then((code) => process.exit(code));
}
