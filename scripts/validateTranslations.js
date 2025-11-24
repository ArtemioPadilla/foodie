#!/usr/bin/env node

/**
 * Validate that all recipes have complete translations
 * Usage: node scripts/validateTranslations.js
 */

import { readFile } from 'fs/promises';

const RECIPES_FILE = './public/data/recipes.json';
const REQUIRED_LANGUAGES = ['en', 'es', 'fr'];

async function validateTranslations() {
  console.log('🌐 Validating recipe translations...\n');

  try {
    // Read recipes file
    const content = await readFile(RECIPES_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Support both array format and object with recipes array
    const recipes = Array.isArray(data) ? data : data.recipes;

    if (!recipes || !Array.isArray(recipes)) {
      console.error(`❌ ${RECIPES_FILE}: Invalid format - expected array or object with 'recipes' array`);
      return 1;
    }

    let hasErrors = false;
    const issues = [];

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const recipeId = recipe.id || `recipe-${i}`;

      // Check required multilingual fields
      const multilingualFields = ['name', 'description'];

      for (const field of multilingualFields) {
        if (!recipe[field]) {
          issues.push({
            recipeId,
            field,
            error: `Missing ${field} field`,
          });
          continue;
        }

        for (const lang of REQUIRED_LANGUAGES) {
          if (!recipe[field][lang] || recipe[field][lang].trim() === '') {
            issues.push({
              recipeId,
              field: `${field}.${lang}`,
              error: `Missing or empty translation`,
            });
          }
        }
      }

      // Check ingredients
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach((ingredient, index) => {
          if (ingredient.notes) {
            for (const lang of REQUIRED_LANGUAGES) {
              if (!ingredient.notes[lang]) {
                issues.push({
                  recipeId,
                  field: `ingredients[${index}].notes.${lang}`,
                  error: 'Missing translation',
                });
              }
            }
          }
        });
      }

      // Check instructions
      if (recipe.instructions && Array.isArray(recipe.instructions)) {
        recipe.instructions.forEach((instruction, index) => {
          if (!instruction.text) {
            issues.push({
              recipeId,
              field: `instructions[${index}].text`,
              error: 'Missing text field',
            });
            return;
          }

          for (const lang of REQUIRED_LANGUAGES) {
            if (!instruction.text[lang] || instruction.text[lang].trim() === '') {
              issues.push({
                recipeId,
                field: `instructions[${index}].text.${lang}`,
                error: 'Missing or empty translation',
              });
            }
          }
        });
      }
    }

    // Report findings
    if (issues.length > 0) {
      console.error(`❌ Found ${issues.length} translation issues:\n`);

      issues.forEach(({ recipeId, field, error }) => {
        console.error(`  Recipe: ${recipeId}`);
        console.error(`    Field: ${field}`);
        console.error(`    Error: ${error}\n`);
      });

      hasErrors = true;
    }

    if (!hasErrors) {
      console.log(`✅ All translations complete! Checked ${recipes.length} recipes.\n`);
      return 0;
    }

    return 1;
  } catch (error) {
    console.error('❌ Error validating translations:', error.message);
    return 1;
  }
}

validateTranslations().then(process.exit);
