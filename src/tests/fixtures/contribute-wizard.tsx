/**
 * Shared set-up of the contribute wizard's jsdom tests (roadmap Issue 038):
 * a fake catalog behind `fetch`, a fresh QueryClient per render and helpers
 * to seed `foodie:contribute-draft` at a given step.
 */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { ContributeWizardView, type ContributeWizardViewProps } from '@/components/islands/ContributeWizard';
import type { Locale } from '@/i18n';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, CONTRIBUTE_STEPS, type ContributeStep, type RecipeSubmission } from '@/schemas';
import { saveContributeDraft } from '@/stores/contribute-draft';
import { makeIngredient, makeRecipe, makeRecipeSubmission, mockBeverages, mockIngredientCategories } from './foodie-domain';

export const chicken = makeIngredient(); // ing_001 · protein
export const spinach = makeIngredient({
  id: 'ing_002',
  name: { en: 'Spinach', es: 'Espinaca', fr: 'Épinard' },
  category: 'vegetables',
  tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
});

export const categories = CategoriesFileSchema.parse({
  mealTypes: [
    { id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } },
    { id: 'dinner', name: { en: 'Dinner', es: 'Cena', fr: 'Dîner' } },
  ],
  cuisines: [
    { id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } },
    { id: 'mexican', name: { en: 'Mexican', es: 'Mexicana', fr: 'Mexicaine' } },
  ],
  dietaryTags: [{ id: 'vegan', name: { en: 'Vegan', es: 'Vegano', fr: 'Végétalien' } }],
  ingredientCategories: mockIngredientCategories,
});

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [makeRecipe()] },
  [CATALOG_FILES.ingredients]: { ingredients: [chicken, spinach] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: categories,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Server Error', json: async () => body } as unknown as Response;
}

/** Serve the fake catalog; `failing` paths answer 500. */
export function installCatalogFetch(failing: ReadonlyArray<string> = []) {
  const impl = vi.fn(async (input: string | URL | Request) => {
    const path = String(input).replace(withBase('/'), '/');
    if (failing.includes(path) || !(path in payloads)) return jsonResponse({}, false);
    return jsonResponse(payloads[path]);
  });
  vi.stubGlobal('fetch', impl);
  return impl;
}

export const NOW = new Date('2026-09-28T12:00:00Z');

export function renderWizard(lang: Locale = 'en', props: Partial<ContributeWizardViewProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={client}>
      <ContributeWizardView lang={lang} now={NOW} {...props} />
    </QueryClientProvider>,
  );
  return { user, ...utils };
}

/**
 * A submission that validates, with catalog ingredients (chicken + optional
 * spinach). `overrides` are applied after validation, so they may break it.
 */
export function validSubmission(overrides: Partial<RecipeSubmission> = {}): RecipeSubmission {
  return { ...VALID, ...overrides };
}

const VALID: RecipeSubmission = makeRecipeSubmission({
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
    ingredients: [
      { ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false },
      { ingredientId: 'ing_002', quantity: 1, unit: 'cup', preparation: 'washed', optional: true },
    ],
    instructions: ['Sear the chicken in a skillet until golden.', 'Wilt the spinach in the same pan and serve.'],
    calories: 320,
    protein: 40,
    carbohydrates: 4,
    fat: 12,
});

/** Seed `foodie:contribute-draft` so the wizard opens on `step`. */
export function seedDraft(step: ContributeStep, data: Partial<RecipeSubmission> = validSubmission()) {
  saveContributeDraft(CONTRIBUTE_STEPS.indexOf(step), data);
}

export async function onStep(step: ContributeStep) {
  await waitFor(() => expect(screen.getByTestId('contribute-wizard')).toHaveAttribute('data-step', step));
}

export async function clickNext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('contribute-next'));
}

/** Pick `option` from a kit `Select` trigger. */
export async function pick(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, option: string) {
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name: option }));
}

export function stepErrors(): string[] {
  const panel = screen.queryByTestId('contribute-step-errors');
  return panel ? within(panel).getAllByRole('listitem').map((li) => li.textContent ?? '') : [];
}
