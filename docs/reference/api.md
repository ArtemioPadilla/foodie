# API Reference

Complete API documentation for Foodie PWA, including TypeScript types, services, contexts, and hooks.

---

## Table of Contents

- [Type Definitions](#type-definitions)
- [Services](#services)
- [Contexts & Hooks](#contexts--hooks)
- [Utility Functions](#utility-functions)

---

## Type Definitions

### Core Types

#### MultiLangText

Multilingual text support for EN/ES/FR:

```typescript
interface MultiLangText {
  en: string;
  es: string;
  fr: string;
}
```

**Usage:**
```typescript
const recipeName: MultiLangText = {
  en: "Scrambled Eggs",
  es: "Huevos Revueltos",
  fr: "Œufs Brouillés"
};
```

---

### Recipe Types

#### Recipe

Main recipe interface:

```typescript
interface Recipe {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  type: string;                     // breakfast, lunch, dinner, snack, dessert
  cuisine: string[];                // mediterranean, mexican, asian, etc.
  prepTime: number;                 // minutes
  cookTime: number;                 // minutes
  totalTime: number;                // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  dietaryLabels: DietaryLabels;
  nutrition: NutritionInfo;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  tips?: MultiLangText;
  equipment: string[];
  imageUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  author?: string;
  dateAdded: string;                // ISO 8601
  rating: number;                   // 0-5
  reviewCount: number;
  variations?: RecipeVariation[];
}
```

#### RecipeIngredient

Ingredient within a recipe:

```typescript
interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;                     // cup, tbsp, piece, etc.
  preparation?: string;             // diced, minced, etc.
  notes?: MultiLangText;
  optional: boolean;
}
```

#### RecipeInstruction

Step-by-step instruction:

```typescript
interface RecipeInstruction {
  step: number;
  text: MultiLangText;
  time?: number;                    // minutes
  image?: string;
}
```

#### NutritionInfo

Nutritional information per serving:

```typescript
interface NutritionInfo {
  servingSize: string;
  calories: number;
  protein: number;                  // grams
  carbs: number;                    // grams
  fat: number;                      // grams
  fiber: number;                    // grams
  sugar: number;                    // grams
  sodium: number;                   // mg
  cholesterol: number;              // mg
}
```

#### DietaryLabels

Dietary restriction flags:

```typescript
interface DietaryLabels {
  glutenFree: boolean;
  vegetarian: boolean;
  vegan: boolean;
  dairyFree: boolean;
  lowCarb: boolean;
  keto: boolean;
  paleo: boolean;
  whole30?: boolean;
}
```

---

### Ingredient Types

#### Ingredient

Base ingredient definition:

```typescript
interface Ingredient {
  id: string;
  name: MultiLangText;
  category: string;                 // protein, vegetables, dairy, etc.
  unit: string;
  avgPrice: number;
  currency: string;
  region: string;
  tags: {
    glutenFree: boolean;
    vegan: boolean;
    vegetarian: boolean;
    dairyFree: boolean;
    nutFree: boolean;
    kosher: boolean;
    halal: boolean;
  };
  alternatives: string[];
  seasonality: string[];
  storageInstructions: MultiLangText;
}
```

---

### Meal Planning Types

#### MealPlan

Complete meal plan:

```typescript
interface MealPlan {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  cuisine?: string;
  servings: number;
  dietaryRestrictions: string[];
  difficulty: string;
  estimatedCost: number;
  currency: string;
  days: PlanDay[];
  shoppingList?: string;
  prepInstructions?: MultiLangText;
  tags: string[];
  author?: string;
  isPublic: boolean;
  shareToken?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

#### PlanDay

Single day in a meal plan:

```typescript
interface PlanDay {
  dayNumber: number;
  dayName: string;
  meals: DayMeals;
  notes?: MultiLangText;
}
```

#### DayMeals

Meals for a single day:

```typescript
interface DayMeals {
  breakfast?: MealSlot;
  lunch?: MealSlot;
  dinner?: MealSlot;
  snacks?: MealSlot[];
}
```

#### MealSlot

Recipe assigned to a meal:

```typescript
interface MealSlot {
  recipeId: string;
  servings: number;
}
```

---

### Shopping List Types

#### ShoppingListItem

Single shopping list item:

```typescript
interface ShoppingListItem {
  ingredientId: string;
  quantity: number;
  unit: string;
  checked: boolean;
  usedIn: string[];                // Recipe IDs using this ingredient
  notes?: string;
  category?: string;
}
```

---

### User Types

#### User

User profile:

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: UserPreferences;
  favoriteRecipes: string[];
  createdAt: string;
}
```

#### UserPreferences

User preferences:

```typescript
interface UserPreferences {
  language: string;                // en, es, fr
  theme: string;                   // light, dark
  defaultServings: number;
  dietaryRestrictions: string[];
  allergies: string[];
  excludedIngredients: string[];
}
```

---

### Pantry Types

#### PantryItem

Item in user's pantry:

```typescript
interface PantryItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  addedAt: string;
  location?: string;
}
```

---

## Services

### recipeService

Recipe operations:

```typescript
// Get all recipes
function getRecipes(): Promise<Recipe[]>

// Get recipe by ID
function getRecipeById(id: string): Promise<Recipe | null>

// Search recipes
function searchRecipes(query: string): Promise<Recipe[]>

// Filter recipes
function filterRecipes(filters: RecipeFilters): Promise<Recipe[]>

// Add recipe to favorites
function addToFavorites(recipeId: string): Promise<void>

// Remove from favorites
function removeFromFavorites(recipeId: string): Promise<void>

// Get favorite recipes
function getFavoriteRecipes(): Promise<Recipe[]>

// Rate recipe
function rateRecipe(recipeId: string, rating: number): Promise<void>
```

**Example:**
```typescript
import { getRecipes, searchRecipes } from '@/services/recipeService';

// Get all recipes
const allRecipes = await getRecipes();

// Search for egg recipes
const eggRecipes = await searchRecipes('eggs');
```

### shoppingService

Shopping list generation:

```typescript
// Generate shopping list from meal plan
function generateShoppingList(
  mealPlan: MealPlan,
  recipes: Recipe[]
): ShoppingListItem[]

// Consolidate ingredients
function consolidateIngredients(
  items: ShoppingListItem[]
): ShoppingListItem[]

// Group by category
function groupByCategory(
  items: ShoppingListItem[]
): Record<string, ShoppingListItem[]>

// Export to CSV
function exportToCSV(items: ShoppingListItem[]): string

// Format for WhatsApp
function formatForWhatsApp(items: ShoppingListItem[]): string
```

**Example:**
```typescript
import { generateShoppingList } from '@/services/shoppingService';

const shoppingList = generateShoppingList(mealPlan, recipes);
```

### authService

Firebase authentication:

```typescript
// Sign up with email/password
function signUp(email: string, password: string): Promise<User>

// Sign in with email/password
function signIn(email: string, password: string): Promise<User>

// Sign in with Google
function signInWithGoogle(): Promise<User>

// Sign out
function signOut(): Promise<void>

// Get current user
function getCurrentUser(): Promise<User | null>

// Update user profile
function updateUserProfile(data: Partial<User>): Promise<void>

// Reset password
function resetPassword(email: string): Promise<void>
```

**Example:**
```typescript
import { signIn, signInWithGoogle } from '@/services/authService';

// Email/password sign in
const user = await signIn('user@example.com', 'password');

// Google sign in
const googleUser = await signInWithGoogle();
```

### firebaseService

Firebase database operations:

```typescript
// Save meal plan
function saveMealPlan(mealPlan: MealPlan): Promise<string>

// Load meal plan
function loadMealPlan(id: string): Promise<MealPlan | null>

// Delete meal plan
function deleteMealPlan(id: string): Promise<void>

// Get user meal plans
function getUserMealPlans(userId: string): Promise<MealPlan[]>

// Save user preferences
function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void>

// Load user preferences
function loadUserPreferences(
  userId: string
): Promise<UserPreferences | null>
```

### githubService

GitHub API for recipe contributions:

```typescript
// Create fork
function createFork(
  owner: string,
  repo: string
): Promise<{ owner: string; repo: string }>

// Create branch
function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  baseBranch: string
): Promise<void>

// Create file
function createFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
): Promise<void>

// Create pull request
function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<{ number: number; url: string }>
```

**Example:**
```typescript
import { createPullRequest } from '@/services/githubService';

const pr = await createPullRequest(
  'artemiopadilla',
  'foodie',
  'Add: New Recipe - Chocolate Cake',
  'This PR adds a new chocolate cake recipe...',
  'user:add-chocolate-cake',
  'main'
);
```

### validationService

Data validation:

```typescript
// Validate recipe
function validateRecipe(recipe: any): {
  valid: boolean;
  errors: string[];
}

// Validate ingredient
function validateIngredient(ingredient: any): {
  valid: boolean;
  errors: string[];
}

// Validate meal plan
function validateMealPlan(mealPlan: any): {
  valid: boolean;
  errors: string[];
}

// Check for duplicate recipe
function checkDuplicateRecipe(
  recipe: Recipe,
  existingRecipes: Recipe[]
): boolean

// Sanitize HTML
function sanitizeHTML(html: string): string
```

---

## Contexts & Hooks

### RecipeContext

Recipe state management:

```typescript
interface RecipeContextType {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  favorites: string[];
  searchQuery: string;
  filters: RecipeFilters;
  sortBy: string;

  setSearchQuery: (query: string) => void;
  setFilters: (filters: RecipeFilters) => void;
  setSortBy: (sortBy: string) => void;
  addToFavorites: (recipeId: string) => void;
  removeFromFavorites: (recipeId: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
}
```

**Hook:**
```typescript
function useRecipes(): RecipeContextType
```

**Example:**
```typescript
import { useRecipes } from '@/contexts/RecipeContext';

function RecipesList() {
  const {
    recipes,
    loading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters
  } = useRecipes();

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
```

### PlannerContext

Meal planning state:

```typescript
interface PlannerContextType {
  currentPlan: MealPlan | null;
  loading: boolean;
  error: string | null;

  createPlan: (plan: Partial<MealPlan>) => void;
  updatePlan: (plan: MealPlan) => void;
  deletePlan: (id: string) => void;
  addRecipeToPlan: (dayNumber: number, mealType: string, recipe: Recipe) => void;
  removeRecipeFromPlan: (dayNumber: number, mealType: string) => void;
  adjustServings: (servings: number) => void;
  savePlan: () => Promise<void>;
  loadPlan: (id: string) => Promise<void>;
}
```

**Hook:**
```typescript
function usePlanner(): PlannerContextType
```

### ShoppingContext

Shopping list state:

```typescript
interface ShoppingContextType {
  items: ShoppingListItem[];
  loading: boolean;

  addItem: (item: ShoppingListItem) => void;
  removeItem: (ingredientId: string) => void;
  toggleItem: (ingredientId: string) => void;
  updateQuantity: (ingredientId: string, quantity: number) => void;
  clearList: () => void;
  generateFromPlan: (plan: MealPlan, recipes: Recipe[]) => void;
  exportToCSV: () => string;
  exportToWhatsApp: () => string;
}
```

**Hook:**
```typescript
function useShopping(): ShoppingContextType
```

### PantryContext

Pantry management:

```typescript
interface PantryContextType {
  items: PantryItem[];
  loading: boolean;

  addItem: (item: PantryItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  getExpiringItems: (days: number) => PantryItem[];
  getSuggestedRecipes: () => Recipe[];
}
```

**Hook:**
```typescript
function usePantry(): PantryContextType
```

### AuthContext

User authentication:

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
}
```

**Hook:**
```typescript
function useAuth(): AuthContextType
```

### ThemeContext

Dark/light theme:

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

**Hook:**
```typescript
function useTheme(): ThemeContextType
```

### LanguageContext

Internationalization:

```typescript
interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  getTranslated: (text: MultiLangText) => string;
  t: (key: string) => string;
}
```

**Hook:**
```typescript
function useLanguage(): LanguageContextType
```

**Example:**
```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function RecipeName({ name }: { name: MultiLangText }) {
  const { getTranslated } = useLanguage();

  return <h2>{getTranslated(name)}</h2>;
}
```

### ToastContext

Toast notifications:

```typescript
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}
```

**Hook:**
```typescript
function useToast(): ToastContextType
```

**Example:**
```typescript
import { useToast } from '@/contexts/ToastContext';

function SaveButton() {
  const { showToast } = useToast();

  const handleSave = async () => {
    try {
      await saveMealPlan(plan);
      showToast('Meal plan saved!', 'success');
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

## Utility Functions

### useAnalytics

Google Analytics tracking:

```typescript
function useAnalytics(): {
  trackPageView: (path: string) => void;
  trackEvent: (name: string, params?: object) => void;
  trackRecipeView: (recipeId: string, recipeName: string) => void;
  trackRecipeSearch: (query: string, resultsCount: number) => void;
  trackRecipeShare: (recipeId: string, method: string) => void;
  trackMealPlanCreated: (planId: string) => void;
  trackShoppingListGenerated: (itemCount: number) => void;
}
```

**Example:**
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { trackRecipeView } = useAnalytics();

  useEffect(() => {
    trackRecipeView(recipe.id, recipe.name.en);
  }, [recipe]);

  return <div>...</div>;
}
```

### useFocusTrap

Trap focus within modals:

```typescript
function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean = true
): React.RefObject<T>
```

**Example:**
```typescript
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal({ isOpen, onClose }: ModalProps) {
  const modalRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div ref={modalRef}>
      <button onClick={onClose}>Close</button>
      {/* Modal content */}
    </div>
  );
}
```

### useSEO

SEO meta tags:

```typescript
function useSEO(props: {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}): void
```

**Example:**
```typescript
import { useSEO } from '@/utils/seo';

function RecipeDetailPage({ recipe }: { recipe: Recipe }) {
  useSEO({
    title: recipe.name.en,
    description: recipe.description.en,
    keywords: recipe.tags.join(', '),
    image: recipe.imageUrl,
    type: 'article',
  });

  return <div>...</div>;
}
```

### generateRecipeStructuredData

JSON-LD structured data:

```typescript
function generateRecipeStructuredData(recipe: Recipe): object
```

**Example:**
```typescript
import { generateRecipeStructuredData } from '@/utils/seo';

const structuredData = generateRecipeStructuredData(recipe);

// Add to page
<script type="application/ld+json">
  {JSON.stringify(structuredData)}
</script>
```

---

## Error Handling

All async operations should be wrapped in try-catch:

```typescript
try {
  const recipes = await getRecipes();
  // Handle success
} catch (error) {
  console.error('Failed to fetch recipes:', error);
  // Show error toast
  showToast('Failed to load recipes', 'error');
}
```

---

## Type Safety

All API functions are fully typed with TypeScript. Use TypeScript for best developer experience:

```typescript
// ✅ Good: TypeScript knows recipe is Recipe type
const recipe: Recipe = await getRecipeById('123');

// ✅ Good: Autocomplete works
recipe.name.en;

// ❌ Error: Property doesn't exist
recipe.invalidProperty; // TypeScript error
```

---

## Next Steps

- [Architecture Reference](architecture.md) - System design
- [Development Guide](../guides/development.md) - Start developing
- [Testing Guide](../guides/testing.md) - Write tests

---

**Complete API reference for Foodie PWA!** 📚
