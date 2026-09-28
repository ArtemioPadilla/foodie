// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import { DEFAULT_GOALS, type TrackingMealType } from '@/schemas';
import { $favorites } from '@/stores/favorites';
import { $goals } from '@/stores/goals';
import { $currentPlan, createPlan } from '@/stores/planner';
import { $tracking } from '@/stores/tracking';
import { makeIngredient, makeNutrition, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { BeverageSchema } from '@/schemas';
import { planDayIndex } from '@/lib/domain/tracking';
import { QuickAddDialog } from './Tracking/QuickAddDialog';

closeToastsAfterEach();

/**
 * jsdom tests of the tracking quick-add dialog (roadmap Issue 031) — the port
 * of legacy `tests/integration/QuickAddModal.test.tsx` (14 tests, same
 * describe blocks and names) plus the logging paths the legacy suite never
 * exercised: recipe servings, ingredient quantity/unit estimate, drink size,
 * water glasses, search through `getTranslated`, favourites first and "from
 * your meal plan".
 *
 * Deliberate adaptation: legacy had three tabs (recipes, ingredients,
 * beverage); the roadmap adds water, so "displays three tab buttons" now
 * asserts the four tabs.
 */

vi.setConfig({ testTimeout: 20_000 });

const DATE = '2026-09-28'; // a Monday
const eggs = makeRecipe(); // 500 kcal for 2 servings
const pancakes = makeRecipe({
  id: 'rec_002',
  name: { en: 'Pancakes', es: 'Panqueques', fr: 'Crêpes épaisses' },
  description: { en: 'Fluffy stack', es: 'Pila esponjosa', fr: 'Pile moelleuse' },
  nutrition: makeNutrition({ calories: 800 }),
  servings: 4,
});
const chicken = makeIngredient(); // category protein → 150 kcal / 100 g
const rice = makeIngredient({ id: 'ing_003', name: { en: 'Rice', es: 'Arroz', fr: 'Riz' }, category: 'grains', unit: 'cup' });
const beer = BeverageSchema.parse({
  ...mockBeverages[0],
  id: 'bev_beer',
  name: { en: 'Beer', es: 'Cerveza', fr: 'Bière' },
  category: 'alcohol',
  nutrition: makeNutrition({ calories: 150, protein: 1, carbs: 13, fat: 0, fiber: 0, sugar: 0, sodium: 14 }),
  defaultQuantity: 355,
  isAlcoholic: true,
});
const beverages = [...mockBeverages, beer];

function renderQuickAdd(
  props: Partial<{ open: boolean; mealType: TrackingMealType; lang: 'en' | 'es' | 'fr'; onOpenChange: (open: boolean) => void }> = {},
) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const utils = render(
    <>
      <QuickAddDialog
        lang={props.lang ?? 'en'}
        open={props.open ?? true}
        onOpenChange={onOpenChange}
        date={DATE}
        mealType={props.mealType}
        recipes={[eggs, pancakes]}
        ingredients={[chicken, rice]}
        beverages={beverages}
        ingredientCategories={mockIngredientCategories}
      />
      <Toaster />
    </>,
  );
  return { ...utils, onOpenChange };
}

const dialog = () => screen.getByTestId('quick-add-dialog');
async function pick(trigger: HTMLElement, option: string) {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  localStorage.clear();
  $tracking.set([]);
  $favorites.set([]);
  $currentPlan.set(null);
  $goals.set(DEFAULT_GOALS);
});

