#!/usr/bin/env node

/**
 * Recipe Generator Script
 *
 * Generates additional recipe data to reach 50+ recipes
 * Usage: node scripts/generate-recipes.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const RECIPES_FILE = join(PROJECT_ROOT, 'public', 'data', 'recipes.json');

// Read existing recipes
const recipesData = JSON.parse(readFileSync(RECIPES_FILE, 'utf8'));
let recipeId = recipesData.recipes.length + 1;

// Helper to create recipe ID
const getRecipeId = () => `rec_${String(recipeId++).padStart(3, '0')}`;

// Additional breakfast recipes
const breakfastRecipes = [
  {
    id: getRecipeId(),
    name: { en: "Banana Pancakes", es: "Panqueques de Plátano", fr: "Crêpes à la Banane" },
    description: { en: "Fluffy pancakes with mashed banana", es: "Panqueques esponjosos con plátano machacado", fr: "Crêpes moelleuses avec banane écrasée" },
    type: "breakfast",
    cuisine: ["american"],
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    servings: 4,
    difficulty: "easy",
    tags: ["vegetarian", "kid-friendly"],
    dietaryLabels: { glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false },
    nutrition: { servingSize: "3 pancakes", calories: 340, protein: 11, carbs: 52, fat: 10, fiber: 3, sugar: 15, sodium: 420, cholesterol: 75 },
    ingredients: [
      { ingredientId: "ing_026", quantity: 2, unit: "cup", optional: false },
      { ingredientId: "ing_025", quantity: 2, unit: "piece", preparation: "mashed", optional: false },
      { ingredientId: "ing_001", quantity: 2, unit: "piece", optional: false },
      { ingredientId: "ing_027", quantity: 1, unit: "cup", optional: false }
    ],
    instructions: [
      { step: 1, text: { en: "Mix flour, eggs, milk, and mashed banana", es: "Mezcla harina, huevos, leche y plátano machacado", fr: "Mélanger farine, œufs, lait et banane écrasée" }, time: 5 },
      { step: 2, text: { en: "Heat griddle to medium", es: "Calienta la plancha a fuego medio", fr: "Chauffer la plaque à feu moyen" }, time: 3 },
      { step: 3, text: { en: "Pour batter and cook until bubbles form", es: "Vierte la masa y cocina hasta que se formen burbujas", fr: "Verser la pâte et cuire jusqu'à formation de bulles" }, time: 7 },
      { step: 4, text: { en: "Flip and cook until golden", es: "Voltea y cocina hasta dorar", fr: "Retourner et cuire jusqu'à ce qu'elles soient dorées" }, time: 5 }
    ],
    tips: { en: "Serve with maple syrup and fresh berries", es: "Sirve con jarabe de arce y bayas frescas", fr: "Servir avec sirop d'érable et baies fraîches" },
    equipment: ["griddle", "bowl", "whisk"],
    author: "foodie_team",
    dateAdded: "2025-01-19",
    rating: 4.7,
    reviewCount: 425
  },
  {
    id: getRecipeId(),
    name: { en: "Breakfast Burrito", es: "Burrito de Desayuno", fr: "Burrito du Petit-Déjeuner" },
    description: { en: "Hearty breakfast burrito with eggs, cheese, and veggies", es: "Burrito de desayuno abundante con huevos, queso y verduras", fr: "Burrito copieux avec œufs, fromage et légumes" },
    type: "breakfast",
    cuisine: ["mexican"],
    prepTime: 10,
    cookTime: 10,
    totalTime: 20,
    servings: 2,
    difficulty: "easy",
    tags: ["high-protein", "quick"],
    dietaryLabels: { glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false },
    nutrition: { servingSize: "1 burrito", calories: 420, protein: 24, carbs: 38, fat: 20, fiber: 4, sugar: 3, sodium: 680, cholesterol: 395 },
    ingredients: [
      { ingredientId: "ing_028", quantity: 2, unit: "piece", optional: false },
      { ingredientId: "ing_001", quantity: 4, unit: "piece", preparation: "scrambled", optional: false },
      { ingredientId: "ing_029", quantity: 0.5, unit: "cup", preparation: "shredded", optional: false },
      { ingredientId: "ing_009", quantity: 0.5, unit: "piece", preparation: "diced", optional: false },
      { ingredientId: "ing_030", quantity: 2, unit: "tbsp", optional: true }
    ],
    instructions: [
      { step: 1, text: { en: "Scramble eggs with diced bell pepper", es: "Revuelve huevos con pimiento picado", fr: "Brouiller les œufs avec poivron émincé" }, time: 5 },
      { step: 2, text: { en: "Warm tortillas", es: "Calienta las tortillas", fr: "Réchauffer les tortillas" }, time: 2 },
      { step: 3, text: { en: "Fill with eggs, cheese, and salsa", es: "Rellena con huevos, queso y salsa", fr: "Garnir d'œufs, fromage et salsa" }, time: 2 },
      { step: 4, text: { en: "Roll tightly and serve", es: "Enrolla firmemente y sirve", fr: "Rouler fermement et servir" }, time: 1 }
    ],
    tips: { en: "Add black beans for extra protein and fiber", es: "Agrega frijoles negros para más proteína y fibra", fr: "Ajouter des haricots noirs pour plus de protéines et fibres" },
    equipment: ["pan", "spatula"],
    author: "foodie_team",
    dateAdded: "2025-01-20",
    rating: 4.6,
    reviewCount: 378
  }
];

// Add more recipes to array
recipesData.recipes.push(...breakfastRecipes);

// Write back to file
writeFileSync(RECIPES_FILE, JSON.stringify(recipesData, null, 2));

console.log(`✅ Added ${breakfastRecipes.length} breakfast recipes`);
console.log(`📊 Total recipes: ${recipesData.recipes.length}`);
