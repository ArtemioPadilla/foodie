/**
 * Shopping Categories - Single Source of Truth
 *
 * This file defines all shopping categories used throughout the app.
 * Fixes category mismatch issues between AddItemModal, ListControls, and shoppingService.
 */

export const SHOPPING_CATEGORIES = {
  PRODUCE: 'produce',
  MEAT_POULTRY: 'meat-poultry',
  SEAFOOD: 'seafood',
  DAIRY_EGGS: 'dairy-eggs',
  BAKERY: 'bakery',
  GRAINS_PASTA: 'grains-pasta',
  PANTRY: 'pantry',
  SPICES: 'spices',
  OILS_CONDIMENTS: 'oils-condiments',
  BEVERAGES: 'beverages',
  FROZEN: 'frozen',
  OTHER: 'other',
} as const;

export type ShoppingCategory = typeof SHOPPING_CATEGORIES[keyof typeof SHOPPING_CATEGORIES];

/**
 * Category Display Names
 * Used for translation keys and UI display
 */
export const CATEGORY_DISPLAY_NAMES: Record<ShoppingCategory, string> = {
  [SHOPPING_CATEGORIES.PRODUCE]: 'categories.produce',
  [SHOPPING_CATEGORIES.MEAT_POULTRY]: 'categories.meatPoultry',
  [SHOPPING_CATEGORIES.SEAFOOD]: 'categories.seafood',
  [SHOPPING_CATEGORIES.DAIRY_EGGS]: 'categories.dairyEggs',
  [SHOPPING_CATEGORIES.BAKERY]: 'categories.bakery',
  [SHOPPING_CATEGORIES.GRAINS_PASTA]: 'categories.grainsPasta',
  [SHOPPING_CATEGORIES.PANTRY]: 'categories.pantry',
  [SHOPPING_CATEGORIES.SPICES]: 'categories.spices',
  [SHOPPING_CATEGORIES.OILS_CONDIMENTS]: 'categories.oilsCondiments',
  [SHOPPING_CATEGORIES.BEVERAGES]: 'categories.beverages',
  [SHOPPING_CATEGORIES.FROZEN]: 'categories.frozen',
  [SHOPPING_CATEGORIES.OTHER]: 'categories.other',
};

/**
 * Ingredient to Category Mapping
 * Maps individual ingredient IDs to their shopping categories
 */
