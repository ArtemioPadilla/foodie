# Utility Functions - Foodie PWA

**Last Updated**: 2025-01-10
**Purpose**: Reusable utility functions and helpers
**Status**: Core utils implemented, needs expansion

---

## Overview

Utility functions are pure, testable functions that provide reusable logic across the application. They should be framework-agnostic and have no side effects.

## Existing Utilities

### unitConversions.ts ✅

**Purpose**: Convert between cooking units (cups, ml, oz, etc.)

**Key Functions**:
- `convertUnit(quantity, fromUnit, toUnit): number` - Convert between units
- `roundToUsefulFraction(value): number` - Round to common fractions (1/4, 1/3, 1/2, etc.)
- `formatQuantity(quantity): string` - Format with fraction symbols (¼, ½, ¾)

**Example**:
```typescript
convertUnit(1, 'cup', 'ml'); // 240
formatQuantity(1.5); // "1 ½"
```

### calculations.ts ✅

**Purpose**: Recipe and meal plan calculations

**Key Functions**:
- `scaleRecipeIngredient(ingredient, targetServings, baseServings)` - Scale single ingredient
- `scaleRecipe(recipe, targetServings)` - Scale entire recipe
- `calculateRecipeCost(recipe, ingredients)` - Estimate recipe cost
- `calculateMealPlanCost(mealPlan, recipes, ingredients)` - Total meal plan cost
- `calculateDailyNutrition(recipes, dayMeals)` - Sum nutrition for a day

---

## Needed Utilities

### nutritionEstimator.ts ❌

**Purpose**: Estimate nutrition when not provided

**Planned Functions**:
- `estimateCalories(ingredients)` - Rough calorie estimate
- `estimateMacros(ingredients)` - Estimate protein/carbs/fat
- `validateNutrition(nutrition)` - Sanity check nutrition values

### firebaseAPI.ts ❌

**Purpose**: Firebase operations wrapper

**Planned Functions**:
- `uploadImage(file, path)` - Upload to Firebase Storage
- `saveUserData(userId, data)` - Save to Firestore
- `getUserData(userId)` - Fetch from Firestore
- `syncMealPlan(userId, plan)` - Cloud sync

### githubAPI.ts ❌

**Purpose**: GitHub API operations

**Planned Functions**:
- `forkRepo(owner, repo, token)` - Fork repository
- `createBranch(owner, repo, branch, token)` - Create branch
- `commitFile(owner, repo, path, content, token)` - Commit file
- `createPR(owner, repo, title, body, token)` - Create pull request

### storage.ts ❌

**Purpose**: localStorage/sessionStorage wrapper

**Planned Functions**:
- `setItem(key, value)` - Set with JSON serialization
- `getItem(key, defaultValue)` - Get with deserialization
- `removeItem(key)` - Remove item
- `clear()` - Clear all app data

### validation.ts ❌

**Purpose**: Data validation with Zod

**Planned Functions**:
- `validateRecipe(data)` - Validate recipe schema
- `validateIngredient(data)` - Validate ingredient
- `validateMealPlan(data)` - Validate meal plan
- `validateUser(data)` - Validate user data

### formatting.ts ❌

**Purpose**: Format values for display

**Planned Functions**:
- `formatDate(date, locale)` - Format date based on locale
- `formatCurrency(amount, currency, locale)` - Format money
- `formatDuration(minutes)` - "2 hours 30 minutes"
- `formatNumber(num, locale)` - Locale-aware numbers

### dateHelpers.ts ❌

**Purpose**: Date manipulation

**Planned Functions**:
- `addDays(date, days)` - Add days to date
- `startOfWeek(date)` - Get start of week
- `getDayName(date, locale)` - "Monday", "Lunes", etc.
- `isExpiringSoon(date, days)` - Check if expiring soon

### urlHelpers.ts ❌

**Purpose**: URL and slug generation

**Planned Functions**:
- `generateSlug(text)` - "Recipe Name" → "recipe-name"
- `generateShareUrl(planId)` - Create shareable URL
- `generateQRCode(url)` - QR code for sharing

---

## Utility Guidelines

### Pure Functions Only

```typescript
// ✅ Good - pure function
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad - has side effects
export function calculateTotalAndSave(items: Item[]): number {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  localStorage.setItem('total', total.toString()); // Side effect!
  return total;
}
```

### Type Everything

```typescript
// ✅ Good - fully typed
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ❌ Bad - no types
export function formatPrice(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
```

### Document Complex Functions

```typescript
/**
 * Converts ingredient quantities between different units
 *
 * @param quantity - The amount to convert
 * @param fromUnit - Source unit (e.g., 'cup', 'ml', 'oz')
 * @param toUnit - Target unit
 * @returns Converted quantity, or original if conversion unavailable
 *
 * @example
 * convertUnit(1, 'cup', 'ml') // 240
 * convertUnit(16, 'tbsp', 'cup') // 1
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  // Implementation
}
```

### Test Thoroughly

```typescript
describe('convertUnit', () => {
  it('converts cups to ml', () => {
    expect(convertUnit(1, 'cup', 'ml')).toBe(240);
  });

  it('returns original if units are the same', () => {
    expect(convertUnit(5, 'cup', 'cup')).toBe(5);
  });

  it('returns original if conversion unavailable', () => {
    expect(convertUnit(5, 'cup', 'invalid')).toBe(5);
  });
});
```

---

## Testing Utilities

Since utilities are pure functions, they're easy to test:

```typescript
// tests/unit/utils/calculations.test.ts
import { scaleRecipe } from '@utils/calculations';
import { mockRecipe } from '../mocks';

describe('scaleRecipe', () => {
  it('doubles recipe quantities', () => {
    const scaled = scaleRecipe(mockRecipe, 4); // from 2 to 4 servings
    expect(scaled.ingredients[0].quantity).toBe(
      mockRecipe.ingredients[0].quantity * 2
    );
  });

  it('halves recipe quantities', () => {
    const scaled = scaleRecipe(mockRecipe, 1); // from 2 to 1 serving
    expect(scaled.ingredients[0].quantity).toBe(
      mockRecipe.ingredients[0].quantity / 2
    );
  });
});
```

---

## Import Aliases

Use path aliases for clean imports:

```typescript
// ✅ Good - with alias
import { convertUnit } from '@utils/unitConversions';
import { scaleRecipe } from '@utils/calculations';

// ❌ Bad - relative paths
import { convertUnit } from '../../utils/unitConversions';
import { scaleRecipe } from '../../utils/calculations';
```

---

**For Questions**: See main CLAUDE.md
