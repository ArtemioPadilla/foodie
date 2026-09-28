// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { makeIngredient } from '@/tests/fixtures/foodie-domain';
import { categoryClasses } from './CategoryChip';
import { IngredientCard, IngredientCardSkeleton } from './IngredientCard';

/** IngredientCard (roadmap Issue 019; port of legacy `IngredientCard`). */
const pesto = makeIngredient({
  id: 'ing_101',
  name: { en: 'Basil Pesto', es: 'Pesto de Albahaca', fr: 'Pesto au Basilic' },
  category: 'pantry',
  unit: 'tbsp',
  avgPrice: 1.5,
  isComposite: true,
  tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: false, kosher: true, halal: true },
});

describe('IngredientCard', () => {
  it('renders name, category, composite mark, dietary badges and unit price', () => {
    render(<IngredientCard ingredient={pesto} categoryName="Pantry" />);
    const card = screen.getByTestId('ingredient-card');
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Basil Pesto');
    expect(card).toHaveTextContent('Pantry');
    expect(screen.getByTestId('ingredient-composite')).toHaveTextContent('Composite');
    // vegetarian, glutenFree, kosher shown; halal collapsed into "+1".
    expect(within(screen.getByTestId('ingredient-tags')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Vegetarian',
      'Gluten Free',
      'Kosher',
      '+1',
    ]);
    expect(card).toHaveTextContent('$1.50 / tbsp');
    expect(card).toHaveClass(categoryClasses('pantry').stripe);
  });

  it('localises every string', () => {
    render(<IngredientCard ingredient={pesto} lang="es" categoryName="Despensa" showDetails />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Pesto de Albahaca');
    expect(screen.getByTestId('ingredient-composite')).toHaveTextContent('Compuesto');
    expect(screen.getByText('Refrigerar a 4°C o menos')).toBeInTheDocument();
  });

  it('is one stretched link when given an href, with the action above it', () => {
    render(<IngredientCard ingredient={pesto} href="/ingredients/ing_101/" action={<button type="button">pick</button>} selected />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Basil Pesto' })).toHaveAttribute('href', '/ingredients/ing_101/');
    expect(screen.getByRole('button', { name: 'pick' }).parentElement).toHaveClass('z-10');
    expect(screen.getByTestId('ingredient-card')).toHaveAttribute('data-selected', 'true');
  });

  it('renders the category through CategoryChip and a skeleton', () => {
    const { container } = render(<IngredientCard ingredient={pesto} categoryName="Pantry" />);
    expect(container.querySelector('[data-category="pantry"] .bg-food-pantry')).not.toBeNull();
    render(<IngredientCardSkeleton />);
    expect(screen.getByTestId('ingredient-card-skeleton')).toBeInTheDocument();
  });
});
