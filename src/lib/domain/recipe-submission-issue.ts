/**
 * Recipe submission without secrets (roadmap Issue 039, decision D10).
 *
 * The contribute wizard's last step downloads `recipe-<id>.json` and opens a
 * GitHub "new issue" form (`.github/ISSUE_TEMPLATE/recipe-submission.yml`)
 * prefilled through `lib/report-issue.ts`. The contributor signs in on
 * github.com (never in Foodie), reviews and files the issue; a maintainer
 * adds the recipe to `public/data/recipes.json` in a PR checked by
 * `validate-recipe-pr.yml`. No token, no Octokit, nothing stored on device.
 *
 * GitHub request lines are capped, so the URL must stay under
 * `ISSUE_URL_MAX_LENGTH` (8 KB): when the JSON does not fit, the
 * `recipe-json` field instead asks the contributor to attach the downloaded
 * file. Everything written into the issue is English (maintainer-facing).
 */
import type { RecipeSubmission, RecipeSubmissionPayload } from '@/schemas';
import { buildIssueUrl, issueUrlFits } from '@/lib/report-issue';

/** The issue form the URL opens (`.github/ISSUE_TEMPLATE/<file>`). */
export const RECIPE_SUBMISSION_TEMPLATE = 'recipe-submission.yml';

/** Field ids of `recipe-submission.yml` (a unit test keeps them in sync with the YAML). */
export const RECIPE_SUBMISSION_FIELDS = {
  name: 'recipe-name',
  mealType: 'meal-type',
  cuisine: 'cuisine',
  json: 'recipe-json',
  notes: 'notes',
} as const;

export type RecipeSubmissionIssue = {
  /** The prefilled `issues/new?template=recipe-submission.yml&…` URL (≤ 8 KB). */
  url: string;
  /** `recipe-<id>.json`, the file the wizard downloads. */
  filename: string;
  /** False when the JSON was too long for the URL and must be attached by hand. */
  jsonInUrl: boolean;
};

export function recipeSubmissionFilename(recipeId: string): string {
  return `recipe-${recipeId}.json`;
}

function translations(submission: RecipeSubmission): string {
  const has = (value: string | undefined) => (value && value.trim() ? 'yes' : 'missing — please add');
  return [
    `- Spanish name / description: ${has(submission.nameEs)} / ${has(submission.descriptionEs)}`,
    `- French name / description: ${has(submission.nameFr)} / ${has(submission.descriptionFr)}`,
  ].join('\n');
}

/** The "Notes for the reviewer" summary: what the recipe is and what is missing. */
export function buildSubmissionSummary(payload: RecipeSubmissionPayload, jsonInUrl: boolean): string {
  const { recipe, submission } = payload;
  const filename = recipeSubmissionFilename(payload.recipeId);
  return [
    'Submitted from the Foodie contribute wizard (roadmap #039).',
    '',
    `- Id: \`${recipe.id}\``,
    `- Servings: ${recipe.servings} · prep ${recipe.prepTime} min · cook ${recipe.cookTime} min · ${recipe.difficulty}`,
    `- Ingredients: ${recipe.ingredients.length} · steps: ${recipe.instructions.length}`,
    translations(submission),
    jsonInUrl
      ? `- The wizard also downloaded \`${filename}\` (same JSON as above).`
      : `- The JSON was too long for a prefilled link: \`${filename}\` must be attached to the Recipe JSON field.`,
  ].join('\n');
}

function attachNote(filename: string): string {
  return `The recipe JSON is too long for a prefilled link. Drag the file \`${filename}\` that the wizard downloaded into this field (or paste its contents) before submitting.`;
}

export function buildRecipeSubmissionIssue(payload: RecipeSubmissionPayload): RecipeSubmissionIssue {
  const { recipe } = payload;
  const filename = recipeSubmissionFilename(payload.recipeId);
  const build = (json: string, jsonInUrl: boolean) =>
    buildIssueUrl({
      template: RECIPE_SUBMISSION_TEMPLATE,
      title: `[recipe] ${recipe.name.en}`,
      fields: {
        [RECIPE_SUBMISSION_FIELDS.name]: recipe.name.en,
        [RECIPE_SUBMISSION_FIELDS.mealType]: recipe.type,
        [RECIPE_SUBMISSION_FIELDS.cuisine]: recipe.cuisine.join(', '),
        [RECIPE_SUBMISSION_FIELDS.json]: json,
        [RECIPE_SUBMISSION_FIELDS.notes]: buildSubmissionSummary(payload, jsonInUrl),
      },
    });

  const full = build(payload.recipeJson, true);
  if (issueUrlFits(full)) return { url: full, filename, jsonInUrl: true };
  return { url: build(attachNote(filename), false), filename, jsonInUrl: false };
}
