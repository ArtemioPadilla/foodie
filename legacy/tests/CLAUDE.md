# Testing Strategy - Foodie PWA

**Last Updated**: 2025-01-10
**Testing Framework**: Vitest + React Testing Library + Playwright
**Coverage Goal**: 80%+
**Status**: Not yet implemented

---

## Testing Philosophy

1. **Test behavior, not implementation**
2. **User-centric tests** (what users see and do)
3. **Confidence over coverage** (meaningful tests)
4. **Fast feedback loop** (quick to run)

---

## Test Types

### Unit Tests (Vitest)

**Purpose**: Test individual functions, hooks, and utilities

**What to Test**:
- Pure utility functions
- Custom hooks
- Helper functions
- Calculations and conversions
- Validation logic

**Example**:
```typescript
// tests/unit/utils/unitConversions.test.ts
import { convertUnit, formatQuantity } from '@utils/unitConversions';

describe('unitConversions', () => {
  describe('convertUnit', () => {
    it('converts cups to ml', () => {
      expect(convertUnit(1, 'cup', 'ml')).toBe(240);
    });

    it('converts tbsp to tsp', () => {
      expect(convertUnit(1, 'tbsp', 'tsp')).toBe(3);
    });
  });

  describe('formatQuantity', () => {
    it('formats 1.5 as "1 ½"', () => {
      expect(formatQuantity(1.5)).toBe('1 ½');
    });

    it('formats 0.25 as "¼"', () => {
      expect(formatQuantity(0.25)).toBe('¼');
    });
  });
});
```

### Integration Tests (React Testing Library)

**Purpose**: Test component interactions and flows

**What to Test**:
- Component rendering
- User interactions (clicks, typing, etc.)
- State changes
- Context integration
- Form submissions

**Example**:
```typescript
// tests/integration/RecipesPage.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { RecipeProvider } from '@contexts/RecipeContext';
import RecipesPage from '@pages/RecipesPage';

describe('RecipesPage', () => {
  it('displays recipes', async () => {
    render(
      <RecipeProvider>
        <RecipesPage />
      </RecipeProvider>
    );

    expect(await screen.findByText('Scrambled Eggs')).toBeInTheDocument();
  });

  it('filters recipes when searching', async () => {
    render(
      <RecipeProvider>
        <RecipesPage />
      </RecipeProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search recipes...');
    await userEvent.type(searchInput, 'pasta');

    expect(screen.queryByText('Scrambled Eggs')).not.toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

**Purpose**: Test complete user journeys

**What to Test**:
- Critical user flows
- Multi-page interactions
- Real browser behavior
- Mobile responsiveness

**Example**:
```typescript
// tests/e2e/meal-planning.spec.ts
import { test, expect } from '@playwright/test';

test('create meal plan', async ({ page }) => {
  await page.goto('/');

  // Navigate to planner
  await page.click('text=Meal Planner');
  await expect(page).toHaveURL('/planner');

  // Create new plan
  await page.click('text=Create New Plan');
  await page.fill('input[name="planName"]', 'My Weekly Plan');
  await page.click('text=Create');

  // Verify plan created
  await expect(page.locator('text=My Weekly Plan')).toBeVisible();
});
```

---

## Test Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── unitConversions.test.ts
│   │   ├── calculations.test.ts
│   │   └── formatting.test.ts
│   ├── services/
│   │   ├── recipeService.test.ts
│   │   └── plannerService.test.ts
│   └── hooks/
│       ├── useDebounce.test.ts
│       └── useLocalStorage.test.ts
├── integration/
│   ├── RecipesPage.test.tsx
│   ├── RecipeDetailPage.test.tsx
│   ├── PlannerPage.test.tsx
│   └── ShoppingListPage.test.tsx
└── e2e/
    ├── meal-planning-flow.spec.ts
    ├── recipe-contribution.spec.ts
    └── shopping-list.spec.ts
```

---

## Testing Tools

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
});
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

---

## Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('adds recipe to favorites', () => {
  // Arrange
  const { result } = renderHook(() => useRecipes());

  // Act
  act(() => {
    result.current.toggleFavorite('rec_001');
  });

  // Assert
  expect(result.current.favoriteRecipes).toContain('rec_001');
});
```

### 2. Test User Behavior

```typescript
// ✅ Good - tests user behavior
it('shows error when form is submitted empty', async () => {
  render(<RecipeForm />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

// ❌ Bad - tests implementation
it('sets error state when name is empty', () => {
  const { result } = renderHook(() => useRecipeForm());
  result.current.setName('');
  expect(result.current.errors.name).toBe('Name is required');
});
```

### 3. Use Data-Testid Sparingly

```typescript
// ✅ Good - use semantic queries
screen.getByRole('button', { name: /add to cart/i });
screen.getByLabelText(/email address/i);
screen.getByText(/welcome/i);

// ⚠️ OK - when no semantic option
screen.getByTestId('custom-component');

// ❌ Bad - overuse of testid
screen.getByTestId('button');
screen.getByTestId('input');
```

### 4. Mock External Dependencies

```typescript
// Mock fetch
global.fetch = vi.fn();

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// Mock router
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test RecipesPage.test.tsx

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E in headed mode
npm run test:e2e -- --headed
```

---

## Coverage Goals

| Type | Goal |
|------|------|
| Utils | 95%+ |
| Services | 85%+ |
| Components | 80%+ |
| E2E | Critical paths |

---

**For Questions**: See main CLAUDE.md