export const INGREDIENT_CATEGORY_MAP: Record<string, ShoppingCategory> = {
  // Produce
  tomato: SHOPPING_CATEGORIES.PRODUCE,
  lettuce: SHOPPING_CATEGORIES.PRODUCE,
  onion: SHOPPING_CATEGORIES.PRODUCE,
  garlic: SHOPPING_CATEGORIES.PRODUCE,
  potato: SHOPPING_CATEGORIES.PRODUCE,
  carrot: SHOPPING_CATEGORIES.PRODUCE,
  bell_pepper: SHOPPING_CATEGORIES.PRODUCE,
  cucumber: SHOPPING_CATEGORIES.PRODUCE,
  spinach: SHOPPING_CATEGORIES.PRODUCE,
  broccoli: SHOPPING_CATEGORIES.PRODUCE,
  apple: SHOPPING_CATEGORIES.PRODUCE,
  banana: SHOPPING_CATEGORIES.PRODUCE,
  lemon: SHOPPING_CATEGORIES.PRODUCE,
  lime: SHOPPING_CATEGORIES.PRODUCE,
  avocado: SHOPPING_CATEGORIES.PRODUCE,
  cilantro: SHOPPING_CATEGORIES.PRODUCE,
  parsley: SHOPPING_CATEGORIES.PRODUCE,

  // Meat & Poultry
  chicken: SHOPPING_CATEGORIES.MEAT_POULTRY,
  chicken_breast: SHOPPING_CATEGORIES.MEAT_POULTRY,
  chicken_thigh: SHOPPING_CATEGORIES.MEAT_POULTRY,
  ground_beef: SHOPPING_CATEGORIES.MEAT_POULTRY,
  beef: SHOPPING_CATEGORIES.MEAT_POULTRY,
  pork: SHOPPING_CATEGORIES.MEAT_POULTRY,
  bacon: SHOPPING_CATEGORIES.MEAT_POULTRY,
  sausage: SHOPPING_CATEGORIES.MEAT_POULTRY,
  turkey: SHOPPING_CATEGORIES.MEAT_POULTRY,

  // Seafood
  salmon: SHOPPING_CATEGORIES.SEAFOOD,
  tuna: SHOPPING_CATEGORIES.SEAFOOD,
  shrimp: SHOPPING_CATEGORIES.SEAFOOD,
  cod: SHOPPING_CATEGORIES.SEAFOOD,
  tilapia: SHOPPING_CATEGORIES.SEAFOOD,

  // Dairy & Eggs
  milk: SHOPPING_CATEGORIES.DAIRY_EGGS,
  eggs: SHOPPING_CATEGORIES.DAIRY_EGGS,
  butter: SHOPPING_CATEGORIES.DAIRY_EGGS,
  cheese: SHOPPING_CATEGORIES.DAIRY_EGGS,
  cheddar_cheese: SHOPPING_CATEGORIES.DAIRY_EGGS,
  parmesan_cheese: SHOPPING_CATEGORIES.DAIRY_EGGS,
  mozzarella_cheese: SHOPPING_CATEGORIES.DAIRY_EGGS,
  yogurt: SHOPPING_CATEGORIES.DAIRY_EGGS,
  greek_yogurt: SHOPPING_CATEGORIES.DAIRY_EGGS,
  cream: SHOPPING_CATEGORIES.DAIRY_EGGS,
  heavy_cream: SHOPPING_CATEGORIES.DAIRY_EGGS,
  sour_cream: SHOPPING_CATEGORIES.DAIRY_EGGS,

  // Bakery
  bread: SHOPPING_CATEGORIES.BAKERY,
  tortillas: SHOPPING_CATEGORIES.BAKERY,
  bagel: SHOPPING_CATEGORIES.BAKERY,
  croissant: SHOPPING_CATEGORIES.BAKERY,

  // Grains & Pasta
  rice: SHOPPING_CATEGORIES.GRAINS_PASTA,
  pasta: SHOPPING_CATEGORIES.GRAINS_PASTA,
  spaghetti: SHOPPING_CATEGORIES.GRAINS_PASTA,
  penne: SHOPPING_CATEGORIES.GRAINS_PASTA,
  quinoa: SHOPPING_CATEGORIES.GRAINS_PASTA,
  oats: SHOPPING_CATEGORIES.GRAINS_PASTA,
  flour: SHOPPING_CATEGORIES.GRAINS_PASTA,

  // Pantry
  sugar: SHOPPING_CATEGORIES.PANTRY,
  salt: SHOPPING_CATEGORIES.PANTRY,
  canned_tomatoes: SHOPPING_CATEGORIES.PANTRY,
  tomato_paste: SHOPPING_CATEGORIES.PANTRY,
  tomato_sauce: SHOPPING_CATEGORIES.PANTRY,
  beans: SHOPPING_CATEGORIES.PANTRY,
  black_beans: SHOPPING_CATEGORIES.PANTRY,
  chickpeas: SHOPPING_CATEGORIES.PANTRY,
  peanut_butter: SHOPPING_CATEGORIES.PANTRY,
  honey: SHOPPING_CATEGORIES.PANTRY,
  nuts: SHOPPING_CATEGORIES.PANTRY,
  almonds: SHOPPING_CATEGORIES.PANTRY,

  // Spices & Herbs
  black_pepper: SHOPPING_CATEGORIES.SPICES,
  cumin: SHOPPING_CATEGORIES.SPICES,
  paprika: SHOPPING_CATEGORIES.SPICES,
  oregano: SHOPPING_CATEGORIES.SPICES,
  basil: SHOPPING_CATEGORIES.SPICES,
  thyme: SHOPPING_CATEGORIES.SPICES,
  rosemary: SHOPPING_CATEGORIES.SPICES,
  cinnamon: SHOPPING_CATEGORIES.SPICES,
  chili_powder: SHOPPING_CATEGORIES.SPICES,

  // Oils & Condiments
  olive_oil: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  vegetable_oil: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  soy_sauce: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  vinegar: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  balsamic_vinegar: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  mustard: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  ketchup: SHOPPING_CATEGORIES.OILS_CONDIMENTS,
  mayonnaise: SHOPPING_CATEGORIES.OILS_CONDIMENTS,

  // Beverages
  water: SHOPPING_CATEGORIES.BEVERAGES,
  coffee: SHOPPING_CATEGORIES.BEVERAGES,
  tea: SHOPPING_CATEGORIES.BEVERAGES,
  juice: SHOPPING_CATEGORIES.BEVERAGES,

  // Frozen
  frozen_vegetables: SHOPPING_CATEGORIES.FROZEN,
  frozen_berries: SHOPPING_CATEGORIES.FROZEN,
  ice_cream: SHOPPING_CATEGORIES.FROZEN,
};

/**
 * Get category for an ingredient ID
 * Returns the category if found in mapping, otherwise returns 'other'
 */
export function getIngredientCategory(ingredientId: string): ShoppingCategory {
  // Remove any custom_ prefix and timestamp for custom items
  const cleanId = ingredientId.replace(/^custom_\d+_/, '');

  return INGREDIENT_CATEGORY_MAP[cleanId] || SHOPPING_CATEGORIES.OTHER;
}

/**
 * Get all categories as an array of options for select inputs
 */
export function getAllCategories(): Array<{ value: ShoppingCategory; label: string }> {
  return Object.values(SHOPPING_CATEGORIES).map((category) => ({
    value: category,
    label: CATEGORY_DISPLAY_NAMES[category],
  }));
}
