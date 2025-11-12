# Context & State Management - Foodie PWA

**Last Updated**: 2025-01-10
**Pattern**: React Context API + Custom Hooks
**Status**: Core contexts implemented, needs expansion

---

## Overview

Foodie uses React Context API for global state management. Each context handles a specific domain and provides custom hooks for consumption.

## Architecture

```
App.tsx (Root)
├── ThemeProvider          (UI theme)
├── LanguageProvider       (i18n)
│   ├── AuthProvider       (User authentication)
│   │   ├── AppProvider    (App configuration)
│   │   │   ├── RecipeProvider      (Recipe data & filters)
│   │   │   │   ├── PlannerProvider (Meal planning)
│   │   │   │   │   ├── ShoppingProvider (Shopping lists)
│   │   │   │   │   │   └── {App Components}
```

**Why This Order**: Outer contexts don't depend on inner ones, but inner ones may use outer ones.

---

## Existing Contexts

### 1. ThemeContext (`ThemeContext.tsx`)

**Purpose**: Manage light/dark theme preference

**State**:
```typescript
{
  theme: 'light' | 'dark'
}
```

**Actions**:
- `toggleTheme()` - Switch between light/dark
- `setTheme(theme)` - Set specific theme

**Storage**: `localStorage.theme`

**Usage**:
```typescript
const { theme, toggleTheme } = useTheme();
```

---

### 2. LanguageContext (`LanguageContext.tsx`)

**Purpose**: Handle i18n language switching

**State**:
```typescript
{
  language: string  // 'en' | 'es' | 'fr'
}
```

**Actions**:
- `changeLanguage(lang)` - Switch language
- `getTranslated(text)` - Get translated MultiLangText
- `t(key)` - Translate UI string

**Storage**: `localStorage` (via i18next)

**Usage**:
```typescript
const { language, changeLanguage, getTranslated, t } = useLanguage();

// For UI strings
const title = t('recipe.title');

// For data objects
const recipeName = getTranslated(recipe.name);
```

---

### 3. AuthContext (`AuthContext.tsx`)

**Purpose**: User authentication and session management

**State**:
```typescript
{
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}
```

**Actions**:
- `signIn(email, password)` - Email/password login
- `signUp(email, password, displayName)` - Registration
- `signInWithGoogle()` - Google OAuth
- `signOut()` - Logout

**Storage**: `localStorage.user`

**Current Implementation**: Mock authentication (localStorage only)

**TODO**: Integrate Firebase Auth

**Usage**:
```typescript
const { user, isAuthenticated, signIn, signOut } = useAuth();

if (isAuthenticated) {
  return <UserProfile user={user} />;
}
```

---

### 4. AppContext (`AppContext.tsx`)

**Purpose**: App-wide configuration and PWA state

**State**:
```typescript
{
  config: AppConfig
  isOnline: boolean
  showInstallPrompt: boolean
}
```

**Actions**:
- `installPWA()` - Trigger PWA install
- `dismissInstallPrompt()` - Hide install banner

**Config Includes**:
- Feature flags
- App limits (max servings, etc.)
- Theme colors
- Supported languages

**Usage**:
```typescript
const { config, isOnline, installPWA } = useApp();

if (config.features.offlineMode && !isOnline) {
  return <OfflineIndicator />;
}
```

---

### 5. RecipeContext (`RecipeContext.tsx`)

**Purpose**: Recipe data, filtering, and favorites

**State**:
```typescript
{
  recipes: Recipe[]
  filteredRecipes: Recipe[]
  loading: boolean
  filters: RecipeFilters
  sortBy: SortOption
  favoriteRecipes: string[]
}
```

**Actions**:
- `setFilters(filters)` - Apply filters
- `setSortBy(sort)` - Change sort order
- `getRecipeById(id)` - Get single recipe
- `searchRecipes(query)` - Search by text
- `toggleFavorite(recipeId)` - Add/remove favorite

**Data Source**: `/public/data/recipes.json`

**Storage**:
- Favorites: `localStorage.favoriteRecipes`
- Filters/sort: Ephemeral (not persisted)

**Usage**:
```typescript
const {
  filteredRecipes,
  loading,
  searchRecipes,
  toggleFavorite,
  favoriteRecipes
} = useRecipes();
```

**Filter Types**:
```typescript
interface RecipeFilters {
  search?: string
  type?: string[]          // breakfast, lunch, dinner
  cuisine?: string[]       // mediterranean, mexican, etc.
  dietaryTags?: string[]   // gluten-free, vegan, etc.
  difficulty?: string[]    // easy, medium, hard
  maxPrepTime?: number
  maxCookTime?: number
  ingredients?: string[]
}
```

---

### 6. PlannerContext (`PlannerContext.tsx`)

**Purpose**: Meal planning state and operations

**State**:
```typescript
{
  currentPlan: MealPlan | null
}
```

**Actions**:
- `createPlan(plan)` - Create new meal plan
- `updatePlan(updates)` - Update plan properties
- `addRecipeToPlan(day, mealType, recipeId, servings)` - Add recipe to slot
- `removeRecipeFromPlan(day, mealType)` - Remove recipe
- `savePlan()` - Save to localStorage/cloud
- `loadPlan(planId)` - Load saved plan
- `clearPlan()` - Reset current plan
- `duplicateDay(from, to)` - Copy day's meals
- `adjustGlobalServings(servings)` - Scale all meals

**Storage**:
- Current plan: `localStorage.currentMealPlan`
- Saved plans: `localStorage.savedMealPlans`

**Usage**:
```typescript
const {
  currentPlan,
  addRecipeToPlan,
  savePlan
} = usePlanner();

// Add recipe to Monday breakfast for 2 servings
addRecipeToPlan(0, 'breakfast', 'rec_001', 2);
```

