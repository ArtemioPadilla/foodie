#!/usr/bin/env node

/**
 * Validate that all recipes have complete translations
 * Usage: node scripts/validateTranslations.js
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const RECIPES_DIR = './public/data/recipes';
const REQUIRED_LANGUAGES = ['en', 'es', 'fr'];

async function validateTranslations() {
  console.log('🌐 Validating recipe translations...\n');

  try {
    // Read all recipe files
    const files = await readdir(RECIPES_DIR);
    const recipeFiles = files.filter(f => f.endsWith('.json'));

    let hasErrors = false;
    const issues = [];

    for (const file of recipeFiles) {
      const content = await readFile(join(RECIPES_DIR, file), 'utf-8');
      const recipe = JSON.parse(content);

      // Check required multilingual fields
      const multilingualFields = ['name', 'description'];

      for (const field of multilingualFields) {
        if (!recipe[field]) {
          issues.push({
            file,
            field,
            error: `Missing ${field} field`,
          });
          continue;
        }

        for (const lang of REQUIRED_LANGUAGES) {
          if (!recipe[field][lang] || recipe[field][lang].trim() === '') {
            issues.push({
              file,
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
                  file,
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
              file,
              field: `instructions[${index}].text`,
              error: 'Missing text field',
            });
            return;
          }

          for (const lang of REQUIRED_LANGUAGES) {
            if (!instruction.text[lang] || instruction.text[lang].trim() === '') {
              issues.push({
                file,
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

      issues.forEach(({ file, field, error }) => {
        console.error(`  ${file}`);
        console.error(`    Field: ${field}`);
        console.error(`    Error: ${error}\n`);
      });

      hasErrors = true;
    }

    if (!hasErrors) {
      console.log(`✅ All translations complete! Checked ${recipeFiles.length} recipes.\n`);
      return 0;
    }

    return 1;
  } catch (error) {
    console.error('❌ Error validating translations:', error.message);
    return 1;
  }
}

validateTranslations().then(process.exit);