describe('QuickAddDialog (port of QuickAddModal Integration Tests)', () => {
  describe('modal visibility', () => {
    it('does not render when isOpen is false', () => {
      renderQuickAdd({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Add')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      renderQuickAdd();
      expect(dialog()).toBeInTheDocument();
      expect(within(dialog()).getByText(/for September 28, 2026/)).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('displays three tab buttons', () => {
      // Adapted: recipe / ingredient / drink + the new water tab.
      renderQuickAdd();
      expect(within(dialog()).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Recipe', 'Ingredient', 'Drink', 'Water']);
    });

    it('first tab is active by default', () => {
      renderQuickAdd();
      expect(within(dialog()).getByRole('tab', { name: 'Recipe' })).toHaveAttribute('aria-selected', 'true');
      expect(within(dialog()).getByRole('searchbox', { name: 'Search recipes' })).toBeInTheDocument();
    });

    it('can switch between tabs', async () => {
      renderQuickAdd();
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Ingredient' }));
      expect(within(dialog()).getByRole('tab', { name: 'Ingredient' })).toHaveAttribute('aria-selected', 'true');
      expect(within(dialog()).getByRole('searchbox', { name: 'Search ingredients' })).toBeInTheDocument();
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Drink' }));
      expect(within(dialog()).getByRole('searchbox', { name: 'Search drinks' })).toBeInTheDocument();
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Water' }));
      expect(within(dialog()).getByTestId('quick-add-water')).toBeVisible();
    });
  });

  describe('meal type selector', () => {
    it('displays meal type dropdown by default', () => {
      renderQuickAdd();
      expect(within(dialog()).getByText('Select Meal Type')).toBeInTheDocument();
      expect(within(dialog()).getByTestId('quick-add-meal-select')).toHaveTextContent('Breakfast');
    });

    it('allows selecting different meal types', async () => {
      renderQuickAdd();
      await pick(within(dialog()).getByTestId('quick-add-meal-select'), 'Snack');
      expect(within(dialog()).getByTestId('quick-add-meal-select')).toHaveTextContent('Snack');
      await userEvent.click(within(dialog()).getByRole('button', { name: /Pancakes/ }));
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Log Meal' }));
      await waitFor(() => expect($tracking.get()).toHaveLength(1));
      expect($tracking.get()[0]).toMatchObject({ mealType: 'snack', recipeId: pancakes.id, date: DATE });
    });

    it('uses preselectedMealType when provided', () => {
      renderQuickAdd({ mealType: 'dinner' });
      expect(within(dialog()).getByTestId('quick-add-meal-select')).toHaveTextContent('Dinner');
    });

    it('changes UI on beverage tab', async () => {
      renderQuickAdd();
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Drink' }));
      expect(within(dialog()).queryByText('Select Meal Type')).not.toBeInTheDocument();
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Water' }));
      expect(within(dialog()).queryByText('Select Meal Type')).not.toBeInTheDocument();
      // The beverage section's own "Add" opens straight on the drink tab.
    });
  });

  describe('beverage logging integration', () => {
    it('beverage tab loads and displays beverages', async () => {
      renderQuickAdd({ mealType: 'beverage' });
      expect(within(dialog()).getByRole('tab', { name: 'Drink' })).toHaveAttribute('aria-selected', 'true');
      const options = within(dialog()).getAllByTestId('quick-add-beverage-option');
      expect(options.map((o) => o.dataset.id)).toEqual(['bev_water', 'bev_coffee', 'bev_beer']);
      // Category filter.
      await pick(within(dialog()).getByTestId('quick-add-beverage-category'), 'Coffee');
      expect(within(dialog()).getAllByTestId('quick-add-beverage-option').map((o) => o.dataset.id)).toEqual(['bev_coffee']);
      // Selecting a caffeinated drink warns about caffeine.
      await userEvent.click(within(dialog()).getByRole('button', { name: /Coffee/ }));
      expect(within(dialog()).getByRole('note')).toHaveTextContent('Contains 95 mg of caffeine per 250 ml.');
    });

    it('logs a drink with a size preset and scales its nutrition', async () => {
      const { onOpenChange } = renderQuickAdd({ mealType: 'beverage' });
      await userEvent.click(within(dialog()).getByRole('button', { name: /Beer/ }));
      expect(within(dialog()).getByRole('note')).toHaveTextContent('Contains alcohol. Drink responsibly.');
      expect(within(dialog()).getByRole('textbox', { name: 'Quantity' })).toHaveValue('355');
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Bottle · 500 ml' }));
      expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('211 kcal');
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Log Beverage' }));
      await waitFor(() => expect($tracking.get()).toHaveLength(1));
      expect($tracking.get()[0]).toMatchObject({ beverageId: 'bev_beer', mealType: 'beverage', quantity: 500, unit: 'ml', date: DATE });
      expect($tracking.get()[0]!.nutrition.calories).toBe(211);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('modal closing', () => {
    it('calls onClose when close button clicked', async () => {
      const { onOpenChange } = renderQuickAdd();
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Close' }));
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });
  });

  describe('accessibility', () => {
    it('modal has proper dialog role', () => {
      renderQuickAdd();
      expect(dialog()).toHaveAttribute('role', 'dialog');
      expect(dialog()).toHaveAccessibleDescription(/Log a recipe, an ingredient, a drink or water/);
    });

    it('close button has aria-label', () => {
      renderQuickAdd();
      expect(within(dialog()).getByTestId('quick-add-close')).toHaveAttribute('aria-label', 'Close');
    });

    it('all tabs are keyboard navigable', async () => {
      renderQuickAdd();
      // Focus the active tab the way a user does (Base UI tracks the highlighted tab on pointer/keyboard focus).
      await userEvent.click(within(dialog()).getByRole('tab', { name: 'Recipe' }));
      await userEvent.keyboard('{ArrowRight}');
      expect(within(dialog()).getByRole('tab', { name: 'Ingredient' })).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      expect(within(dialog()).getByRole('tab', { name: 'Water' })).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(within(dialog()).getByRole('tab', { name: 'Water' })).toHaveAttribute('aria-selected', 'true');
    });
  });
});

describe('QuickAddDialog (logging paths)', () => {
  it('logs a recipe with the chosen servings and scaled nutrition', async () => {
    renderQuickAdd({ mealType: 'lunch' });
    await userEvent.click(within(dialog()).getByRole('button', { name: /Scrambled Eggs/ }));
    expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('250 kcal');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Increase' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Increase' }));
    expect(within(dialog()).getByRole('textbox', { name: 'Servings' })).toHaveValue('2');
    expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('500 kcal');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Log Meal' }));
    await waitFor(() => expect($tracking.get()).toHaveLength(1));
    expect($tracking.get()[0]).toMatchObject({ recipeId: eggs.id, mealType: 'lunch', quantity: 2, servings: 2, unit: 'servings' });
    expect($tracking.get()[0]!.nutrition.calories).toBe(500);
    expect(await screen.findByText('Entry logged successfully')).toBeInTheDocument();
  });

  it('estimates an ingredient from quantity and unit (estimateIngredientNutrition)', async () => {
    renderQuickAdd({ mealType: 'dinner' });
    await userEvent.click(within(dialog()).getByRole('tab', { name: 'Ingredient' }));
    await pick(within(dialog()).getByTestId('quick-add-ingredient-category'), 'Grains');
    expect(within(dialog()).getAllByTestId('quick-add-ingredient-option').map((o) => o.dataset.id)).toEqual(['ing_003']);
    await pick(within(dialog()).getByTestId('quick-add-ingredient-category'), 'All categories');
    await userEvent.click(within(dialog()).getByRole('button', { name: /Chicken Breast/ }));
    expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('150 kcal');
    await pick(within(dialog()).getByTestId('quick-add-unit'), 'kg');
    expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('150,000 kcal');
    await pick(within(dialog()).getByTestId('quick-add-unit'), 'g');
    const quantity = within(dialog()).getByRole('textbox', { name: 'Quantity' });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '200');
    await userEvent.tab();
    expect(within(dialog()).getByTestId('preview-calories')).toHaveTextContent('300 kcal');
    expect(within(dialog()).getByText(/Estimated from the average/)).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Log Meal' }));
    await waitFor(() => expect($tracking.get()).toHaveLength(1));
    expect($tracking.get()[0]).toMatchObject({ ingredientId: 'ing_001', quantity: 200, unit: 'g', mealType: 'dinner' });
    expect($tracking.get()[0]!.nutrition.calories).toBe(300);
  });

  it('logs water in glasses as bev_water millilitres', async () => {
    $tracking.set([]);
    renderQuickAdd();
    await userEvent.click(within(dialog()).getByRole('tab', { name: 'Water' }));
    expect(within(dialog()).getByTestId('quick-add-water-status')).toHaveTextContent('0 / 2,000 ml today');
    expect(within(dialog()).getByText('1 glass = 250 ml')).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Increase' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Increase' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Log 3 glasses' }));
    await waitFor(() => expect($tracking.get()).toHaveLength(1));
    expect($tracking.get()[0]).toMatchObject({ beverageId: 'bev_water', quantity: 750, unit: 'ml', mealType: 'beverage', date: DATE });
    expect(await screen.findByText('750 ml of water logged')).toBeInTheDocument();
  });

  it('searches through the localised names (getTranslated) in the page locale', async () => {
    renderQuickAdd({ lang: 'es' });
    await userEvent.type(within(dialog()).getByRole('searchbox', { name: 'Buscar recetas' }), 'panque');
    expect(within(dialog()).getAllByTestId('quick-add-recipe-option').map((o) => o.textContent)).toEqual([expect.stringContaining('Panqueques')]);
    await userEvent.click(within(dialog()).getByRole('tab', { name: 'Bebida' }));
    await userEvent.type(within(dialog()).getByRole('searchbox', { name: 'Buscar bebidas' }), 'cerv');
    expect(within(dialog()).getAllByTestId('quick-add-beverage-option').map((o) => o.dataset.id)).toEqual(['bev_beer']);
    await userEvent.click(within(dialog()).getByRole('tab', { name: 'Ingrediente' }));
    await userEvent.type(within(dialog()).getByRole('searchbox', { name: 'Buscar ingredientes' }), 'nada que ver');
    expect(within(dialog()).getByText('Nada coincide con tu búsqueda.')).toBeInTheDocument();
  });

  it('lists favourites first and offers the day’s planned meals', async () => {
    $favorites.set([pancakes.id]);
    const plan = createPlan();
    plan.days[planDayIndex(DATE)]!.meals.lunch = { recipeId: eggs.id, servings: 3 };
    $currentPlan.set(plan);
    renderQuickAdd();
    expect(within(dialog()).getAllByTestId('quick-add-recipe-option').map((o) => o.dataset.id)).toEqual([pancakes.id, eggs.id]);
    const fromPlan = within(dialog()).getByTestId('quick-add-from-plan');
    expect(fromPlan).toHaveTextContent('Scrambled Eggs');
    expect(fromPlan).toHaveTextContent('Lunch · 3 servings');
    await userEvent.click(within(fromPlan).getByRole('button', { name: 'Add: Scrambled Eggs' }));
    await waitFor(() => expect($tracking.get()).toHaveLength(1));
    expect($tracking.get()[0]).toMatchObject({ recipeId: eggs.id, mealType: 'lunch', servings: 3, fromMealPlan: true, date: DATE });
  });
});
