/**
 * `src/types/` — re-exports ONLY.
 *
 * The Foodie domain types are derived with `z.infer` from the Zod schemas in
 * `src/schemas/` (Spec-DD, roadmap Issue 010). This barrel exists so code can
 * `import type { Recipe } from '@/types'` without reaching into the schema
 * modules; never declare an `interface` or standalone `type` here.
 */
export type {
  Locale,
  MultiLangText,
  NutritionInfo,
  Category,
  CategoryGroupId,
  CategoriesFile,
  CategoryGroup,
  MealType,
  Difficulty,
  RecipeIngredient,
  RecipeInstruction,
  DietaryLabels,
  RecipeVariation,
  Recipe,
  SortOption,
  RecipeFilters,
  ComponentIngredient,
  IngredientYield,
  IngredientTags,
  Ingredient,
  BeverageCategory,
  Beverage,
  MealSlot,
  DayMeals,
  MainMealSlot,
  PlanDay,
  MealPlan,
  ShoppingListItem,
  ShoppingList,
  PantryItem,
  PantryItems,
  NutritionGoals,
  TrackingMealType,
  TrackingEntry,
  GoalMetricProgress,
  GoalProgress,
  DailyTracking,
  PeriodSummary,
  UnitSystem,
  UserPreferences,
  FavoriteRecipes,
  UserProfile,
} from '@/schemas';