---

### 7. ShoppingContext (`ShoppingContext.tsx`)

**Purpose**: Shopping list generation and management

**State**:
```typescript
{
  shoppingList: ShoppingListItem[]
}
```

**Actions**:
- `addItem(item)` - Add item to list
- `removeItem(ingredientId)` - Remove item
- `toggleItem(ingredientId)` - Check/uncheck
- `updateQuantity(ingredientId, quantity)` - Change amount
- `clearList()` - Clear all items
- `clearChecked()` - Remove checked items
- `generateFromPlan(planId)` - Auto-generate from meal plan
- `exportList(format)` - Export as text/json/csv

**Storage**: `localStorage.shoppingList`

**Features**:
- Smart consolidation (combine same ingredients)
- Unit conversion
- Category grouping
- Checkbox persistence

**Usage**:
```typescript
const {
  shoppingList,
  toggleItem,
  generateFromPlan,
  exportList
} = useShopping();
```

---

## Context Patterns

### Creating a New Context

1. **Define State & Actions**:
```typescript
interface MyContextType {
  data: SomeData[]
  loading: boolean
  addData: (item: SomeData) => void
  removeData: (id: string) => void
}
```

2. **Create Context**:
```typescript
const MyContext = createContext<MyContextType | undefined>(undefined);
```

3. **Create Provider**:
```typescript
export const MyProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SomeData[]>([]);
  const [loading, setLoading] = useState(false);

  const addData = (item: SomeData) => {
    setData(prev => [...prev, item]);
  };

  const removeData = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  return (
    <MyContext.Provider value={{ data, loading, addData, removeData }}>
      {children}
    </MyContext.Provider>
  );
};
```

4. **Create Custom Hook**:
```typescript
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

---

## Performance Optimization

### Prevent Unnecessary Re-renders

**Problem**: All consumers re-render when any state changes

**Solution 1**: Split contexts
```typescript
// Instead of one large context:
<UserContext>  // user + preferences + favorites + history

// Split into multiple:
<UserAuthContext>       // Just auth
<UserPreferencesContext>  // Just preferences
<UserFavoritesContext>   // Just favorites
```

**Solution 2**: Use memo for expensive values
```typescript
const expensiveValue = useMemo(() => {
  return calculateSomething(data);
}, [data]);
```

**Solution 3**: Use callback for functions
```typescript
const handleClick = useCallback(() => {
  doSomething(data);
}, [data]);
```

---

## State Persistence

### localStorage Pattern

```typescript
// Load from storage
const [state, setState] = useState(() => {
  const stored = localStorage.getItem('key');
  return stored ? JSON.parse(stored) : defaultValue;
});

// Save to storage
useEffect(() => {
  localStorage.setItem('key', JSON.stringify(state));
}, [state]);

// Or create a custom hook:
const [value, setValue] = useLocalStorage('key', defaultValue);
```

### Firebase Sync Pattern

```typescript
// Load from Firestore
useEffect(() => {
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', user.id, 'data'),
    (doc) => {
      if (doc.exists()) {
        setState(doc.data());
      }
    }
  );

  return unsubscribe;
}, [user]);

// Save to Firestore
const save = async (data: Data) => {
  if (!user) return;
  await setDoc(doc(db, 'users', user.id, 'data'), data);
};
```

---

## Testing Contexts

### Unit Testing

```typescript
describe('RecipeContext', () => {
  it('provides recipes', () => {
    const { result } = renderHook(() => useRecipes(), {
      wrapper: RecipeProvider,
    });

    expect(result.current.recipes).toBeDefined();
  });

  it('filters recipes by search term', () => {
    const { result } = renderHook(() => useRecipes(), {
      wrapper: RecipeProvider,
    });

    act(() => {
      result.current.searchRecipes('pasta');
    });

    expect(result.current.filteredRecipes.length).toBeLessThan(
      result.current.recipes.length
    );
  });
});
```

### Integration Testing

```typescript
it('adds recipe to meal plan', () => {
  render(
    <RecipeProvider>
      <PlannerProvider>
        <TestComponent />
      </PlannerProvider>
    </RecipeProvider>
  );

  fireEvent.click(screen.getByText('Add to Plan'));

  expect(screen.getByText('Recipe Added')).toBeInTheDocument();
});
```

---

## Common Patterns

### Conditional Rendering Based on Context

```typescript
const { isAuthenticated } = useAuth();

if (!isAuthenticated) {
  return <SignInPrompt />;
}

return <ProtectedContent />;
```

### Loading States

```typescript
const { recipes, loading } = useRecipes();

if (loading) {
  return <LoadingSpinner />;
}

return <RecipeGrid recipes={recipes} />;
```

### Error Handling

```typescript
const { recipes, error } = useRecipes();

if (error) {
  return <ErrorMessage error={error} />;
}
```

---

## Future Enhancements

### 1. Add PantryContext
```typescript
interface PantryContextType {
  items: PantryItem[]
  expiringItems: PantryItem[]
  addItem: (item: PantryItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  getSuggestedRecipes: () => Recipe[]
}
```

### 2. Add NotificationContext
```typescript
interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}
```

### 3. Firebase Real-time Sync
- Sync favorites across devices
- Sync meal plans
- Sync shopping lists
- Collaborative meal planning

---

## Best Practices

1. **One Responsibility**: Each context should handle one domain
2. **Custom Hooks**: Always provide a custom hook
3. **Error Handling**: Throw error if used outside provider
4. **TypeScript**: Fully type all state and actions
5. **Performance**: Split large contexts
6. **Testing**: Test contexts in isolation
7. **Documentation**: Document state shape and actions

---

**For Questions**: See main CLAUDE.md or create GitHub Discussion
