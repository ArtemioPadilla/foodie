# Testing Guide

Complete guide to testing Foodie PWA with Vitest, React Testing Library, and Playwright.

---

## Testing Philosophy

- **Test behavior, not implementation**
- **Write tests that give confidence**
- **Keep tests simple and readable**
- **Test critical paths thoroughly**

---

## Running Tests

```bash
# All unit tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e -- --ui

# Specific test file
npm test -- RecipeCard.test.tsx
```

---

## Unit Testing (Vitest)

### Setup

Already configured in `vitest.config.ts`.

### Example: Testing a Component

```typescript
// tests/unit/RecipeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { mockRecipe } from '../mocks/recipes';

describe('RecipeCard', () => {
  it('renders recipe name', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText(mockRecipe.name.en)).toBeInTheDocument();
  });

  it('shows prep time', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<RecipeCard recipe={mockRecipe} onClick={onClick} />);

    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith(mockRecipe.id);
  });

  it('shows favorite icon when favorited', () => {
    render(<RecipeCard recipe={mockRecipe} isFavorite={true} />);
    expect(screen.getByLabelText(/favorited/i)).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
// tests/unit/useRecipeFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import { mockRecipes } from '../mocks/recipes';

describe('useRecipeFilters', () => {
  it('filters by search query', () => {
    const { result } = renderHook(() => useRecipeFilters(mockRecipes));

    act(() => {
      result.current.setSearchQuery('eggs');
    });

    expect(result.current.filteredRecipes).toHaveLength(3);
    expect(result.current.filteredRecipes[0].name.en).toContain('Egg');
  });

  it('filters by meal type', () => {
    const { result } = renderHook(() => useRecipeFilters(mockRecipes));

    act(() => {
      result.current.setMealType('breakfast');
    });

    expect(result.current.filteredRecipes.every(r => r.type === 'breakfast')).toBe(true);
  });
});
```

### Testing Context

```typescript
// tests/unit/RecipeContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { RecipeProvider, useRecipes } from '@/contexts/RecipeContext';

function TestComponent() {
  const { recipes, loading } = useRecipes();
  if (loading) return <div>Loading...</div>;
  return <div>{recipes.length} recipes</div>;
}

describe('RecipeContext', () => {
  it('provides recipes to children', async () => {
    render(
      <RecipeProvider>
        <TestComponent />
      </RecipeProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/\d+ recipes/)).toBeInTheDocument();
    });
  });
});
```

---

## Integration Testing

### Testing User Flows

```typescript
// tests/integration/meal-planner-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '@/App';

describe('Meal Planner Flow', () => {
  it('allows user to create a meal plan', async () => {
    render(<App />);

    // Navigate to meal planner
    fireEvent.click(screen.getByText(/meal planner/i));

    // Create new plan
    fireEvent.click(screen.getByText(/create new plan/i));

    // Fill out form
    fireEvent.change(screen.getByLabelText(/plan name/i), {
      target: { value: 'My Test Plan' },
    });

    fireEvent.change(screen.getByLabelText(/servings/i), {
      target: { value: '4' },
    });

    // Submit
    fireEvent.click(screen.getByText(/save plan/i));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('My Test Plan')).toBeInTheDocument();
    });
  });
});
```

---

## E2E Testing (Playwright)

### Setup

```bash
# Install Playwright
npx playwright install
```

### Example: Recipe Search Flow

