import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { RecipeCard } from '@components/recipe/RecipeCard';
import { mockRecipe } from '../mocks/mockData';

describe('RecipeCard Integration', () => {
  it('renders recipe information', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    expect(screen.getByText(mockRecipe.name.en)).toBeInTheDocument();
    expect(screen.getByText(`${mockRecipe.prepTime + mockRecipe.cookTime} min`)).toBeInTheDocument();
    expect(screen.getByText(`${mockRecipe.servings} servings`)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);

    const card = screen.getByRole('article');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('displays recipe rating', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText(mockRecipe.rating.toString())).toBeInTheDocument();
  });

  it('displays dietary labels', () => {
    const glutenFreeRecipe = {
      ...mockRecipe,
      dietaryLabels: { ...mockRecipe.dietaryLabels, glutenFree: true },
    };

    render(<RecipeCard recipe={glutenFreeRecipe} />);
    // Should have gluten-free badge
    expect(screen.getByText(/gluten/i)).toBeInTheDocument();
  });

  it('shows recipe image', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', mockRecipe.name.en);
  });

  it('displays difficulty level', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText(mockRecipe.difficulty)).toBeInTheDocument();
  });
});
