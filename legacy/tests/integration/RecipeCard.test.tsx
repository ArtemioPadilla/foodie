import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { RecipeCard } from '@components/recipe/RecipeCard';
import { mockRecipe } from '../mocks/mockData';

describe('RecipeCard Integration', () => {
  it('renders recipe information', () => {
    render(<RecipeCard recipe={mockRecipe} />);

    expect(screen.getByText(mockRecipe.name.en)).toBeInTheDocument();
    // Time is rendered as "35 min" combined in a span
    expect(screen.getByText(/35\s+min/)).toBeInTheDocument();
    expect(screen.getByText(mockRecipe.servings.toString())).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);

    // Click the card container (first child of the render)
    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('displays recipe rating', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText(mockRecipe.rating.toString())).toBeInTheDocument();
  });

  it('displays recipe tags', () => {
    const taggedRecipe = {
      ...mockRecipe,
      tags: ['healthy', 'quick', 'easy'],
    };

    render(<RecipeCard recipe={taggedRecipe} />);
    // Should display at least one tag
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('shows recipe image', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', mockRecipe.name.en);
  });

  it('displays difficulty level', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    // Difficulty is translated via i18n (recipe.difficulty_easy -> "Easy")
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });
});
