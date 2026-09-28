// @vitest-environment jsdom
import * as React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeRecipe } from '@/tests/fixtures/foodie-domain';
import { $favorites } from '@/stores/favorites';
import { $currentPlan } from '@/stores/planner';
import { $shopping } from '@/stores/shopping';
import { $preferences } from '@/stores/preferences';
import RecipeDetailActions from './RecipeDetailActions';

/**
 * jsdom tests of the `/recipes/[id]/` island (roadmap Issue 018): servings
 * scaling re-renders quantities and nutrition, favourite → `$favorites`,
 * "Add to meal plan" dialog → `$planner`, "Add ingredients" → `$shopping`,
 * per-step timer dialog.
 */
const recipe = makeRecipe({
  type: 'dinner',
  servings: 2,
  ingredients: [
    { ingredientId: 'ing_001', quantity: 4, unit: 'piece', optional: false },
    { ingredientId: 'ing_002', quantity: 200, unit: 'g', preparation: 'grated', optional: false },
    { ingredientId: 'ing_003', quantity: 1, unit: 'pinch', optional: true },
  ],
  instructions: [
    { step: 1, text: { en: 'Whisk the eggs', es: 'Bate los huevos', fr: 'Battre les œufs' }, time: 2 },
    { step: 2, text: { en: 'Serve', es: 'Sirve', fr: 'Servir' } },
  ],
});
const ingredientMeta = {
  ing_001: { name: 'Egg', category: 'protein' },
  ing_002: { name: 'Cheese', category: 'dairy' },
  ing_003: { name: 'Salt' },
};

function renderIsland(lang: 'en' | 'es' | 'fr' = 'en') {
  return render(<RecipeDetailActions recipe={recipe} lang={lang} ingredientMeta={ingredientMeta} />);
}

beforeEach(() => {
  localStorage.clear();
  $favorites.set([]);
  $shopping.set([]);
  $currentPlan.set(null);
  $preferences.set({ ...$preferences.get(), unitSystem: 'metric' });
});

describe('RecipeDetailActions', () => {
  it('renders ingredients, instructions and nutrition at the recipe yield', () => {
    renderIsland();
    const list = screen.getByTestId('ingredients-list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(list.textContent).toContain('4 piece');
    expect(list.textContent).toContain('200 g');
    expect(screen.getByTestId('instructions-list').textContent).toContain('Whisk the eggs');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('scales quantities and nutrition when servings change', () => {
    renderIsland();
    const caloriesRow = () => screen.getByRole('rowheader', { name: 'Calories' }).closest('tr')!;
    const before = Number(caloriesRow().textContent!.match(/\d+/)![0]);
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    const list = screen.getByTestId('ingredients-list');
    expect(list.textContent).toContain('8 piece');
    expect(list.textContent).toContain('400 g');
    expect(screen.getByTestId('scaled-note')).toHaveTextContent('Scaled for 4 servings');
    expect(Number(caloriesRow().textContent!.match(/\d+/)![0])).toBe(before * 2);
  });

  it('switches the unit system with the metric/imperial toggle', () => {
    renderIsland();
    fireEvent.click(within(screen.getByTestId('unit-toggle')).getByText('lb/oz'));
    expect(screen.getByTestId('ingredients-list').textContent).toMatch(/oz/);
  });

  it('toggles the favourite in $favorites with aria-pressed', async () => {
    renderIsland();
    const button = screen.getByTestId('favorite-button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect($favorites.get()).toEqual(['rec_001']);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(button);
    expect($favorites.get()).toEqual([]);
  });

  it('adds the non-optional ingredients at the selected yield to $shopping', () => {
    renderIsland();
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    fireEvent.click(screen.getByTestId('add-to-shopping-button'));
    expect($shopping.get()).toEqual([
      { ingredientId: 'ing_001', quantity: 6, unit: 'piece', usedIn: ['rec_001'], category: 'protein', checked: false },
      { ingredientId: 'ing_002', quantity: 300, unit: 'g', usedIn: ['rec_001'], category: 'dairy', checked: false },
    ]);
  });

  it('adds the recipe to the plan through the day/meal dialog (creating a plan when none exists)', async () => {
    renderIsland();
    fireEvent.click(screen.getByTestId('add-to-plan-button'));
    const dialog = await screen.findByTestId('add-to-plan-dialog');
    expect(within(dialog).getByText('Day')).toBeInTheDocument();
    expect(within(dialog).getByText('Meal')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('confirm-add-to-plan'));
    const plan = $currentPlan.get();
    expect(plan).not.toBeNull();
    const filled = plan!.days.filter((day) => day.meals.dinner);
    expect(filled).toHaveLength(1);
    expect(filled[0]!.meals.dinner).toEqual({ recipeId: 'rec_001', servings: 2 });
    await waitFor(() => expect(screen.queryByTestId('add-to-plan-dialog')).not.toBeInTheDocument());
  });

  it('opens the step timer in a dialog', async () => {
    renderIsland('es');
    fireEvent.click(screen.getByTestId('timer-button-step-1'));
    const timer = await screen.findByTestId('recipe-timer');
    expect(within(timer).getByText('Temporizador para Paso 1')).toBeInTheDocument();
    expect(within(timer).getByTestId('timer-display')).toHaveTextContent('02:00');
    expect(screen.queryByTestId('timer-button-step-2')).not.toBeInTheDocument();
  });

  it('tracks gathered ingredients and completed steps', () => {
    renderIsland();
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getByText('1 / 3 checked')).toBeInTheDocument();
    const markButtons = screen.getAllByRole('button', { pressed: false, name: /Mark complete/ });
    fireEvent.click(markButtons[0]!);
    expect(screen.getByText('1 / 2 steps completed')).toBeInTheDocument();
  });
});

describe('RecipeDetailActions — ingredient links (roadmap #019)', () => {
  it('links catalog ingredients to their localised static page; unknown ids stay plain text', () => {
    renderIsland('fr');
    const links = screen.getAllByTestId('ingredient-link');
    expect(links.map((a) => a.textContent)).toEqual(['Egg', 'Cheese']);
    expect(links[0]?.getAttribute('href')).toMatch(/\/fr\/ingredients\/ing_001\/$/);
    expect(within(screen.getByTestId('ingredients-list')).getByText('Salt').tagName).toBe('SPAN');
  });
});
