#!/usr/bin/env node

/**
 * Validate recipe and ingredient JSON files against schema
 * Usage: node scripts/validateJSON.js
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const RECIPES_DIR = './public/data/recipes';
const INGREDIENTS_DIR = './public/data/ingredients';

// Recipe schema (simplified)
const recipeSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'cuisine', 'category', 'difficulty', 'prepTime', 'cookTime', 'servings', 'ingredients', 'instructions'],
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
    cuisine: { type: 'string' },
    category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] },
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
  required: ['id', 'name', 'category', 'avgPrice', 'unitType'],
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
    unitType: { type: 'string' },
  },
};

async function validateJSONFiles() {
  console.log('📋 Validating JSON files...\n');

  const validateRecipe = ajv.compile(recipeSchema);
  const validateIngredient = ajv.compile(ingredientSchema);

  let hasErrors = false;

  // Validate recipes
  try {
    const recipeFiles = await readdir(RECIPES_DIR);
    console.log(`Validating ${recipeFiles.length} recipe files...`);

    for (const file of recipeFiles) {
      if (!file.endsWith('.json')) continue;

      const content = await readFile(join(RECIPES_DIR, file), 'utf-8');

      try {
        const recipe = JSON.parse(content);
        const valid = validateRecipe(recipe);

        if (!valid) {
          console.error(`\n❌ ${file}:`);
          validateRecipe.errors?.forEach(err => {
            console.error(`  ${err.instancePath} ${err.message}`);
          });
          hasErrors = true;
        } else {
          console.log(`  ✓ ${file}`);
        }
      } catch (error) {
        console.error(`\n❌ ${file}: Invalid JSON`);
        console.error(`  ${error.message}`);
        hasErrors = true;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading recipes directory: ${error.message}`);
    hasErrors = true;
  }

  // Validate ingredients
  try {
    const ingredientFiles = await readdir(INGREDIENTS_DIR);
    console.log(`\nValidating ${ingredientFiles.length} ingredient files...`);

    for (const file of ingredientFiles) {
      if (!file.endsWith('.json')) continue;

      const content = await readFile(join(INGREDIENTS_DIR, file), 'utf-8');

      try {
        const ingredient = JSON.parse(content);
        const valid = validateIngredient(ingredient);

        if (!valid) {
          console.error(`\n❌ ${file}:`);
          validateIngredient.errors?.forEach(err => {
            console.error(`  ${err.instancePath} ${err.message}`);
          });
          hasErrors = true;
        } else {
          console.log(`  ✓ ${file}`);
        }
      } catch (error) {
        console.error(`\n❌ ${file}: Invalid JSON`);
        console.error(`  ${error.message}`);
        hasErrors = true;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading ingredients directory: ${error.message}`);
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
