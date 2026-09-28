// @vitest-environment jsdom
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import {
  clickNext,
  installCatalogFetch,
  onStep,
  pick,
  renderWizard,
  seedDraft,
  validSubmission,
} from '@/tests/fixtures/contribute-wizard';
import { ContributeWizardView } from './ContributeWizard';

/**
 * The contribute wizard end to end in jsdom (roadmap Issue 038): an empty
 * form walked through every step up to the preview, the draft surviving a
 * remount (reload), "Start over", and the SSR placeholder.
 */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe('ContributeWizard', () => {
  // A long user-event walk through six steps (~2 s alone); headroom for a loaded CI box.
  it('walks from an empty form to the preview of the public page', { timeout: 15_000 }, async () => {
    const { user } = renderWizard('en');
    await onStep('basic');
    expect(screen.getByTestId('contribute-stepper').querySelector('[aria-current="step"]')).toHaveTextContent('Basic Info');
    expect(screen.queryByTestId('contribute-draft-restored')).toBeNull();

    // 1 · basic
    await user.type(screen.getByTestId('contribute-name-en'), 'Weeknight Green Skillet');
    await user.type(screen.getByTestId('contribute-description-en'), 'Chicken and spinach in one pan, on the table in 30 minutes.');
    await pick(user, screen.getByTestId('contribute-cuisine'), 'American');
    await clickNext(user);
    await onStep('timings');

    // 2 · timings
    await user.type(screen.getByTestId('contribute-prep-time'), '10');
    await user.type(screen.getByTestId('contribute-cook-time'), '20');
    await user.clear(screen.getByTestId('contribute-servings'));
    await user.type(screen.getByTestId('contribute-servings'), '2');
    await clickNext(user);
    await onStep('ingredients');

    // 3 · ingredients
    await waitFor(() => expect(screen.getByTestId('contribute-step-ingredients')).toHaveAttribute('data-catalog', 'success'));
    await user.click(screen.getByTestId('contribute-add-ingredient'));
    const row = screen.getByTestId('contribute-ingredient-row');
    await user.type(within(row).getByTestId('contribute-ingredient-picker'), 'Chick');
    await user.click(await screen.findByRole('option', { name: 'Chicken Breast' }));
    await user.clear(within(row).getByTestId('contribute-ingredient-quantity'));
    await user.type(within(row).getByTestId('contribute-ingredient-quantity'), '300');
    await pick(user, within(row).getByTestId('contribute-ingredient-unit'), 'g');
    await clickNext(user);
    await onStep('instructions');

    // 4 · instructions
    await user.click(screen.getByTestId('contribute-add-step'));
    await user.type(screen.getByRole('textbox', { name: 'Step 1' }), 'Sear the chicken in a hot skillet.');
    await clickNext(user);
    await onStep('nutrition');

    // 5 · nutrition (estimate)
    await user.click(screen.getByTestId('contribute-estimate-nutrition'));
    expect(screen.getByTestId('contribute-nutrition-calories')).toHaveValue(225);
    await clickNext(user);
    await onStep('preview');

    // 6 · preview
    expect(screen.getByTestId('contribute-step-counter')).toHaveTextContent('Step 6 of 7');
    expect(screen.getByTestId('contribute-validation-summary')).toHaveTextContent('All validation checks passed!');
    const detail = screen.getByTestId('contribute-preview-detail');
    expect(within(detail).getByRole('heading', { level: 2, name: 'Weeknight Green Skillet' })).toBeInTheDocument();
    expect(within(detail).getByTestId('recipe-meta')).toHaveTextContent('American');
    expect(within(detail).getByTestId('ingredients-list')).toHaveTextContent('Chicken Breast');
    expect($contributeDraft.get()).toMatchObject({ step: 5, data: { nameEn: 'Weeknight Green Skillet', servings: 2, calories: 225 } });
  });

  it('restores the draft after a reload, on the step it was left', async () => {
    seedDraft('instructions');
    const first = renderWizard('en');
    await onStep('instructions');
    await first.user.type(screen.getAllByTestId('contribute-instruction')[0]!, ' Extra.');
    first.unmount();

    renderWizard('en');
    await onStep('instructions');
    expect(screen.getByTestId('contribute-draft-restored')).toHaveTextContent('We restored the draft you were working on.');
    expect(screen.getAllByTestId('contribute-instruction')[0]).toHaveValue('Sear the chicken in a skillet until golden. Extra.');
  });

  it('resumes on the first step that no longer validates', async () => {
    seedDraft('preview', validSubmission({ cookTime: 0 }));
    renderWizard('en');
    await onStep('timings');
  });

  it('"Start over" asks first, then clears the draft and the form', async () => {
    seedDraft('timings');
    const { user } = renderWizard('en');
    await onStep('timings');
    await user.click(screen.getByTestId('contribute-start-over'));
    const dialog = await screen.findByTestId('contribute-start-over-dialog');
    expect(dialog).toHaveTextContent('Discard this draft and start a new recipe?');
    await user.click(within(dialog).getByTestId('confirm-start-over'));
    await onStep('basic');
    expect(screen.getByTestId('contribute-name-en')).toHaveValue('');
    expect(localStorage.getItem('foodie:contribute-draft')).toBeNull();
    expect(screen.queryByTestId('contribute-draft-restored')).toBeNull();
  });

  it('offers "Start over" as soon as a fresh draft exists, even on the first step', async () => {
    const { user } = renderWizard('en');
    await onStep('basic');
    expect(screen.queryByTestId('contribute-start-over')).toBeNull();
    await user.type(screen.getByTestId('contribute-name-en'), 'Soup');
    await waitFor(() => expect(localStorage.getItem('foodie:contribute-draft')).not.toBeNull());
    await user.click(screen.getByTestId('contribute-start-over'));
    const dialog = await screen.findByTestId('contribute-start-over-dialog');
    await user.click(within(dialog).getByTestId('confirm-start-over'));
    await onStep('basic');
    expect(screen.getByTestId('contribute-name-en')).toHaveValue('');
    expect(localStorage.getItem('foodie:contribute-draft')).toBeNull();
    expect(screen.queryByTestId('contribute-start-over')).toBeNull();
  });

  it('renders a loading placeholder on the server (no localStorage there)', () => {
    const client = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={client}>
        <ContributeWizardView lang="fr" />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).toContain('Chargement de l’assistant de recette…');
  });
});
