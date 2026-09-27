#!/usr/bin/env node

/**
 * Validate recipe and ingredient JSON files against schema
 * Usage: node scripts/validateJSON.js
 */

import { readFile } from 'fs/promises';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const RECIPES_FILE = './public/data/recipes.json';
const INGREDIENTS_FILE = './public/data/ingredients.json';

// Recipe schema (simplified)
const recipeSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'cuisine', 'type', 'difficulty', 'prepTime', 'cookTime', 'servings', 'ingredients', 'instructions'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: {
      type: 'object',
      required: ['en', 'es', 'fr'],
      properties: {
        en: { type: 'string', minLength: 1 },
        es: { type: 'string', minLength: 1 },
        fr: { type: 'string', minLength: 1 },
      },
    },
    description: {
      type: 'object',
      required: ['en', 'es', 'fr'],
    },
    cuisine: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    prepTime: { type: 'number', minimum: 0 },
    cookTime: { type: 'number', minimum: 0 },
    servings: { type: 'number', minimum: 1 },
    ingredients: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['ingredientId', 'quantity', 'unit'],
        properties: {
          ingredientId: { type: 'string' },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string' },
          optional: { type: 'boolean' },
        },
      },
    },
    instructions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['step', 'text'],
        properties: {
          step: { type: 'number', minimum: 1 },
          text: {
            type: 'object',
            required: ['en', 'es', 'fr'],
          },
        },
      },
    },
  },
};

// Ingredient schema (simplified)
const ingredientSchema = {
  type: 'object',
  required: ['id', 'name', 'category', 'avgPrice', 'unit'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: {
      type: 'object',
      required: ['en', 'es', 'fr'],
      properties: {
        en: { type: 'string', minLength: 1 },
        es: { type: 'string', minLength: 1 },
        fr: { type: 'string', minLength: 1 },
      },
    },
    category: { type: 'string' },
    avgPrice: { type: 'number', minimum: 0 },
    unit: { type: 'string' },
  },
};

async function validateJSONFiles() {
  console.log('📋 Validating JSON files...\n');

  const validateRecipe = ajv.compile(recipeSchema);
  const validateIngredient = ajv.compile(ingredientSchema);

  let hasErrors = false;

  // Validate recipes
  try {
    const content = await readFile(RECIPES_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Support both array format and object with recipes array
    const recipes = Array.isArray(data) ? data : data.recipes;

    if (!recipes || !Array.isArray(recipes)) {
      console.error(`❌ ${RECIPES_FILE}: Invalid format - expected array or object with 'recipes' array`);
      hasErrors = true;
    } else {
      console.log(`Validating ${recipes.length} recipes...`);

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        const recipeId = recipe.id || `recipe-${i}`;
        const valid = validateRecipe(recipe);

        if (!valid) {
          console.error(`\n❌ Recipe ${recipeId}:`);
          validateRecipe.errors?.forEach(err => {
            console.error(`  ${err.instancePath} ${err.message}`);
          });
          hasErrors = true;
        } else {
          console.log(`  ✓ ${recipeId}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error reading recipes file: ${error.message}`);
    hasErrors = true;
  }

  // Validate ingredients
  try {
    const content = await readFile(INGREDIENTS_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Support both array format and object with ingredients array
    const ingredients = Array.isArray(data) ? data : data.ingredients;

    if (!ingredients || !Array.isArray(ingredients)) {
      console.error(`❌ ${INGREDIENTS_FILE}: Invalid format - expected array or object with 'ingredients' array`);
      hasErrors = true;
    } else {
      console.log(`\nValidating ${ingredients.length} ingredients...`);

      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        const ingredientId = ingredient.id || `ingredient-${i}`;
        const valid = validateIngredient(ingredient);

        if (!valid) {
          console.error(`\n❌ Ingredient ${ingredientId}:`);
          validateIngredient.errors?.forEach(err => {
            console.error(`  ${err.instancePath} ${err.message}`);
          });
          hasErrors = true;
        } else {
          console.log(`  ✓ ${ingredientId}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error reading ingredients file: ${error.message}`);
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log('\n✅ All JSON files are valid!\n');
    return 0;
  }

  console.log('\n❌ JSON validation failed.\n');
  return 1;
}

validateJSONFiles().then(process.exit);
