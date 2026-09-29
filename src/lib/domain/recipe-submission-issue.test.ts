import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ISSUE_URL_MAX_LENGTH } from '@/lib/report-issue';
import { makeIngredient, makeRecipeSubmission } from '@/tests/fixtures/foodie-domain';
import { buildSubmissionPayload } from './contribute';
import {
  RECIPE_SUBMISSION_FIELDS,
  RECIPE_SUBMISSION_TEMPLATE,
  buildRecipeSubmissionIssue,
  recipeSubmissionFilename,
} from './recipe-submission-issue';

const NOW = new Date('2026-09-28T12:00:00Z');
const ingredients = [makeIngredient()];

function payload(overrides: Parameters<typeof makeRecipeSubmission>[0] = {}) {
  const submission = makeRecipeSubmission({
    nameEn: 'Green Chicken Skillet',
    nameEs: 'Sartén de pollo verde',
    nameFr: '',
    descriptionEn: 'Seared chicken with wilted spinach, ready in half an hour.',
    cuisine: 'mexican',
    difficulty: 'easy',
    mealType: 'dinner',
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    ingredients: [{ ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false }],
    instructions: ['Sear the chicken in a skillet until golden.'],
    ...overrides,
  });
  return buildSubmissionPayload(submission, { ingredients }, NOW);
}

describe('recipe-submission.yml wiring', () => {
  it('prefills only field ids that exist in the issue form', () => {
    const yml = readFileSync(resolve(process.cwd(), `.github/ISSUE_TEMPLATE/${RECIPE_SUBMISSION_TEMPLATE}`), 'utf-8');
    const ids = [...yml.matchAll(/^\s+id:\s*([\w-]+)\s*$/gm)].map((match) => match[1]);
    for (const id of Object.values(RECIPE_SUBMISSION_FIELDS)) expect(ids).toContain(id);
  });
});

// Repo links are opt-in (ADR 0015): a neutral placeholder repo stands in for
// PUBLIC_REPO_SLUG, which the unit run leaves unset.
const REPO = 'example-org/foodie';

describe('buildRecipeSubmissionIssue', () => {
  it('without a configured repository: no URL, only the file to download', () => {
    const data = payload();
    expect(buildRecipeSubmissionIssue(data)).toEqual({ url: null, filename: `recipe-${data.recipeId}.json`, jsonInUrl: false });
    expect(buildRecipeSubmissionIssue(data, null).url).toBeNull();
  });

  it('opens the recipe-submission form on the configured repo with every field prefilled', () => {
    const data = payload();
    const issue = buildRecipeSubmissionIssue(data, REPO);
    expect(issue.url).toMatch(/^https:\/\/github\.com\/example-org\/foodie\/issues\/new\?template=recipe-submission\.yml&/);
    expect(issue.jsonInUrl).toBe(true);
    expect(issue.filename).toBe(`recipe-${data.recipeId}.json`);
    const params = new URL(issue.url!).searchParams;
    expect(params.get('title')).toBe('[recipe] Green Chicken Skillet');
    expect(params.get('recipe-name')).toBe('Green Chicken Skillet');
    expect(params.get('meal-type')).toBe('dinner');
    expect(params.get('cuisine')).toBe('mexican');
    expect(JSON.parse(params.get('recipe-json') ?? '')).toEqual(data.recipe);
    const notes = params.get('notes') ?? '';
    expect(notes).toContain(data.recipeId);
    expect(notes).toMatch(/French name \/ description: missing/);
    expect(notes).toContain(issue.filename);
    // No token, no labels in the URL: the form adds its own labels.
    expect(params.has('labels')).toBe(false);
  });

  it('asks to attach the downloaded file when the JSON would push the URL over 8 KB', () => {
    const long = 'Stir slowly and keep tasting as you go, adjusting salt and acidity. '.repeat(20);
    const data = payload({ instructions: Array.from({ length: 12 }, () => long) });
    expect(encodeURIComponent(data.recipeJson).length).toBeGreaterThan(ISSUE_URL_MAX_LENGTH);
    const issue = buildRecipeSubmissionIssue(data, REPO);
    expect(issue.jsonInUrl).toBe(false);
    expect(issue.url!.length).toBeLessThanOrEqual(ISSUE_URL_MAX_LENGTH);
    const params = new URL(issue.url!).searchParams;
    expect(params.get('recipe-json')).toContain(recipeSubmissionFilename(data.recipeId));
    expect(params.get('notes')).toMatch(/must be attached/);
  });
});

describe('no GitHub secrets (D10)', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf-8');

  it('.env.example declares no GitHub variable and package.json no Octokit', () => {
    const vars = read('.env.example')
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => line.slice(0, line.indexOf('=')));
    expect(vars.filter((name) => /GITHUB|OAUTH|CLIENT_SECRET/.test(name))).toEqual([]);
    expect(read('package.json')).not.toMatch(/octokit/i);
  });
});
