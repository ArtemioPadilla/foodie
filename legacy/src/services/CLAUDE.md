# Services Layer - Foodie PWA

**Last Updated**: 2025-01-10
**Purpose**: Business logic and external API integration
**Status**: Not yet implemented

---

## Overview

The services layer contains business logic that's more complex than utility functions. Services can have side effects, make API calls, and handle async operations.

## Architecture

```
Components → Services → External APIs
          ↓
        Contexts (State Management)
```

**Services Don't**:
- Directly manipulate React state
- Import React hooks
- Render UI

**Services Do**:
- Make API calls
- Transform data
- Handle complex business logic
- Interact with localStorage, Firebase, GitHub, etc.

---

## Planned Services

### recipeService.ts ❌

**Purpose**: Recipe CRUD operations

```typescript
export const recipeService = {
  getAll: (): Promise<Recipe[]>
  getById: (id: string): Promise<Recipe>
  search: (query: string, filters?: RecipeFilters): Promise<Recipe[]>
  create: (recipe: Recipe): Promise<Recipe>
  update: (id: string, updates: Partial<Recipe>): Promise<Recipe>
  delete: (id: string): Promise<void>
  rate: (id: string, rating: number): Promise<void>
  addReview: (id: string, review: RecipeReview): Promise<void>
}
```

### plannerService.ts ❌

**Purpose**: Meal planning operations

```typescript
export const plannerService = {
  create: (plan: MealPlan): Promise<MealPlan>
  save: (plan: MealPlan): Promise<void>
  load: (id: string): Promise<MealPlan>
  share: (id: string): Promise<{ token: string, url: string }>
  duplicate: (id: string): Promise<MealPlan>
  export: (id: string, format: 'pdf' | 'json'): Promise<Blob>
}
```

### shoppingService.ts ❌

**Purpose**: Shopping list generation

```typescript
export const shoppingService = {
  generateFromPlan: (planId: string): Promise<ShoppingListItem[]>
  consolidateItems: (items: ShoppingListItem[]): ShoppingListItem[]
  groupByCategory: (items: ShoppingListItem[]): Record<string, ShoppingListItem[]>
  export: (items: ShoppingListItem[], format: 'text' | 'csv' | 'json'): string
  shareViaWhatsApp: (items: ShoppingListItem[]): void
}
```

### firebaseService.ts ❌

**Purpose**: Firebase integration

```typescript
export const firebaseService = {
  auth: {
    signIn: (email: string, password: string)
    signUp: (email: string, password: string)
    signInWithGoogle: ()
    signOut: ()
  },
  db: {
    saveUserData: (userId: string, data: any)
    getUserData: (userId: string)
    syncFavorites: (userId: string, favorites: string[])
    syncMealPlans: (userId: string, plans: MealPlan[])
  },
  storage: {
    uploadImage: (file: File, path: string)
    deleteImage: (path: string)
  }
}
```

### githubService.ts ❌

**Purpose**: GitHub API for recipe contributions

```typescript
export const githubService = {
  authenticate: (token: string): Promise<void>
  forkRepository: (owner: string, repo: string): Promise<Fork>
  createBranch: (fork: Fork, branchName: string): Promise<Branch>
  commitRecipe: (branch: Branch, recipe: Recipe): Promise<Commit>
  createPullRequest: (branch: Branch, recipe: Recipe): Promise<PullRequest>
}
```

### authService.ts ❌

**Purpose**: Authentication wrapper

```typescript
export const authService = {
  getCurrentUser: (): Promise<User | null>
  login: (email: string, password: string): Promise<User>
  logout: (): Promise<void>
  refreshToken: (): Promise<string>
  checkAuth: (): boolean
}
```

### storageService.ts ❌

**Purpose**: Persistent storage wrapper

```typescript
export const storageService = {
  local: {
    set: <T>(key: string, value: T): void
    get: <T>(key: string, defaultValue?: T): T | null
    remove: (key: string): void
    clear: (): void
  },
  session: {
    // Same as local but sessionStorage
  },
  sync: {
    toCloud: (data: any): Promise<void>
    fromCloud: (): Promise<any>
  }
}
```

---

## Service Patterns

### Error Handling

```typescript
export const recipeService = {
  async getById(id: string): Promise<Recipe> {
    try {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) {
        throw new Error(`Recipe not found: ${id}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
      throw error; // Re-throw for caller to handle
    }
  }
}
```

### Caching

```typescript
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const recipeService = {
  async getById(id: string): Promise<Recipe> {
    const cached = cache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const recipe = await fetchRecipe(id);
    cache.set(id, { data: recipe, timestamp: Date.now() });
    return recipe;
  }
}
```

### Retry Logic

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === maxRetries - 1) throw new Error('Max retries reached');
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}
```

---

## Testing Services

### Mock External Dependencies

```typescript
// tests/unit/services/recipeService.test.ts
import { recipeService } from '@services/recipeService';

// Mock fetch
global.fetch = vi.fn();

describe('recipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recipe by ID', async () => {
    const mockRecipe = { id: '123', name: 'Test Recipe' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRecipe,
    });

    const recipe = await recipeService.getById('123');
    expect(recipe).toEqual(mockRecipe);
    expect(global.fetch).toHaveBeenCalledWith('/api/recipes/123');
  });

  it('throws error when recipe not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    await expect(recipeService.getById('999')).rejects.toThrow();
  });
});
```

---

**For Questions**: See main CLAUDE.md
