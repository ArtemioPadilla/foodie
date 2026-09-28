// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeRecipe } from '@/tests/fixtures/foodie-domain';
import { RecipeDetailExtras, RecipeDetailHeader } from './RecipeDetailView';

/**
 * Roadmap Issue 038: the static parts of `/recipes/[id]/`, extracted so the
 * contribute wizard's preview renders the very same markup.
 */
const recipe = makeRecipe({ rating: 4.25, reviewCount: 12, equipment: ['frying-pan'], tips: { en: 'Serve hot.', es: 'Sirve caliente.', fr: 'Servez chaud.' } });

describe('RecipeDetailHeader', () => {
  it('renders the public page header: h1 with its view transition, badges and the meta grid', () => {
    render(<RecipeDetailHeader recipe={recipe} lang="en" cuisineNames={['American', 'Mexican']} mealTypeName="Breakfast" />);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent(recipe.name.en);
    expect(title.style.viewTransitionName).toBe(`recipe-${recipe.id}`);
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
    const meta = screen.getByTestId('recipe-meta');
    expect(within(meta).getByText('American, Mexican')).toBeInTheDocument();
    expect(meta).toHaveTextContent('4.3');
    expect(meta).toHaveTextContent('12 reviews');
    expect(meta.querySelector('[data-time="total"]')).toHaveTextContent(`${recipe.totalTime} min`);
  });

  it('can be nested under another heading without a view transition (preview)', () => {
    render(<RecipeDetailHeader recipe={recipe} lang="es" cuisineNames={[]} mealTypeName="Desayuno" titleAs="h2" viewTransition={false} />);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent(recipe.name.es);
    expect(title.style.viewTransitionName).toBe('');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});

describe('RecipeDetailExtras', () => {
  it('renders tips and humanised equipment', () => {
    render(<RecipeDetailExtras recipe={recipe} lang="fr" />);
    expect(screen.getByText('Servez chaud.')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-equipment')).toHaveTextContent('frying pan');
  });

  it('renders nothing without tips or equipment', () => {
    const { container } = render(<RecipeDetailExtras recipe={{ ...recipe, tips: undefined, equipment: [] }} lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the public page and the wizard preview share these components', () => {
  it.each(['src/components/pages/RecipeDetail.astro', 'src/components/islands/ContributeWizard/PreviewStep.tsx'])('%s', (file) => {
    const source = readFileSync(file, 'utf-8');
    expect(source).toMatch(/<RecipeDetailHeader\b/);
    expect(source).toMatch(/<RecipeDetailExtras\b/);
    expect(source).toMatch(/<RecipeDetailActions\b/);
  });
});
