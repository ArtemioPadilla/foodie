# Development Guide

Complete guide for developing new features and contributing code to Foodie PWA.

---

## Development Workflow

### 1. Setup Development Environment

See [Installation Guide](../getting-started/installation.md) for initial setup.

### 2. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Development Loop

```bash
# Start dev server
npm run dev

# Open http://localhost:5173

# Make changes → Save → See instant updates (HMR)
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# E2E tests
npm run test:e2e
```

### 5. Lint and Format

```bash
# Check linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format with Prettier (if configured)
npm run format
```

### 6. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add recipe scaling feature"
```

### 7. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Open PR on GitHub
```

---

## Project Structure

```
foodie/
├── public/                  # Static assets
│   ├── images/             # Images (recipes, icons, etc.)
│   ├── locales/            # Translation files
│   └── manifest.webmanifest
├── src/
│   ├── components/         # React components
│   │   ├── common/        # Reusable UI components
│   │   ├── recipe/        # Recipe-related components
│   │   ├── planner/       # Meal planner components
│   │   ├── shopping/      # Shopping list components
│   │   ├── pantry/        # Pantry management
│   │   ├── contribute/    # Recipe contribution wizard
│   │   ├── auth/          # Authentication components
│   │   └── layout/        # Header, Footer, etc.
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components (routes)
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   ├── types/             # TypeScript definitions
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── i18n.ts            # i18next config
├── tests/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                   # MkDocs documentation
├── scripts/                # Build and utility scripts
├── .github/workflows/      # CI/CD pipelines
└── package.json
```

---

## Adding a New Feature

### Example: Add Recipe Timer

#### 1. Create Component

```typescript
// src/components/recipe/RecipeTimer.tsx
import { useState, useEffect } from 'react';

interface RecipeTimerProps {
  duration: number; // minutes
  onComplete?: () => void;
}

export function RecipeTimer({ duration, onComplete }: RecipeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // convert to seconds
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recipe-timer">
      <div className="text-4xl font-bold">{formatTime(timeLeft)}</div>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => setTimeLeft(duration * 60)}>Reset</button>
    </div>
  );
}
```

#### 2. Add Tests

```typescript
// tests/unit/RecipeTimer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecipeTimer } from '@/components/recipe/RecipeTimer';

describe('RecipeTimer', () => {
  it('displays initial time correctly', () => {
    render(<RecipeTimer duration={5} />);
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('counts down when started', async () => {
    render(<RecipeTimer duration={1} />);
    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(screen.getByText('0:59')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('calls onComplete when timer finishes', async () => {
    const onComplete = vi.fn();
    render(<RecipeTimer duration={0.01} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Start'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
```

#### 3. Export Component

```typescript
// src/components/recipe/index.ts
export { RecipeTimer } from './RecipeTimer';
```

#### 4. Use in Parent Component

```typescript
// src/pages/RecipeDetailPage.tsx
import { RecipeTimer } from '@/components/recipe';

function RecipeDetailPage() {
  return (
    <div>
      {/* Other recipe details */}
      <RecipeTimer duration={recipe.cookTime} />
    </div>
  );
}
```

---

## Component Patterns

### Container/Presentational Pattern

**Container** (logic):
```typescript
// RecipeListContainer.tsx
import { useRecipes } from '@/contexts/RecipeContext';
import { RecipeList } from './RecipeList';

export function RecipeListContainer() {
  const { recipes, loading, error } = useRecipes();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return <RecipeList recipes={recipes} />;
}
```

**Presentational** (UI):
```typescript
// RecipeList.tsx
import { Recipe } from '@/types';

interface RecipeListProps {
  recipes: Recipe[];
}

export function RecipeList({ recipes }: RecipeListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
```

### Custom Hook Pattern

```typescript
// hooks/useRecipeFilters.ts
import { useState, useMemo } from 'react';
import { Recipe } from '@/types';

export function useRecipeFilters(recipes: Recipe[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mealType, setMealType] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.en.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMealType = !mealType || recipe.type === mealType;
      const matchesCuisine = !cuisine || recipe.cuisine.includes(cuisine);

      return matchesSearch && matchesMealType && matchesCuisine;
    });
  }, [recipes, searchQuery, mealType, cuisine]);

  return {
    filteredRecipes,
    searchQuery,
    setSearchQuery,
    mealType,
    setMealType,
    cuisine,
    setCuisine,
  };
}
```

---

## State Management

### Context Pattern

**1. Create Context:**
```typescript
// contexts/CartContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
  id: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (id: string, quantity: number) => {
    setItems((prev) => [...prev, { id, quantity }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

**2. Provide Context:**
```typescript
// App.tsx
import { CartProvider } from './contexts/CartContext';

