// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { makeRecipe } from '@/tests/fixtures/foodie-domain';
import { RecipeCard, RecipeCardSkeleton } from './RecipeCard';

/**
 * Port of legacy `tests/integration/RecipeCard.test.tsx` (6 tests) onto the
 * domain card of roadmap Issue 017, plus the placeholder art, the list view
 * and the `href` link mode the legacy card did not have.
 *
 * The legacy fixture carried `imageUrl`; the real catalog does not, so the
 * "shows recipe image" case is split in two (image vs placeholder) and the
 * "tags" case becomes the dietary badges the roadmap asks for.
 */
const mockRecipe = makeRecipe({
  id: 'recipe-1',
  name: { en: 'Grilled Chicken', es: 'Pollo a la Parrilla', fr: 'Poulet Grillé' },
  description: { en: 'Delicious grilled chicken breast', es: 'Deliciosa pechuga de pollo', fr: 'Délicieuse poitrine de poulet' },
  type: 'dinner',
  prepTime: 15,
  cookTime: 20,
  totalTime: 35,
  servings: 4,
  difficulty: 'easy',
  tags: ['healthy', 'high-protein', 'low-carb'],
  dietaryLabels: { glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true },
  rating: 4.5,
  reviewCount: 123,
});

describe('RecipeCard (port of legacy RecipeCard.test.tsx)', () => {
  it('renders recipe information', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText('Grilled Chicken')).toBeInTheDocument();
    expect(screen.getByText('Delicious grilled chicken breast')).toBeInTheDocument();
    // Time is rendered as "35 min" in one span
    expect(screen.getByText(/35\s+min/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onClick when clicked (and via keyboard)', () => {
    const handleClick = vi.fn();
    render(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);
    const card = screen.getByTestId('recipe-card');
    expect(card).toHaveAttribute('role', 'button');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('displays recipe rating and review count', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(123)')).toHaveAttribute('aria-label', '123 reviews');
  });

  it('displays dietary badges (max 3 + overflow)', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const badges = within(screen.getByTestId('dietary-badges')).getAllByRole('listitem');
    expect(badges.map((b) => b.textContent)).toEqual(['Gluten Free', 'Dairy Free', 'Low Carb', '+2']);
  });

  it('shows the recipe image lazily when the recipe has one', () => {
    render(<RecipeCard recipe={{ ...mockRecipe, imageUrl: '/images/grilled-chicken.jpg' }} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Grilled Chicken');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('src', '/images/grilled-chicken.jpg');
    expect(screen.queryByTestId('recipe-art-placeholder')).not.toBeInTheDocument();
  });

  it('renders a meal-type placeholder when there is no image', () => {
    render(<RecipeCard recipe={mockRecipe} lang="fr" />);
    const art = screen.getByRole('img');
    expect(art).toHaveAttribute('data-meal-type', 'dinner');
    expect(art).toHaveAttribute('aria-label', 'Pas encore de photo pour Poulet Grillé');
    expect(art.querySelector('svg')).not.toBeNull();
  });

  it('displays difficulty level', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText('Easy')).toHaveAttribute('data-difficulty', 'easy');
  });
});

describe('RecipeCard — Foodie additions', () => {
  it('translates through `lang` (never navigator.language)', () => {
    render(<RecipeCard recipe={mockRecipe} lang="es" />);
    expect(screen.getByText('Pollo a la Parrilla')).toBeInTheDocument();
    expect(screen.getByText('Fácil')).toBeInTheDocument();
    expect(screen.getByText('Sin Gluten')).toBeInTheDocument();
  });

  it('links the title (stretched link) when `href` is given and does not add role=button', () => {
    render(<RecipeCard recipe={mockRecipe} href="/foodie/recipes/recipe-1/" />);
    expect(screen.getByRole('link', { name: 'Grilled Chicken' })).toHaveAttribute('href', '/foodie/recipes/recipe-1/');
    expect(screen.getByTestId('recipe-card')).not.toHaveAttribute('role');
  });

  it('renders the list view with the same data', () => {
    render(<RecipeCard recipe={mockRecipe} view="list" isFavorite />);
    const card = screen.getByTestId('recipe-card');
    expect(card).toHaveAttribute('data-view', 'list');
    expect(within(card).getByText('Grilled Chicken')).toBeInTheDocument();
    expect(within(card).getByText(/35\s+min/)).toBeInTheDocument();
    expect(within(card).getByText('Easy')).toBeInTheDocument();
    expect(within(card).getByTestId('recipe-card-favorite')).toBeInTheDocument();
  });

  it('shows the nutrition footer on demand', () => {
    render(<RecipeCard recipe={mockRecipe} showNutrition />);
    expect(screen.getByText(`${mockRecipe.nutrition.calories}`)).toBeInTheDocument();
    expect(screen.getByText(`${mockRecipe.nutrition.protein}g`)).toBeInTheDocument();
  });

  it('has a skeleton for both views', () => {
    const { rerender } = render(<RecipeCardSkeleton />);
    expect(screen.getByTestId('recipe-card-skeleton')).toBeInTheDocument();
    rerender(<RecipeCardSkeleton view="list" />);
    expect(screen.getByTestId('recipe-card-skeleton')).toBeInTheDocument();
  });
});

describe('RecipeCard — FavoriteButton (roadmap #020)', () => {
  it('renders the interactive button above the stretched link instead of the read-only heart', () => {
    render(<RecipeCard recipe={mockRecipe} href="/recipes/recipe-1/" showFavoriteButton isFavorite />);
    const button = screen.getByRole('button', { name: 'Favorite: Grilled Chicken' });
    expect(button.parentElement).toHaveClass('z-10');
    expect(screen.queryByTestId('recipe-card-favorite')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('keeps the read-only heart for static renders', () => {
    render(<RecipeCard recipe={mockRecipe} isFavorite />);
    expect(screen.getByTestId('recipe-card-favorite')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
