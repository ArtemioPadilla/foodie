#!/usr/bin/env node

/**
 * Check for duplicate recipes in the database
 * Usage: node scripts/checkDuplicates.js
 */

import { readFile } from 'fs/promises';

const RECIPES_FILE = './public/data/recipes.json';

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate recipes...\n');

  try {
    // Read recipes file
    const content = await readFile(RECIPES_FILE, 'utf-8');
    const data = JSON.parse(content);
    const recipes = data.recipes || data;

    // Check for duplicate IDs
    const ids = new Map();
    const duplicateIds = [];

    recipes.forEach((recipe, index) => {
      if (ids.has(recipe.id)) {
        duplicateIds.push({
          id: recipe.id,
          indices: [ids.get(recipe.id), index],
        });
      } else {
        ids.set(recipe.id, index);
      }
    });

    // Check for duplicate names (English)
    const names = new Map();
    const duplicateNames = [];

    recipes.forEach((recipe, index) => {
      const nameEn = recipe.name.en.toLowerCase().trim();
      if (names.has(nameEn)) {
        duplicateNames.push({
          name: recipe.name.en,
          indices: [names.get(nameEn), index],
        });
      } else {
        names.set(nameEn, index);
      }
    });

    // Report findings
    let hasErrors = false;

    if (duplicateIds.length > 0) {
      console.error('❌ Duplicate recipe IDs found:\n');
      duplicateIds.forEach(({ id, indices }) => {
        console.error(`  ID: ${id}`);
        console.error(`  Recipe indices: ${indices.join(', ')}\n`);
      });
      hasErrors = true;
    }

    if (duplicateNames.length > 0) {
      console.error('❌ Duplicate recipe names found:\n');
      duplicateNames.forEach(({ name, indices }) => {
        console.error(`  Name: ${name}`);
        console.error(`  Recipe indices: ${indices.join(', ')}\n`);
      });
      hasErrors = true;
    }

    if (!hasErrors) {
      console.log(`✅ No duplicates found! Checked ${recipes.length} recipes.\n`);
      return 0;
    }

    return 1;
  } catch (error) {
    console.error('❌ Error checking duplicates:', error.message);
    return 1;
  }
}

checkDuplicates().then(process.exit);