function App() {
  return (
    <CartProvider>
      {/* Rest of app */}
    </CartProvider>
  );
}
```

**3. Use Context:**
```typescript
// components/AddToCartButton.tsx
import { useCart } from '@/contexts/CartContext';

function AddToCartButton({ productId }: { productId: string }) {
  const { addItem } = useCart();

  return (
    <button onClick={() => addItem(productId, 1)}>
      Add to Cart
    </button>
  );
}
```

---

## Styling with Tailwind

### Utility Classes

```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-2xl font-bold text-gray-800">Title</h2>
  <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
    Click Me
  </button>
</div>
```

### Responsive Design

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Grid adapts to screen size */}
</div>
```

### Dark Mode

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Adapts to dark mode */}
</div>
```

### Custom Classes (if needed)

```css
/* styles/custom.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors;
  }
}
```

---

## Internationalization

### Add New Translation

**1. Update Translation Files:**
```json
// public/locales/en/translation.json
{
  "recipe": {
    "timer": {
      "start": "Start Timer",
      "pause": "Pause",
      "reset": "Reset"
    }
  }
}
```

**2. Use in Component:**
```typescript
import { useTranslation } from 'react-i18next';

function RecipeTimer() {
  const { t } = useTranslation();

  return (
    <div>
      <button>{t('recipe.timer.start')}</button>
      <button>{t('recipe.timer.pause')}</button>
      <button>{t('recipe.timer.reset')}</button>
    </div>
  );
}
```

### Handle Multilingual Data

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function RecipeName({ recipe }: { recipe: Recipe }) {
  const { getTranslated } = useLanguage();

  return <h1>{getTranslated(recipe.name)}</h1>;
}
```

---

## API Integration

### Service Layer

```typescript
// services/apiService.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
  if (!response.ok) {
    throw new Error('Failed to fetch recipes');
  }
  return response.json();
}

export async function createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
  const response = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  });
  if (!response.ok) {
    throw new Error('Failed to create recipe');
  }
  return response.json();
}
```

### Use in Component

```typescript
import { useState, useEffect } from 'react';
import { fetchRecipes } from '@/services/apiService';

function RecipesList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return <RecipeList recipes={recipes} />;
}
```

---

## Best Practices

### TypeScript

✅ **Do:**
```typescript
interface UserProps {
  name: string;
  age: number;
  email?: string;
}

function User({ name, age, email }: UserProps) {
  return <div>{name}, {age}</div>;
}
```

❌ **Don't:**
```typescript
function User(props: any) {
  return <div>{props.name}</div>;
}
```

### React Hooks

✅ **Do:**
```typescript
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, [dependency]);
```

❌ **Don't:**
```typescript
useEffect(() => {
  subscribe();
  // Missing cleanup and dependencies
});
```

### Error Handling

✅ **Do:**
```typescript
try {
  await saveData(data);
  showToast('Saved successfully', 'success');
} catch (error) {
  console.error('Save failed:', error);
  showToast('Failed to save', 'error');
}
```

❌ **Don't:**
```typescript
await saveData(data); // No error handling
```

---

## Debugging

### React DevTools

1. Install React DevTools browser extension
2. Open DevTools → React tab
3. Inspect component props and state

### Console Logging

```typescript
console.log('Recipe:', recipe);
console.table(recipes);
console.error('Error:', error);
```

### Network Tab

- Check API requests/responses
- View timing information
- Inspect headers and payloads

### Breakpoints

```typescript
function processRecipe(recipe: Recipe) {
  debugger; // Execution will pause here
  // ...process recipe
}
```

---

## Performance Optimization

### Memo Components

```typescript
import { memo } from 'react';

export const RecipeCard = memo(({ recipe }: { recipe: Recipe }) => {
  return <div>{recipe.name.en}</div>;
});
```

### useMemo for Expensive Calculations

```typescript
const sortedRecipes = useMemo(() => {
  return recipes.sort((a, b) => b.rating - a.rating);
}, [recipes]);
```

### useCallback for Functions

```typescript
const handleClick = useCallback(() => {
  onClick(recipe.id);
}, [recipe.id, onClick]);
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const RecipeDetail = lazy(() => import('./pages/RecipeDetailPage'));

function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RecipeDetail />
    </Suspense>
  );
}
```

---

## Next Steps

- [Testing Guide](testing.md) - Write tests for your code
- [API Reference](../reference/api.md) - API documentation
- [Code Style Guide](../contributing/code-style.md) - Coding standards

---

**Happy Developing! 🚀**
