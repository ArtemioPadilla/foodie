// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import {
  clickNext,
  installCatalogFetch,
  onStep,
  renderWizard,
  seedDraft,
  stepErrors,
  validSubmission,
} from '@/tests/fixtures/contribute-wizard';

/** Step 2 — timings, servings and equipment (roadmap Issue 038). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe('ContributeWizard · timings step', () => {
  it('requires prep and cook time and at least one serving (French messages)', async () => {
    seedDraft('timings', validSubmission({ prepTime: 0, cookTime: 0, servings: 0 }));
    const { user } = renderWizard('fr');
    await onStep('timings');
    expect(screen.getByTestId('contribute-draft-restored')).toBeInTheDocument();
    await clickNext(user);
    await waitFor(() =>
      expect(stepErrors()).toEqual([
        'Le temps de préparation doit être supérieur à 0',
        'Le temps de cuisson doit être supérieur à 0',
        'Les portions doivent être au moins 1',
      ]),
    );
    await onStep('timings');
  });

  it('sums the total time, collects equipment tags and advances', async () => {
    seedDraft('timings', validSubmission({ prepTime: 0, cookTime: 0, restTime: undefined, equipment: [] }));
    const { user } = renderWizard('en');
    await onStep('timings');
    await user.type(screen.getByTestId('contribute-prep-time'), '15');
    await user.type(screen.getByTestId('contribute-cook-time'), '30');
    await user.type(screen.getByTestId('contribute-rest-time'), '5');
    expect(screen.getByTestId('contribute-total-time')).toHaveTextContent('Total Time: 50 minutes');

    await user.type(screen.getByRole('textbox', { name: 'Add equipment' }), 'Dutch oven{Enter}grill,');
    const equipment = screen.getByTestId('contribute-equipment').parentElement!;
    expect(within(equipment).getByRole('button', { name: 'Remove Dutch oven' })).toBeInTheDocument();
    await user.click(within(equipment).getByRole('button', { name: 'Remove grill' }));

    await user.clear(screen.getByTestId('contribute-servings'));
    await user.type(screen.getByTestId('contribute-servings'), '6');
    await clickNext(user);
    await onStep('ingredients');
    expect($contributeDraft.get()?.data).toMatchObject({ prepTime: 15, cookTime: 30, restTime: 5, servings: 6, equipment: ['Dutch oven'] });
  });

  it('Back returns to the previous step with the values kept', async () => {
    seedDraft('timings');
    const { user } = renderWizard('en');
    await onStep('timings');
    await user.click(screen.getByTestId('contribute-back'));
    await onStep('basic');
    expect(screen.getByTestId('contribute-name-en')).toHaveValue('Green Chicken Skillet');
    expect(screen.getByTestId('contribute-back')).toBeDisabled();
  });
});
