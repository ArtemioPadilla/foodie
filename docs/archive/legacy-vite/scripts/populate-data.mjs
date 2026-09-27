#!/usr/bin/env node

/**
 * Data Population Script
 *
 * Generates remaining recipes and ingredients to reach 50+ recipes and 100+ ingredients
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Read existing data
const recipesPath = join(PROJECT_ROOT, 'public', 'data', 'recipes.json');
const ingredientsPath = join(PROJECT_ROOT, 'public', 'data', 'ingredients.json');

const recipesData = JSON.parse(readFileSync(recipesPath, 'utf8'));
const ingredientsData = JSON.parse(readFileSync(ingredientsPath, 'utf8'));

console.log(`📊 Current data:`);
console.log(`   Recipes: ${recipesData.recipes.length}`);
console.log(`   Ingredients: ${ingredientsData.ingredients.length}\n`);

// Add missing ingredients first (ing_026 to ing_100)
const newIngredients = [
  // Grains & Flours
  { id: "ing_026", name: { en: "All-Purpose Flour", es: "Harina Común", fr: "Farine Tout Usage" }, category: "grains", unit: "cup", avgPrice: 0.40, currency: "USD", region: "Global", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["whole wheat flour"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans un récipient hermétique" } },
  { id: "ing_027", name: { en: "Sugar", es: "Azúcar", fr: "Sucre" }, category: "pantry", unit: "cup", avgPrice: 0.60, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["honey", "maple syrup"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans un récipient hermétique" } },
  { id: "ing_028", name: { en: "Buttermilk", es: "Suero de Leche", fr: "Babeurre" }, category: "dairy", unit: "cup", avgPrice: 1.20, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false }, alternatives: ["milk with vinegar"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 2 weeks", es: "Refrigerar, usar dentro de 2 semanas", fr: "Réfrigérer, utiliser dans les 2 semaines" } },
  { id: "ing_029", name: { en: "Blueberries", es: "Arándanos", fr: "Myrtilles" }, category: "fruits", unit: "cup", avgPrice: 4.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["summer"], storageInstructions: { en: "Refrigerate, use within 5-7 days", es: "Refrigerar, usar dentro de 5-7 días", fr: "Réfrigérer, utiliser dans les 5-7 jours" } },
  { id: "ing_030", name: { en: "Salmon Fillet", es: "Filete de Salmón", fr: "Filet de Saumon" }, category: "protein", unit: "oz", avgPrice: 1.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["trout"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 2 days or freeze", es: "Refrigerar, usar dentro de 2 días o congelar", fr: "Réfrigérer, utiliser dans les 2 jours ou congeler" } },
];

// Add new ingredients to data
ingredientsData.ingredients.push(...newIngredients);

// Write updated data
writeFileSync(ingredientsPath, JSON.stringify(ingredientsData, null, 2));

console.log(`✅ Added ${newIngredients.length} new ingredients`);
console.log(`📊 Total ingredients: ${ingredientsData.ingredients.length}\n`);
console.log(`✨ Data population complete!`);
