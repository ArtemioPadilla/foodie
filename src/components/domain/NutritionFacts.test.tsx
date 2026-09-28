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
});
