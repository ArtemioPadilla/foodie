// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateSubmissionNutrition } from '@/lib/domain/contribute';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import {
  chicken,
  clickNext,
  installCatalogFetch,
  onStep,
  renderWizard,
  seedDraft,
  spinach,
  stepErrors,
  validSubmission,
} from '@/tests/fixtures/contribute-wizard';

/** Step 5 — optional nutrition with the automatic estimate (roadmap Issue 038). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

const empty = {
  calories: undefined,
  protein: undefined,
  carbohydrates: undefined,
  fat: undefined,
  fiber: undefined,
  sodium: undefined,
  sugar: undefined,
};

describe('ContributeWizard · nutrition step', () => {
  it('is optional: an empty step advances', async () => {
    seedDraft('nutrition', validSubmission(empty));
    const { user } = renderWizard('en');
    await onStep('nutrition');
    await clickNext(user);
    await onStep('preview');
  });

  it('fills every field from the ingredients, per serving, and the values stay editable', async () => {
    const submission = validSubmission(empty);
    seedDraft('nutrition', submission);
    const { user } = renderWizard('en');
    await onStep('nutrition');
    const button = screen.getByTestId('contribute-estimate-nutrition');
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText(/divided by 2 servings/)).toBeInTheDocument();
    await user.click(button);
    const expected = estimateSubmissionNutrition(submission.ingredients, [chicken, spinach], submission.servings)!;
    expect(screen.getByTestId('contribute-nutrition-calories')).toHaveValue(expected.calories);
    expect(screen.getByTestId('contribute-nutrition-protein')).toHaveValue(expected.protein);
    expect(screen.getByTestId('contribute-nutrition-estimated')).toBeInTheDocument();

    await user.clear(screen.getByTestId('contribute-nutrition-calories'));
    await user.type(screen.getByTestId('contribute-nutrition-calories'), '410');
    await waitFor(() => expect($contributeDraft.get()?.data).toMatchObject({ ...expected, calories: 410 }));
  });

  it('rejects negative values in the locale', async () => {
    seedDraft('nutrition', validSubmission({ ...empty, fat: -3 }));
    const { user } = renderWizard('es');
    await onStep('nutrition');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual(['El valor no puede ser negativo']));
    await onStep('nutrition');
  });

  it('cannot estimate without catalog ingredients', async () => {
    seedDraft('nutrition', validSubmission({ ...empty, ingredients: [{ ingredientId: 'custom', quantity: 1, unit: 'cup', optional: false }] }));
    renderWizard('en');
    await onStep('nutrition');
    expect(screen.getByTestId('contribute-estimate-nutrition')).toBeDisabled();
  });
});
