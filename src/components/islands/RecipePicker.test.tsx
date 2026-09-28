// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '@/schemas';
import { $favorites } from '@/stores/favorites';
import type { PlanSlot } from '@/stores/planner';
import { makeIngredient, makeRecipe } from '@/tests/fixtures/foodie-domain';
import { MAX_RESULTS, RecipePicker } from './RecipePicker';

/**
 * jsdom tests of the planner's `RecipePicker` (roadmap Issue 025): search,
 * quick filters, the combobox keyboard (↑/↓/Enter with
 * `aria-activedescendant`), the preview (kcal, cost for the chosen servings)
 * and "Add" with the stepper's servings.
 */

const eggs = makeRecipe(); // breakfast · 10 min · 2 servings · ing_001 ×4 + ing_002 ×30
const tacos = makeRecipe({ id: 'rec_002', name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' }, type: 'dinner', totalTime: 35 });
const soup = makeRecipe({ id: 'rec_003', name: { en: 'Onion Soup', es: 'Sopa de Cebolla', fr: 'Soupe à l’Oignon' }, type: 'lunch', totalTime: 60 });
const cookie = makeRecipe({ id: 'rec_004', name: { en: 'Oat Cookie', es: 'Galleta de Avena', fr: 'Biscuit à l’Avoine' }, type: 'dessert', totalTime: 25 });
const recipes = [eggs, tacos, soup, cookie];
const ingredients = [makeIngredient({ id: 'ing_001', avgPrice: 3 }), makeIngredient({ id: 'ing_002', avgPrice: 0.1 })];

function renderPicker(
  props: Partial<React.ComponentProps<typeof RecipePicker>> & { slot?: PlanSlot } = {},
) {
  const onSelect = vi.fn<(recipe: Recipe, servings: number) => void>();
  const onOpenChange = vi.fn();
  render(
    <RecipePicker
      open
      onOpenChange={onOpenChange}
      lang="en"
      recipes={recipes}
      targetLabel="Tuesday · Dinner"
      onSelect={onSelect}
      slot="dinner"
      defaultServings={3}
      ingredients={ingredients}
      currency="USD"
      {...props}
    />,
  );
  const picker = screen.getByTestId('recipe-picker');
  return { picker, onSelect, onOpenChange };
}

const names = (picker: HTMLElement) =>
  within(picker)
    .queryAllByRole('option')
    .map((o) => o.textContent);

beforeEach(() => {
  localStorage.clear();
  $favorites.set([]);
});

describe('RecipePicker — search and quick filters', () => {
  it('lists every recipe, highlights the first and previews it', () => {
    const { picker } = renderPicker();
    expect(within(picker).getAllByRole('option')).toHaveLength(4);
    expect(within(picker).getByTestId('recipe-picker-count')).toHaveTextContent('4 recipes');
    const [first] = within(picker).getAllByRole('option');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(within(picker).getByTestId('recipe-picker-preview-name')).toHaveTextContent('Scrambled Eggs');
    expect(within(picker).getByRole('button', { name: 'Add Scrambled Eggs' })).toBeEnabled();
  });

  it('narrows by search and says so when nothing matches', async () => {
    const { picker } = renderPicker();
    const search = within(picker).getByTestId('recipe-picker-search');
    await userEvent.type(search, 'soup');
    expect(names(picker)).toEqual([expect.stringContaining('Onion Soup')]);
    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(within(picker).queryByRole('listbox')).not.toBeInTheDocument();
    expect(within(picker).getByTestId('recipe-picker-empty')).toBeInTheDocument();
    expect(within(picker).getByTestId('recipe-picker-add')).toBeDisabled();
    expect(search).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters by the slot’s meal type, by ≤ 30 min and by favourites', async () => {
    $favorites.set(['rec_003']);
    const { picker } = renderPicker({ slot: 'snacks' });

    await userEvent.click(within(picker).getByRole('button', { name: 'Fits Snacks' }));
    expect(names(picker)).toEqual([expect.stringContaining('Oat Cookie')]);

    await userEvent.click(within(picker).getByRole('button', { name: '≤ 30 min' }));
    expect(names(picker)).toEqual([expect.stringContaining('Scrambled Eggs'), expect.stringContaining('Oat Cookie')]);

    await userEvent.click(within(picker).getByRole('button', { name: 'Favorites' }));
    expect(names(picker)).toEqual([expect.stringContaining('Onion Soup')]);

    await userEvent.click(within(picker).getByRole('button', { name: 'All' }));
    expect(within(picker).getAllByRole('option')).toHaveLength(4);
  });

  it(`caps the list at ${MAX_RESULTS} and tells the user to refine`, () => {
    const many = Array.from({ length: MAX_RESULTS + 5 }, (_, i) =>
      makeRecipe({ id: `rec_${100 + i}`, name: { en: `Dish ${i}`, es: `Plato ${i}`, fr: `Plat ${i}` } }),
    );
    const { picker } = renderPicker({ recipes: many });
    expect(within(picker).getAllByRole('option')).toHaveLength(MAX_RESULTS);
    expect(within(picker).getByTestId('recipe-picker-count')).toHaveTextContent(`Showing ${MAX_RESULTS} of ${MAX_RESULTS + 5} recipes`);
  });
});

describe('RecipePicker — keyboard, preview and add', () => {
  it('↑/↓ move the highlighted option (aria-activedescendant) and Enter adds it with the default servings', async () => {
    const { picker, onSelect } = renderPicker();
    const search = within(picker).getByTestId('recipe-picker-search');
    expect(search).toHaveAttribute('role', 'combobox');
    search.focus();

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = document.getElementById(search.getAttribute('aria-activedescendant') ?? '');
    expect(active).toHaveTextContent('Onion Soup');
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(within(picker).getByTestId('recipe-picker-preview-name')).toHaveTextContent('Onion Soup');

    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}'); // wraps to the last one
    expect(within(picker).getByTestId('recipe-picker-preview-name')).toHaveTextContent('Oat Cookie');

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(cookie, 3);
    expect(search).toHaveFocus();
  });

  it('a click previews a recipe; the stepper changes the servings, the cost and what is added', async () => {
    const { picker, onSelect } = renderPicker();
    await userEvent.click(within(picker).getByRole('option', { name: /Beef Tacos/ }));
    const preview = within(picker).getByTestId('recipe-picker-preview');
    expect(within(preview).getByTestId('recipe-picker-preview-name')).toHaveTextContent('Beef Tacos');
    // makeNutrition: 500 kcal for the 2-serving yield → 250 kcal a serving.
    expect(within(preview).getByTestId('recipe-picker-kcal')).toHaveTextContent('250 kcal per serving');
    // 3 servings of a 2-serving recipe: 6 × $3 + 45 × $0.10 = $22.50
    expect(within(preview).getByTestId('recipe-picker-cost')).toHaveTextContent('≈ $22.50 for 3 servings');

    await userEvent.click(within(preview).getByRole('button', { name: 'Increase servings' }));
    expect(within(preview).getByTestId('recipe-picker-cost')).toHaveTextContent('≈ $30.00 for 4 servings');

    await userEvent.click(within(picker).getByRole('button', { name: 'Add Beef Tacos' }));
    expect(onSelect).toHaveBeenCalledWith(tacos, 4);
  });

  it('hides the cost without catalog ingredients and localises every label', () => {
    const { picker } = renderPicker({ ingredients: undefined, lang: 'es', targetLabel: 'Martes · Cena' });
    expect(within(picker).queryByTestId('recipe-picker-cost')).not.toBeInTheDocument();
    expect(within(picker).getByRole('heading', { name: 'Añadir una receta' })).toBeInTheDocument();
    expect(within(picker).getByRole('button', { name: 'Para Cena' })).toBeInTheDocument();
    expect(within(picker).getByRole('button', { name: 'Añadir Huevos Revueltos' })).toBeInTheDocument();
  });
});
