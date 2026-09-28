// @vitest-environment jsdom
import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { $pantry } from '@/stores/pantry';
import { $shopping } from '@/stores/shopping';
import IngredientActions from './IngredientActions';

/**
 * jsdom tests of the `/ingredients/[id]/` island (roadmap Issue 019): add to
 * pantry (`$pantry`, legacy `pantryItems` key) and to the shopping list
 * (`$shopping`, merged by ingredient), with a validated quantity.
 */
function renderIsland(lang: 'en' | 'es' | 'fr' = 'en') {
  return render(<IngredientActions ingredientId="ing_010" name="Tomato" unit="lb" category="vegetables" lang={lang} />);
}

beforeEach(() => {
  localStorage.clear();
  $pantry.set([]);
  $shopping.set([]);
});

describe('IngredientActions', () => {
  it('adds the typed quantity to the pantry and reports what is stored', async () => {
    renderIsland();
    await waitFor(() => expect(screen.getByTestId('ingredient-actions')).toHaveAttribute('data-hydrated', 'true'));
    fireEvent.change(screen.getByTestId('ingredient-quantity'), { target: { value: '2.5' } });
    fireEvent.click(screen.getByTestId('add-to-pantry-button'));
    expect($pantry.get()).toEqual([
      expect.objectContaining({ ingredientId: 'ing_010', quantity: 2.5, unit: 'lb', location: 'Pantry' }),
    ]);
    expect(JSON.parse(localStorage.getItem('pantryItems') ?? '[]')).toHaveLength(1);
    expect(await screen.findByText('Tomato added to your pantry')).toBeInTheDocument();
    expect(screen.getByTestId('ingredient-in-pantry')).toHaveTextContent('In your pantry: 2 ½ lb');
  });

  it('adds to the shopping list, merging repeated additions for the same ingredient', async () => {
    renderIsland();
    fireEvent.click(screen.getByTestId('add-ingredient-to-shopping-button'));
    fireEvent.click(screen.getByTestId('add-ingredient-to-shopping-button'));
    expect($shopping.get()).toEqual([
      { ingredientId: 'ing_010', quantity: 2, unit: 'lb', usedIn: [], category: 'vegetables', checked: false },
    ]);
    expect(JSON.parse(localStorage.getItem('shoppingList') ?? '[]')).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('ingredient-on-list')).toHaveTextContent('2 lb'));
  });

  it('rejects a non-positive quantity with an accessible error and writes nothing', () => {
    renderIsland('es');
    const input = screen.getByTestId('ingredient-quantity');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('add-to-pantry-button'));
    expect(screen.getByRole('alert')).toHaveTextContent('Introduce una cantidad mayor que cero');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect($pantry.get()).toEqual([]);
    fireEvent.change(input, { target: { value: '3' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('labels the controls in the page language', () => {
    renderIsland('fr');
    expect(screen.getByRole('heading', { name: 'Ajouter à votre cuisine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ajouter au garde-manger/ })).toBeInTheDocument();
  });
});
