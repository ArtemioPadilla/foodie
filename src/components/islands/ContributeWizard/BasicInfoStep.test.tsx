// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/i18n';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import { clickNext, installCatalogFetch, onStep, pick, renderWizard, stepErrors } from '@/tests/fixtures/contribute-wizard';

/** Step 1 — basic info (roadmap Issue 038). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe('ContributeWizard · basic info step', () => {
  it('refuses to advance with errors, lists them translated and marks the fields', async () => {
    const { user } = renderWizard('es');
    await onStep('basic');
    expect(screen.getByTestId('contribute-step-counter')).toHaveTextContent('Paso 1 de 7');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual([
      t('es', 'contribute.nameRequired'),
      t('es', 'contribute.descriptionTooShort'),
      t('es', 'contribute.cuisineRequired'),
    ]));
    await onStep('basic');
    expect(screen.getByTestId('contribute-name-en')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('contribute-name-en')).toHaveFocus();
    expect(screen.getAllByText(t('es', 'contribute.cuisineRequired')).length).toBeGreaterThanOrEqual(2);
  });

  it('advances once name, description and cuisine are valid, and saves the draft', async () => {
    const { user } = renderWizard('en');
    await onStep('basic');
    await user.type(screen.getByTestId('contribute-name-en'), 'Green Chicken Skillet');
    await user.type(screen.getByTestId('contribute-name-es'), 'Sartén de pollo');
    await user.type(screen.getByTestId('contribute-description-en'), 'Too short');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toContain('Description must be at least 20 characters'));

    await user.type(screen.getByTestId('contribute-description-en'), ' — seared chicken and greens.');
    await pick(user, screen.getByTestId('contribute-cuisine'), 'Mexican');
    await pick(user, screen.getByTestId('contribute-difficulty'), 'Hard');
    await pick(user, screen.getByTestId('contribute-meal-type'), 'Breakfast');
    await user.type(screen.getByTestId('contribute-image-url'), 'not a url');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual(['Invalid image URL']));

    await user.clear(screen.getByTestId('contribute-image-url'));
    await clickNext(user);
    await onStep('timings');
    expect(screen.getByRole('heading', { level: 2, name: 'Timings' })).toHaveFocus();
    expect($contributeDraft.get()).toMatchObject({
      step: 1,
      data: { nameEn: 'Green Chicken Skillet', nameEs: 'Sartén de pollo', cuisine: 'mexican', difficulty: 'hard', mealType: 'breakfast' },
    });
  });
});
