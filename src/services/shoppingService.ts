import { MealPlan, Recipe, ShoppingListItem } from '@/types';

/**
 * Category mapping for ingredients
 */
const CATEGORY_MAP: Record<string, string> = {
  // Proteins
  chicken: 'Meat & Poultry',
  beef: 'Meat & Poultry',
  pork: 'Meat & Poultry',
  fish: 'Seafood',
  salmon: 'Seafood',
  shrimp: 'Seafood',
  eggs: 'Dairy & Eggs',
  tofu: 'Protein',

  // Dairy
  milk: 'Dairy & Eggs',
  cheese: 'Dairy & Eggs',
  yogurt: 'Dairy & Eggs',
  butter: 'Dairy & Eggs',
  cream: 'Dairy & Eggs',

  // Produce
  tomato: 'Produce',
  onion: 'Produce',
  garlic: 'Produce',
  lettuce: 'Produce',
  carrot: 'Produce',
  potato: 'Produce',
  bell: 'Produce',
  pepper: 'Produce',
  spinach: 'Produce',
  broccoli: 'Produce',

  // Grains & Bakery
  bread: 'Bakery',
  rice: 'Grains & Pasta',
  pasta: 'Grains & Pasta',
  flour: 'Baking',
  tortilla: 'Bakery',

  // Pantry
  oil: 'Oils & Condiments',
  olive: 'Oils & Condiments',
  vinegar: 'Oils & Condiments',
  soy: 'Oils & Condiments',
  salt: 'Spices & Seasonings',
  sugar: 'Baking',

  // Default
  default: 'Other',
};

/**
 * Unit conversion factors to standardize quantities
 */
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Volume
  'tsp': { base: 'tbsp', factor: 1/3 },
  'teaspoon': { base: 'tbsp', factor: 1/3 },
  'tbsp': { base: 'tbsp', factor: 1 },
  'tablespoon': { base: 'tbsp', factor: 1 },
  'cup': { base: 'cup', factor: 1 },
  'ml': { base: 'cup', factor: 1/240 },
  'l': { base: 'cup', factor: 4.22 },
  'liter': { base: 'cup', factor: 4.22 },

  // Weight
  'oz': { base: 'lb', factor: 1/16 },
  'ounce': { base: 'lb', factor: 1/16 },
  'lb': { base: 'lb', factor: 1 },
  'pound': { base: 'lb', factor: 1 },
  'g': { base: 'kg', factor: 1/1000 },
  'gram': { base: 'kg', factor: 1/1000 },
  'kg': { base: 'kg', factor: 1 },
  'kilogram': { base: 'kg', factor: 1 },

  // Count
  'piece': { base: 'piece', factor: 1 },
  'whole': { base: 'piece', factor: 1 },
  'item': { base: 'piece', factor: 1 },

  // Other
  'pinch': { base: 'pinch', factor: 1 },
  'dash': { base: 'dash', factor: 1 },
  'to taste': { base: 'to taste', factor: 1 },
};

/**
 * Determine category for an ingredient
 */
export function getIngredientCategory(ingredientId: string): string {
  const lowerIngredient = ingredientId.toLowerCase();

  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lowerIngredient.includes(keyword)) {
      return category;
    }
  }

  return CATEGORY_MAP.default;
}

/**
 * Convert quantity to base unit for consolidation
 */
export function convertToBaseUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const normalizedUnit = unit.toLowerCase().trim();
  const conversion = UNIT_CONVERSIONS[normalizedUnit];

  if (conversion) {
    return {
      quantity: quantity * conversion.factor,
      unit: conversion.base,
    };
  }

  return { quantity, unit: normalizedUnit };
}

/**
 * Consolidate ingredients with same ID and compatible units
 */
export function consolidateIngredients(
  ingredients: Array<{ ingredientId: string; quantity: number; unit: string; usedIn: string[] }>
): Array<{ ingredientId: string; quantity: number; unit: string; usedIn: string[] }> {
  const consolidated = new Map<string, { quantity: number; unit: string; usedIn: Set<string> }>();

  for (const ingredient of ingredients) {
    const { quantity: baseQuantity, unit: baseUnit } = convertToBaseUnit(
      ingredient.quantity,
      ingredient.unit
    );

    const key = `${ingredient.ingredientId}|${baseUnit}`;

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.quantity += baseQuantity;
      ingredient.usedIn.forEach(recipe => existing.usedIn.add(recipe));
    } else {
      consolidated.set(key, {
        quantity: baseQuantity,
        unit: baseUnit,
        usedIn: new Set(ingredient.usedIn),
      });
    }
  }

  return Array.from(consolidated.entries()).map(([key, value]) => {
    const ingredientId = key.split('|')[0];
    return {
      ingredientId,
      quantity: Math.round(value.quantity * 100) / 100, // Round to 2 decimals
      unit: value.unit,
      usedIn: Array.from(value.usedIn),
    };
  });
}

