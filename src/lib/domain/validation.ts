/**
 * Recipe submission validation (roadmap Issue 014) — legacy
 * `services/validationService.ts` rewritten as a thin layer over
 * `RecipeSubmissionSchema.safeParse` / `RecipeSchema.safeParse`. The schema
 * owns every hard rule; this module only maps Zod issues to the
 * `{ field, message, severity }` shape the wizard renders and adds the soft
 * "please double-check" warnings that are not schema failures.
 */
import { z } from 'zod';
import {
  RecipeSchema,
  RecipeSubmissionSchema,
  type Recipe,
  type RecipeSubmission,
} from '@/schemas';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationError = {
  /** Dotted path with array indices, e.g. `ingredients[0].quantity`. */
  field: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

const warning = (field: string, message: string): ValidationError => ({
  field,
  message,
  severity: 'warning',
});

/** `['ingredients', 0, 'quantity']` → `ingredients[0].quantity`. */
export function issuePathToField(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((acc, seg) => {
    if (typeof seg === 'number') return `${acc}[${seg}]`;
    return acc ? `${acc}.${String(seg)}` : String(seg);
  }, '');
}

/** Legacy prefixed per-item messages ("Ingredient #2: Unit is required"). */
function describeIssue(issue: z.core.$ZodIssue): string {
  const [head, index] = issue.path;
  if (typeof index === 'number') {
    if (head === 'ingredients') return `Ingredient #${index + 1}: ${issue.message}`;
    if (head === 'instructions') return `Step #${index + 1}: ${issue.message}`;
  }
  return issue.message;
}

/** Map Zod issues to the wizard's error shape. */
export function issuesToErrors(issues: ReadonlyArray<z.core.$ZodIssue>): ValidationError[] {
  return issues.map((issue) => ({
    field: issuePathToField(issue.path),
    message: describeIssue(issue),
    severity: 'error',
  }));
}

/** Soft checks on a submission — never block, only ask the contributor to verify. */
export function getRecipeSubmissionWarnings(data: Partial<RecipeSubmission>): ValidationError[] {
  const warnings: ValidationError[] = [];
  if (data.nameEn && data.nameEn.length > 100) {
    warnings.push(warning('nameEn', 'Recipe name is quite long. Consider shortening it.'));
  }
  const totalTime = (data.prepTime ?? 0) + (data.cookTime ?? 0) + (data.restTime ?? 0);
  if (totalTime > 720) {
    warnings.push(warning('timings', 'Total time exceeds 12 hours. Is this correct?'));
  }
  if (data.calories && data.calories > 2000) {
    warnings.push(warning('calories', 'Calories per serving seems high. Please verify.'));
  }
  if (data.protein && data.protein > 100) {
    warnings.push(warning('protein', 'Protein per serving seems high. Please verify.'));
  }
  if (data.sodium && data.sodium > 2300) {
    warnings.push(warning('sodium', 'Sodium per serving exceeds daily recommended limit.'));
  }
  return warnings;
}

/** Validate the contribution form (`RecipeSubmissionSchema.safeParse` + warnings). */
export function validateRecipeFormData(formData: unknown): ValidationResult {
  const parsed = RecipeSubmissionSchema.safeParse(formData);
  const errors = parsed.success ? [] : issuesToErrors(parsed.error.issues);
  const source = (parsed.success ? parsed.data : formData) as Partial<RecipeSubmission>;
  const warnings = source && typeof source === 'object' ? getRecipeSubmissionWarnings(source) : [];
  return { valid: errors.length === 0, errors, warnings };
}

/** Soft checks on a finished `Recipe`. */
export function getRecipeWarnings(recipe: Recipe): ValidationError[] {
  const warnings: ValidationError[] = [];
  if (recipe.prepTime > 1440 || recipe.cookTime > 1440) {
    warnings.push(warning('timings', 'Prep or cook time exceeds 24 hours'));
  }
  if (recipe.servings < 1 || recipe.servings > 100) {
    warnings.push(warning('servings', 'Servings seems unusual'));
  }
  return warnings;
}

/** Validate a transformed recipe against the catalog schema (`RecipeSchema.safeParse` + warnings). */
export function validateRecipe(recipe: unknown): ValidationResult {
  const parsed = RecipeSchema.safeParse(recipe);
  if (!parsed.success) {
    return { valid: false, errors: issuesToErrors(parsed.error.issues), warnings: [] };
  }
  return { valid: true, errors: [], warnings: getRecipeWarnings(parsed.data) };
}

/** True when `recipeId` is not already taken (legacy returned a Promise; pure now). */
export function validateUniqueRecipeId(
  recipeId: string,
  existingRecipeIds: ReadonlyArray<string>,
): boolean {
  return !existingRecipeIds.includes(recipeId);
}

/** Localised wording for `getValidationSummary` (the wizard passes `t()`-backed strings). */
export type ValidationSummaryWording = {
  allPassed: string;
  errors: (count: number) => string;
  warnings: (count: number) => string;
  separator?: string;
};

const ENGLISH_SUMMARY: ValidationSummaryWording = {
  allPassed: 'All checks passed',
  errors: (count) => `${count} error(s)`,
  warnings: (count) => `${count} warning(s)`,
};

/** "All checks passed" | "2 error(s), 1 warning(s)" — or the same in `wording`'s language. */
export function getValidationSummary(
  result: ValidationResult,
  wording: ValidationSummaryWording = ENGLISH_SUMMARY,
): string {
  if (result.valid && result.warnings.length === 0) return wording.allPassed;
  const parts: string[] = [];
  if (result.errors.length > 0) parts.push(wording.errors(result.errors.length));
  if (result.warnings.length > 0) parts.push(wording.warnings(result.warnings.length));
  return parts.join(wording.separator ?? ', ');
}
