// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeNutrition } from '@/tests/fixtures/foodie-domain';
import { NUTRITION_ROWS, NutritionFacts } from './NutritionFacts';

/** NutritionFacts (roadmap Issue 018): accessible table + per-serving scaling. */
describe('NutritionFacts', () => {
  const nutrition = makeNutrition();

  it('renders an accessible table: caption, column headers and one row header per nutrient', () => {
    render(<NutritionFacts nutrition={nutrition} baseServings={2} lang="en" />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Nutrition Facts')).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Nutrient', 'Amount']);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(NUTRITION_ROWS.length);
    expect(within(table).getByRole('rowheader', { name: 'Protein' })).toBeInTheDocument();
  });

  it('shows the stored values at the recipe yield', () => {
    render(<NutritionFacts nutrition={nutrition} baseServings={2} lang="en" />);
    const row = screen.getByRole('rowheader', { name: 'Calories' }).closest('tr')!;
    expect(row.textContent).toContain(String(nutrition.calories));
  });

  it('scales every value by servings / baseServings and says so in the caption', () => {
    render(<NutritionFacts nutrition={nutrition} baseServings={2} servings={4} lang="es" />);
    const row = screen.getByRole('rowheader', { name: 'Calorías' }).closest('tr')!;
    expect(row.textContent).toContain(String(nutrition.calories * 2));
    expect(screen.getByTestId('nutrition-facts')).toHaveAttribute('data-servings', '4');
    expect(screen.getByRole('table').textContent).toMatch(/4/);
  });

  it('rounds scaled values: kcal/mg to integers, grams to one decimal', () => {
    const odd = makeNutrition({ calories: 333, protein: 12.35, carbs: 41.2, fat: 7.05, sodium: 415, cholesterol: 33 });
    // 3 → 2 servings: factor 2/3.
    render(<NutritionFacts nutrition={odd} baseServings={3} servings={2} lang="en" />);
    const cell = (key: string) => document.querySelector(`[data-nutrient="${key}"] td`)!.firstChild!.textContent;
    expect(cell('calories')).toBe('222');
    expect(cell('protein')).toBe('8.2');
    expect(cell('carbs')).toBe('27.5');
    expect(cell('fat')).toBe('4.7');
    expect(cell('sodium')).toBe('277');
    expect(cell('cholesterol')).toBe('22');
  });

  it('keeps the stored values when baseServings is 0 (no division by zero)', () => {
    render(<NutritionFacts nutrition={nutrition} baseServings={0} servings={4} lang="fr" />);
    const cell = document.querySelector('[data-nutrient="calories"] td')!.firstChild!.textContent;
    expect(cell).toBe(String(nutrition.calories));
    expect(screen.getByRole('rowheader', { name: 'Protéines' })).toBeInTheDocument();
  });
});