```typescript
// tests/e2e/recipe-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Recipe Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('user can search for recipes', async ({ page }) => {
    // Navigate to recipes page
    await page.click('text=Recipes');

    // Enter search query
    await page.fill('input[placeholder*="Search"]', 'eggs');

    // Wait for results
    await page.waitForSelector('[data-testid="recipe-card"]');

    // Verify results contain "eggs"
    const recipes = await page.locator('[data-testid="recipe-card"]').all();
    expect(recipes.length).toBeGreaterThan(0);

    const firstRecipe = await page.locator('[data-testid="recipe-card"]').first();
    await expect(firstRecipe).toContainText(/egg/i);
  });

  test('user can filter by meal type', async ({ page }) => {
    await page.click('text=Recipes');

    // Open filter dropdown
    await page.click('text=Filter by meal type');

    // Select breakfast
    await page.click('text=Breakfast');

    // Verify only breakfast recipes shown
    const recipes = await page.locator('[data-testid="recipe-card"]').all();
    for (const recipe of recipes) {
      const badge = recipe.locator('[data-testid="meal-type-badge"]');
      await expect(badge).toHaveText('Breakfast');
    }
  });

  test('user can view recipe details', async ({ page }) => {
    await page.click('text=Recipes');

    // Click first recipe
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Verify detail page loaded
    await expect(page).toHaveURL(/\/recipes\/\w+/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="ingredients-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="instructions-list"]')).toBeVisible();
  });
});
```

### Example: Meal Planning Flow

```typescript
// tests/e2e/meal-planner.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Meal Planner', () => {
  test('user can create and save a meal plan', async ({ page }) => {
    await page.goto('http://localhost:5173/planner');

    // Create new plan
    await page.click('text=Create New Plan');

    // Fill out plan details
    await page.fill('input[name="planName"]', 'Week 1');
    await page.fill('input[name="servings"]', '4');

    // Drag a recipe to Monday breakfast
    const recipe = page.locator('[data-testid="recipe-card"]').first();
    const dropZone = page.locator('[data-drop-zone="monday-breakfast"]');

    await recipe.dragTo(dropZone);

    // Save plan
    await page.click('text=Save Plan');

    // Verify success message
    await expect(page.locator('text=Plan saved successfully')).toBeVisible();
  });
});
```

---

## Mocking

### Mock Data

```typescript
// tests/mocks/recipes.ts
import { Recipe } from '@/types';

export const mockRecipe: Recipe = {
  id: 'test-recipe-1',
  name: {
    en: 'Test Recipe',
    es: 'Receta de Prueba',
    fr: 'Recette de Test',
  },
  description: {
    en: 'A test recipe',
    es: 'Una receta de prueba',
    fr: 'Une recette de test',
  },
  type: 'breakfast',
  cuisine: ['american'],
  prepTime: 10,
  cookTime: 15,
  totalTime: 25,
  servings: 2,
  difficulty: 'easy',
  tags: ['quick', 'healthy'],
  // ... rest of fields
};

export const mockRecipes: Recipe[] = [mockRecipe, /* more recipes */];
```

### Mock Services

```typescript
// tests/mocks/recipeService.ts
import { vi } from 'vitest';

export const mockRecipeService = {
  getRecipes: vi.fn().mockResolvedValue(mockRecipes),
  getRecipeById: vi.fn().mockResolvedValue(mockRecipe),
  searchRecipes: vi.fn().mockResolvedValue(mockRecipes),
};
```

### Mock Contexts

```typescript
// tests/utils/test-utils.tsx
import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { RecipeProvider } from '@/contexts/RecipeContext';

export function renderWithProviders(ui: ReactNode) {
  return render(
    <RecipeProvider>
      {ui}
    </RecipeProvider>
  );
}
```

---

## Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Open coverage report
open coverage/index.html
```

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Scheduled nightly builds

See `.github/workflows/test.yml` for configuration.

---

## Best Practices

### Do's

✅ Test user-facing behavior
✅ Use semantic queries (`getByRole`, `getByLabelText`)
✅ Test accessibility
✅ Mock external dependencies
✅ Keep tests focused and simple
✅ Use descriptive test names

### Don'ts

❌ Test implementation details
❌ Use fragile selectors (class names, IDs)
❌ Write tests that depend on each other
❌ Test third-party libraries
❌ Over-mock (mock only what's necessary)

---

## Next Steps

- [Development Guide](development.md) - Build new features
- [API Reference](../reference/api.md) - Understand the API
- [Contributing Guide](../contributing/guide.md) - Contribute code

---

**Test with Confidence! ✅**
