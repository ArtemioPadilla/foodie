# Feature Plan: Ingredients Tab & Meal Planner Recipe Integration

## Overview
Two feature requests:
1. Add an Ingredients tab to browse ingredients and find recipes by ingredient
2. Improve meal planner UX by adding an integrated recipe picker

## Feature 1: Ingredients Page

### Implementation Steps

1. **Create IngredientsPage.tsx** (`/src/pages/IngredientsPage.tsx`)
   - Browse all ingredients by category
   - Search/filter ingredients
   - Click ingredient to see recipes that use it
   - Use existing IngredientContext

2. **Add Navigation Tab** (`/src/components/layout/Header.tsx`)
   - Add "Ingredients" tab between "Recipes" and "Planner"
   - Icon: ingredient/food icon

3. **Add Route** (`/src/App.tsx`)
   - Add lazy-loaded route for `/ingredients`

4. **Create Supporting Components**
   - `IngredientCard.tsx` - Display single ingredient with category, tags
   - `IngredientGrid.tsx` - Grid layout for ingredients
   - `RecipesByIngredient.tsx` - Show recipes using selected ingredient(s)

5. **Add Translations** (en, es, fr)
   - Navigation label
   - Page title, descriptions
   - Filter/search labels

## Feature 2: Meal Planner Recipe Picker

### Implementation Steps

1. **Create RecipePickerModal.tsx** (`/src/components/planner/RecipePickerModal.tsx`)
   - Modal with recipe search/filter
   - Quick preview of recipe details
   - "Add to Plan" button

2. **Update MealPlannerCalendar.tsx**
   - Add "+" button to each meal slot
   - Open recipe picker when clicked

3. **Update DroppableSlot.tsx**
   - Add "Browse Recipes" button when empty
   - Visual indicator for adding recipes

4. **Add Translations**
   - "Add Recipe", "Browse Recipes", etc.

## File Changes Summary

### New Files
- `/src/pages/IngredientsPage.tsx`
- `/src/components/ingredients/IngredientCard.tsx`
- `/src/components/ingredients/IngredientGrid.tsx`
- `/src/components/ingredients/IngredientFilter.tsx`
- `/src/components/ingredients/RecipesByIngredient.tsx`
- `/src/components/planner/RecipePickerModal.tsx`

### Modified Files
- `/src/App.tsx` - Add ingredients route
- `/src/components/layout/Header.tsx` - Add navigation tab
- `/src/components/planner/MealPlannerCalendar.tsx` - Add recipe picker trigger
- `/src/components/planner/DroppableSlot.tsx` - Add "Add Recipe" button
- `/public/locales/en/translation.json` - Add translations
- `/public/locales/es/translation.json` - Add translations
- `/public/locales/fr/translation.json` - Add translations
