import { Recipe, Ingredient, MealPlan, ShoppingListItem } from '@types';

export const mockIngredient: Ingredient = {
  id: 'ingredient-1',
  name: {
    en: 'Chicken Breast',
    es: 'Pechuga de Pollo',
    fr: 'Poitrine de Poulet',
  },
  category: 'proteins',
  pricePerUnit: 5.99,
  unitType: 'lb',
  storageInfo: {
    en: 'Refrigerate at 40°F or below',
    es: 'Refrigerar a 4°C o menos',
    fr: 'Réfrigérer à 4°C ou moins',
  },
  shelfLife: {
    refrigerated: 2,
    frozen: 270,
  },
};

export const mockRecipe: Recipe = {
  id: 'recipe-1',
  name: {
    en: 'Grilled Chicken',
    es: 'Pollo a la Parrilla',
    fr: 'Poulet Grillé',
  },
  description: {
    en: 'Delicious grilled chicken breast',
    es: 'Deliciosa pechuga de pollo a la parrilla',
    fr: 'Délicieuse poitrine de poulet grillée',
  },
  cuisine: 'american',
  category: 'dinner',
  difficulty: 'easy',
  prepTime: 15,
  cookTime: 20,
  totalTime: 35,
  servings: 4,
  imageUrl: '/images/grilled-chicken.jpg',
  videoUrl: '',
  ingredients: [
    {
      id: 'ingredient-1',
      amount: 1.5,
      unit: 'lb',
      notes: {
        en: 'Boneless, skinless',
        es: 'Sin hueso, sin piel',
        fr: 'Désossé, sans peau',
      },
      optional: false,
    },
  ],
  instructions: [
    {
      step: 1,
      text: {
        en: 'Preheat grill to medium-high heat',
        es: 'Precalentar la parrilla a fuego medio-alto',
        fr: 'Préchauffer le gril à feu moyen-élevé',
      },
      imageUrl: '',
      timerMinutes: 0,
    },
  ],
  nutrition: {
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
  },
  tags: ['healthy', 'high-protein', 'low-carb'],
  dietaryLabels: {
    vegetarian: false,
    vegan: false,
    glutenFree: true,
    dairyFree: true,
    nutFree: true,
    lowCarb: true,
    keto: true,
    paleo: true,
  },
  equipmentNeeded: ['grill', 'tongs'],
  skillLevel: 'beginner',
  cost: 'budget',
  rating: 4.5,
  reviewCount: 123,
  dateAdded: '2024-01-01',
  author: 'Test Author',
  source: 'https://example.com',
};

export const mockRecipes: Recipe[] = [
  mockRecipe,
  {
    ...mockRecipe,
    id: 'recipe-2',
    name: {
      en: 'Vegetarian Pasta',
      es: 'Pasta Vegetariana',
      fr: 'Pâtes Végétariennes',
    },
    category: 'lunch',
    dietaryLabels: {
      ...mockRecipe.dietaryLabels,
      vegetarian: true,
      vegan: false,
    },
  },
  {
    ...mockRecipe,
    id: 'recipe-3',
    name: {
      en: 'Vegan Salad',
      es: 'Ensalada Vegana',
      fr: 'Salade Végétalienne',
    },
    category: 'lunch',
    dietaryLabels: {
      ...mockRecipe.dietaryLabels,
      vegetarian: true,
      vegan: true,
    },
  },
];

export const mockMealPlan: MealPlan = {
  id: 'plan-1',
  name: 'Weekly Plan',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  meals: [
    {
      date: '2024-01-01',
      mealType: 'breakfast',
      recipeId: 'recipe-1',
      servings: 4,
      notes: 'Test notes',
    },
  ],
  totalCost: 45.5,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

export const mockShoppingListItem: ShoppingListItem = {
  id: 'item-1',
  ingredientId: 'ingredient-1',
  name: {
    en: 'Chicken Breast',
    es: 'Pechuga de Pollo',
    fr: 'Poitrine de Poulet',
  },
  amount: 1.5,
  unit: 'lb',
  category: 'proteins',
  checked: false,
  notes: '',
  recipes: ['recipe-1'],
};

export const mockShoppingList: ShoppingListItem[] = [
  mockShoppingListItem,
  {
    ...mockShoppingListItem,
    id: 'item-2',
    ingredientId: 'ingredient-2',
    name: {
      en: 'Olive Oil',
      es: 'Aceite de Oliva',
      fr: 'Huile d\'Olive',
    },
    amount: 2,
    unit: 'tbsp',
    category: 'pantry',
  },
];
