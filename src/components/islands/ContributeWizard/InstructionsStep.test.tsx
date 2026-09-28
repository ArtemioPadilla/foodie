// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
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

/** Step 4 — ordered instructions (roadmap Issue 038). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
});
afterEach(() => vi.unstubAllGlobals());

const texts = () => screen.getAllByTestId('contribute-instruction').map((el) => (el as HTMLTextAreaElement).value);

describe('ContributeWizard · instructions step', () => {
  it('needs one step of at least 10 characters', async () => {
    seedDraft('instructions', validSubmission({ instructions: [] }));
    const { user } = renderWizard('en');
    await onStep('instructions');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual(['At least one instruction step is required']));

    await user.click(screen.getByTestId('contribute-add-step'));
    await user.type(screen.getByRole('textbox', { name: 'Step 1' }), 'Stir');
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual(['Step #1: Instruction must be at least 10 characters']));
    await user.type(screen.getByRole('textbox', { name: 'Step 1' }), ' the sauce until glossy.');
    await clickNext(user);
    await onStep('nutrition');
    expect($contributeDraft.get()?.data.instructions).toEqual(['Stir the sauce until glossy.']);
  });

  it('adds, reorders with the arrow buttons and removes steps', async () => {
    seedDraft('instructions', validSubmission({ instructions: ['First, heat the oil well.', 'Then add the onions slowly.'] }));
    const { user } = renderWizard('es');
    await onStep('instructions');
    await user.click(screen.getByTestId('contribute-add-step'));
    await user.type(screen.getByRole('textbox', { name: 'Paso 3' }), 'Finally, season to taste.');
    await user.click(screen.getByRole('button', { name: 'Mover paso arriba — 3' }));
    expect(texts()).toEqual(['First, heat the oil well.', 'Finally, season to taste.', 'Then add the onions slowly.']);
    await user.click(screen.getByRole('button', { name: 'Mover paso abajo — 1' }));
    expect(texts()).toEqual(['Finally, season to taste.', 'First, heat the oil well.', 'Then add the onions slowly.']);
    await user.click(screen.getByRole('button', { name: 'Quitar paso — 2' }));
    expect(texts()).toEqual(['Finally, season to taste.', 'Then add the onions slowly.']);
    await waitFor(() =>
      expect($contributeDraft.get()?.data.instructions).toEqual(['Finally, season to taste.', 'Then add the onions slowly.']),
    );
  });
});
