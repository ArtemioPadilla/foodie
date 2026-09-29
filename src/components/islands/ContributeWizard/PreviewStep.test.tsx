// @vitest-environment jsdom
import * as React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import {
  NOW,
  clickNext,
  installCatalogFetch,
  onStep,
  renderWizard,
  seedDraft,
  validSubmission,
} from '@/tests/fixtures/contribute-wizard';
import type { SubmitStepProps } from './SubmitStep';

/** Steps 6–7 — preview (public card + detail components) and the submit hook point (roadmap Issues 038–039). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

const RECIPE_ID = `green-chicken-skillet-${NOW.getTime().toString(36)}`;

describe('ContributeWizard · preview step', () => {
  it('shows the validation summary, the recipe card and the public detail components', async () => {
    seedDraft('preview', validSubmission({ equipment: ['Dutch oven'] }));
    renderWizard('en');
    await onStep('preview');
    expect(screen.getByTestId('contribute-validation-summary')).toHaveTextContent('All validation checks passed!');
    expect(screen.getByTestId('contribute-validation')).toHaveAttribute('data-valid', 'true');

    const card = await screen.findByTestId('contribute-preview-card');
    expect(within(card).getByRole('heading', { name: 'Green Chicken Skillet' })).toBeInTheDocument();

    const detail = screen.getByTestId('contribute-preview-detail');
    const title = within(detail).getByRole('heading', { level: 2, name: 'Green Chicken Skillet' });
    expect(title.style.viewTransitionName).toBe('');
    // Same components as /recipes/[id]/: header meta grid, the actions island body, extras.
    const meta = within(detail).getByTestId('recipe-meta');
    expect(meta).toHaveTextContent('Mexican');
    expect(meta).toHaveTextContent('30 min');
    await waitFor(() =>
      expect(within(detail).getAllByTestId('ingredient-link').map((a) => a.textContent)).toEqual(['Chicken Breast', 'Spinach']),
    );
    expect(within(detail).getByTestId('ingredients-list')).toHaveTextContent('(washed)');
    expect(within(detail).getByTestId('instructions-list')).toHaveTextContent('Sear the chicken in a skillet until golden.');
    expect(within(detail).getByTestId('recipe-equipment')).toHaveTextContent(/Dutch oven.*skillet.*pan/);
    expect(within(detail).getByRole('table')).toHaveTextContent('320');
    // The recipe is not in the catalog yet: no favourite / plan / shopping actions.
    expect(within(detail).queryByTestId('favorite-button')).toBeNull();
    expect(within(detail).queryByTestId('add-to-plan-button')).toBeNull();
    expect(screen.getByTestId('contribute-preview-notice')).toBeInTheDocument();
  });

  it('lists warnings with an Edit link back to the step that owns the field', async () => {
    seedDraft('preview', validSubmission({ calories: 2500, imageUrl: 'https://example.com/pic.jpg' }));
    const { user } = renderWizard('en');
    await onStep('preview');
    expect(screen.getByTestId('contribute-validation-summary')).toHaveTextContent('1 Warning(s)');
    expect(screen.getByTestId('contribute-preview-notice')).toHaveTextContent('https://example.com/pic.jpg');
    const warning = screen.getByText('Calories per serving seems high. Please verify.').closest('li')!;
    await user.click(within(warning).getByRole('button', { name: 'Edit Nutrition' }));
    await onStep('nutrition');
    expect(screen.getByTestId('contribute-nutrition-calories')).toHaveValue(2500);
  });

  it('Next hands the validated payload to the submit step (Issue 039 hook point)', async () => {
    seedDraft('preview');
    const { user } = renderWizard('en');
    await onStep('preview');
    await clickNext(user);
    await onStep('submit');
    expect(screen.getByTestId('contribute-step-submit')).toHaveAttribute('data-recipe-id', RECIPE_ID);
    const json = JSON.parse(screen.getByTestId('contribute-recipe-json').textContent ?? '{}');
    expect(json).toMatchObject({ id: RECIPE_ID, cuisine: ['mexican'], servings: 2, author: 'Community Contributor' });
    expect(json.ingredients[1]).toEqual({ ingredientId: 'ing_002', quantity: 1, unit: 'cup', preparation: 'washed', optional: true });
    // The default build names no repository (ADR 0015): the submit step
    // offers the download instead of a Submit button.
    expect(screen.getByTestId('contribute-step-submit')).toHaveAttribute('data-submit-mode', 'download');
    expect(screen.getByTestId('contribute-download-json')).toBeEnabled();
    expect(screen.queryByTestId('contribute-next')).toBeNull();
  });

  it('an injected sending step receives the payload and clears the draft through onSubmitted', async () => {
    const received: SubmitStepProps['payload'][] = [];
    function FakeSend({ payload, onSubmitted }: SubmitStepProps) {
      received.push(payload);
      return (
        <button type="button" onClick={onSubmitted}>
          send
        </button>
      );
    }
    seedDraft('submit');
    const { user } = renderWizard('en', { SubmitStepComponent: FakeSend });
    await onStep('submit');
    expect(received.at(-1)).toMatchObject({ recipeId: RECIPE_ID, submission: { nameEn: 'Green Chicken Skillet' } });
    await user.click(screen.getByRole('button', { name: 'send' }));
    expect($contributeDraft.get()).toBeUndefined();
    expect(localStorage.getItem('foodie:contribute-draft')).toBeNull();
  });
});
