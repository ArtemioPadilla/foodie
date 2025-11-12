// Multilingual text interface
export interface MultiLangText {
  en: string;
  es: string;
  fr: string;
}

// Ingredient interfaces
export interface Ingredient {
  id: string;
  name: MultiLangText;
  category: string;
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

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
  preparation?: string;
  notes?: MultiLangText;
  optional: boolean;
}

// Recipe interfaces
export interface RecipeInstruction {
  step: number;
  text: MultiLangText;
  time?: number;
  image?: string;
}

export interface NutritionInfo {
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface DietaryLabels {
  glutenFree: boolean;
  vegetarian: boolean;
  vegan: boolean;
  dairyFree: boolean;
  lowCarb: boolean;
  keto: boolean;
  paleo: boolean;
  whole30?: boolean;
}

export interface RecipeVariation {
  name: MultiLangText;
  changedIngredients: RecipeIngredient[];
}

export interface Recipe {
  id: string;
  name: MultiLangText;
  description: MultiLangText;
  type: string;
  cuisine: string[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
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
  dateAdded: string;
  rating: number;
  reviewCount: number;
  variations?: RecipeVariation[];
}

// Meal Plan interfaces
export interface MealSlot {
  recipeId: string;
  servings: number;
}

export interface DayMeals {
  breakfast?: MealSlot;
  lunch?: MealSlot;
  dinner?: MealSlot;
  snacks?: MealSlot[];
}

export interface PlanDay {
  dayNumber: number;
  dayName: string;
  meals: DayMeals;
  notes?: MultiLangText;
}

export interface MealPlan {
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

// Shopping List interfaces
export interface ShoppingListItem {
  ingredientId: string;
  quantity: number;
  unit: string;
  checked: boolean;
  usedIn: string[];
  notes?: string;
  category?: string;
}

// Category interfaces
export interface Category {
  id: string;
  name: MultiLangText;
  icon?: string;
}

// User interfaces
export interface UserPreferences {
  language: string;
  theme: string;
  defaultServings: number;
  dietaryRestrictions: string[];
  allergies: string[];
  excludedIngredients: string[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: UserPreferences;
  favoriteRecipes: string[];
  createdAt: string;
}

// Pantry interfaces
export interface PantryItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  addedAt: string;
  location?: string;
}

// App Config interfaces
export interface AppConfig {
  name: string;
  version: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  defaultServings: number;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  features: {
    communityRecipes: boolean;
    shoppingList: boolean;
    mealPlanner: boolean;
    nutritionTracking: boolean;
    priceEstimation: boolean;
    recipeRatings: boolean;
    socialSharing: boolean;
    offlineMode: boolean;
  };
  limits: {
    maxServings: number;
    minServings: number;
    maxRecipesPerPlan: number;
    maxIngredientsPerRecipe: number;
  };
}

// Filter interfaces
export interface RecipeFilters {
  search?: string;
  type?: string[];
  cuisine?: string[];
  dietaryTags?: string[];
  difficulty?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  ingredients?: string[];
}

// Sort options
export type SortOption = 'rating' | 'prepTime' | 'cost' | 'newest' | 'popular' | 'name';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// GitHub contribution types
export interface RecipeSubmission extends Recipe {
  submittedBy: string;
  prUrl?: string;
  prNumber?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Review and Rating types
export interface RecipeReview {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  rating: number;
  review: string;
  images?: string[];
  helpful: number;
  createdAt: string;
  updatedAt?: string;
}
