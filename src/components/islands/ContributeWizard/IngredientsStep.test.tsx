// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import {
  clickNext,
  installCatalogFetch,
  onStep,
  pick,
  renderWizard,
  seedDraft,
  stepErrors,
  validSubmission,
} from '@/tests/fixtures/contribute-wizard';

/** Step 3 — ingredients from the catalog `Combobox` (roadmap Issue 038). */
beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

const rows = () => screen.queryAllByTestId('contribute-ingredient-row');

async function catalogReady() {
  await waitFor(() => expect(screen.getByTestId('contribute-step-ingredients')).toHaveAttribute('data-catalog', 'success'));
}

describe('ContributeWizard · ingredients step', () => {
  it('needs at least one line, and every line needs an ingredient, a quantity and a unit', async () => {
    installCatalogFetch();
    seedDraft('ingredients', validSubmission({ ingredients: [] }));
    const { user } = renderWizard('en');
    await onStep('ingredients');
    await catalogReady();
    expect(screen.getByTestId('contribute-no-ingredients')).toBeInTheDocument();
    await clickNext(user);
    await waitFor(() => expect(stepErrors()).toEqual(['At least one ingredient is required']));

    await user.click(screen.getByTestId('contribute-add-ingredient'));
    await user.clear(within(rows()[0]!).getByTestId('contribute-ingredient-quantity'));
    await clickNext(user);
    await waitFor(() =>
      expect(stepErrors()).toEqual([
        'Ingredient #1: Ingredient name is required',
        'Ingredient #1: Quantity must be greater than 0',
        'Ingredient #1: Unit is required',
      ]),
    );
    await onStep('ingredients');
  });

  it('picks a catalog ingredient by its localised name and stores its id', async () => {
    installCatalogFetch();
    seedDraft('ingredients', validSubmission({ ingredients: [] }));
    const { user } = renderWizard('es');
    await onStep('ingredients');
    await catalogReady();
    await user.click(screen.getByTestId('contribute-add-ingredient'));
    const row = rows()[0]!;
    await user.type(within(row).getByTestId('contribute-ingredient-picker'), 'Espi');
    await user.click(await screen.findByRole('option', { name: 'Espinaca' }));
    expect(within(row).getByTestId('contribute-ingredient-picker')).toHaveValue('Espinaca');
    await user.clear(within(row).getByTestId('contribute-ingredient-quantity'));
    await user.type(within(row).getByTestId('contribute-ingredient-quantity'), '1.5');
    await pick(user, within(row).getByTestId('contribute-ingredient-unit'), 'taza');
    await user.type(within(row).getByTestId('contribute-ingredient-preparation'), 'picada');
    await user.click(within(row).getByRole('checkbox'));
    await clickNext(user);
    await onStep('instructions');
    expect($contributeDraft.get()?.data.ingredients).toEqual([
      { ingredientId: 'ing_002', quantity: 1.5, unit: 'cup', preparation: 'picada', optional: true },
    ]);
  });

  it('reorders and removes lines', async () => {
    installCatalogFetch();
    seedDraft('ingredients');
    const { user } = renderWizard('en');
    await onStep('ingredients');
    await catalogReady();
    const pickerValues = () => rows().map((row) => (within(row).getByTestId('contribute-ingredient-picker') as HTMLInputElement).value);
    expect(pickerValues()).toEqual(['Chicken Breast', 'Spinach']);
    await user.click(screen.getByRole('button', { name: 'Move ingredient down — 1' }));
    expect(pickerValues()).toEqual(['Spinach', 'Chicken Breast']);
    await user.click(screen.getByRole('button', { name: 'Remove ingredient — 1' }));
    expect(pickerValues()).toEqual(['Chicken Breast']);
    await waitFor(() => expect($contributeDraft.get()?.data.ingredients.map((line) => line.ingredientId)).toEqual(['ing_001']));
  });

  it('explains a missing catalog and offers a retry', async () => {
    const fetchMock = installCatalogFetch([CATALOG_FILES.ingredients]);
    seedDraft('ingredients', validSubmission({ ingredients: [] }));
    const { user } = renderWizard('en');
    await onStep('ingredients');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The ingredient catalog could not be loaded'));
    await user.click(screen.getByTestId('contribute-add-ingredient'));
    expect(within(rows()[0]!).getByTestId('contribute-ingredient-picker')).toBeDisabled();
    const calls = fetchMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /Try Again/ }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
  });
});
