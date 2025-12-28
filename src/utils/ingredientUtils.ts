/**
 * Utility functions for ingredient ID handling
 */

/**
 * Clean custom ingredient IDs by removing the unique identifier prefix
 * Custom IDs have format: custom_{uuid}_{name}
 * This function extracts just the {name} portion
 *
 * @param ingredientId - The ingredient ID to clean
 * @returns The cleaned ingredient ID without custom prefix
 *
 * @example
 * cleanIngredientId('custom_550e8400-e29b-41d4-a716-446655440000_milk') // 'milk'
 * cleanIngredientId('tomato') // 'tomato'
 */
export function cleanIngredientId(ingredientId: string): string {
  // Remove custom_{uuid}_ prefix from custom ingredient IDs
  // This handles both numeric timestamps and UUID v4 formats
  return ingredientId.replace(/^custom_[a-f0-9-]+_/i, '');
}

/**
 * Check if an ingredient ID is a custom ingredient
 *
 * @param ingredientId - The ingredient ID to check
 * @returns True if the ingredient is a custom ingredient
 */
export function isCustomIngredient(ingredientId: string): boolean {
  return ingredientId.startsWith('custom_');
}