/**
 * Generate shopping list from meal plan
 */
export function generateShoppingListFromPlan(
  plan: MealPlan,
  getRecipeById: (id: string) => Recipe | undefined
): ShoppingListItem[] {
  const allIngredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
    usedIn: string[];
  }> = [];

  // Collect all ingredients from all meals
  plan.days.forEach((day) => {
    const processMeal = (recipeId: string, servings: number, recipeName: string) => {
      const recipe = getRecipeById(recipeId);
      if (!recipe) return;

      const scaleFactor = servings / recipe.servings;

      recipe.ingredients.forEach((ingredient) => {
        if (!ingredient.optional) {
          allIngredients.push({
            ingredientId: ingredient.ingredientId,
            quantity: ingredient.quantity * scaleFactor,
            unit: ingredient.unit,
            usedIn: [recipeName],
          });
        }
      });
    };

    if (day.meals.breakfast) {
      const recipe = getRecipeById(day.meals.breakfast.recipeId);
      if (recipe) {
        processMeal(
          day.meals.breakfast.recipeId,
          day.meals.breakfast.servings,
          recipe.name.en
        );
      }
    }

    if (day.meals.lunch) {
      const recipe = getRecipeById(day.meals.lunch.recipeId);
      if (recipe) {
        processMeal(
          day.meals.lunch.recipeId,
          day.meals.lunch.servings,
          recipe.name.en
        );
      }
    }

    if (day.meals.dinner) {
      const recipe = getRecipeById(day.meals.dinner.recipeId);
      if (recipe) {
        processMeal(
          day.meals.dinner.recipeId,
          day.meals.dinner.servings,
          recipe.name.en
        );
      }
    }

    if (day.meals.snacks) {
      day.meals.snacks.forEach((snack) => {
        const recipe = getRecipeById(snack.recipeId);
        if (recipe) {
          processMeal(snack.recipeId, snack.servings, recipe.name.en);
        }
      });
    }
  });

  // Consolidate ingredients
  const consolidated = consolidateIngredients(allIngredients);

  // Convert to shopping list items with categories
  return consolidated.map((item) => ({
    ingredientId: item.ingredientId,
    quantity: item.quantity,
    unit: item.unit,
    checked: false,
    usedIn: item.usedIn,
    category: getIngredientCategory(item.ingredientId),
  }));
}

/**
 * Group shopping list items by category
 */
export function groupByCategory(
  items: ShoppingListItem[]
): Record<string, ShoppingListItem[]> {
  const grouped: Record<string, ShoppingListItem[]> = {};

  items.forEach((item) => {
    const category = item.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  // Sort items within each category
  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) =>
      a.ingredientId.localeCompare(b.ingredientId)
    );
  });

  return grouped;
}

/**
 * Export shopping list as formatted text
 */
export function exportAsText(items: ShoppingListItem[]): string {
  const grouped = groupByCategory(items);
  let output = 'Shopping List\n';
  output += '='.repeat(50) + '\n\n';

  Object.entries(grouped).forEach(([category, categoryItems]) => {
    output += `${category.toUpperCase()}\n`;
    output += '-'.repeat(30) + '\n';

    categoryItems.forEach((item) => {
      const checkbox = item.checked ? '✓' : '☐';
      output += `${checkbox} ${item.quantity} ${item.unit} ${item.ingredientId}\n`;
      if (item.notes) {
        output += `   Note: ${item.notes}\n`;
      }
      if (item.usedIn.length > 0) {
        output += `   Used in: ${item.usedIn.join(', ')}\n`;
      }
    });

    output += '\n';
  });

  return output;
}

/**
 * Export shopping list as CSV
 */
export function exportAsCSV(items: ShoppingListItem[]): string {
  const headers = 'Category,Ingredient,Quantity,Unit,Checked,Used In,Notes\n';
  const rows = items
    .map((item) => {
      const category = item.category || 'Other';
      const usedIn = item.usedIn.join('; ');
      const notes = item.notes || '';
      const checked = item.checked ? 'Yes' : 'No';

      return `"${category}","${item.ingredientId}",${item.quantity},"${item.unit}","${checked}","${usedIn}","${notes}"`;
    })
    .join('\n');

  return headers + rows;
}

/**
 * Generate WhatsApp-friendly shopping list
 */
export function exportForWhatsApp(items: ShoppingListItem[]): string {
  const grouped = groupByCategory(items);
  let output = '🛒 *Shopping List*\n\n';

  Object.entries(grouped).forEach(([category, categoryItems]) => {
    output += `*${category}*\n`;

    categoryItems.forEach((item) => {
      const checkbox = item.checked ? '✅' : '☑️';
      output += `${checkbox} ${item.quantity} ${item.unit} ${item.ingredientId}\n`;
    });

    output += '\n';
  });

  output += `_Total items: ${items.length}_`;

  return output;
}
