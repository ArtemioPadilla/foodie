/** Type declarations for check-duplicates.mjs — consumed by tsc and astro check. */
export type DuplicateReport = {
  duplicateIds: Array<{ id: string; indices: number[] }>;
  duplicateNames: Array<{ name: string; indices: number[] }>;
};
export function normalizeName(name: unknown): string;
export function findDuplicateRecipes(
  recipes: ReadonlyArray<{ id?: string; name?: { en?: string } }>,
): DuplicateReport;
export function extractRecipes(json: unknown): Array<Record<string, unknown>>;
export function checkDuplicates(
  file?: string,
): Promise<{ count: number; ok: boolean; lines: string[] }>;
