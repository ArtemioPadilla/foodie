#!/usr/bin/env node

/**
 * Translation Synchronization Validator
 *
 * This script validates that all translation files have:
 * - Identical key structures
 * - No duplicate keys
 * - No empty values
 * - Valid JSON format
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const LANGUAGES = ['en', 'es', 'fr'];

let hasErrors = false;

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Check for empty values
 */
function checkEmptyValues(obj, lang, prefix = '') {
  const emptyPaths = [];

  for (const key in obj) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'string') {
      if (value.trim() === '') {
        emptyPaths.push(currentPath);
      }
    } else if (typeof value === 'object' && value !== null) {
      emptyPaths.push(...checkEmptyValues(value, lang, currentPath));
    }
  }

  return emptyPaths;
}

/**
 * Check for duplicate keys
 */
function checkDuplicates(keys) {
  const duplicates = [];
  const seen = new Set();

  keys.forEach(key => {
    if (seen.has(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  });

  return duplicates;
}

/**
 * Main validation function
 */
async function validateTranslations() {
  console.log('🔍 Validating translation files...\n');

  const translations = {};

  // Load all translation files
  for (const lang of LANGUAGES) {
    const filePath = path.join(LOCALES_DIR, lang, 'translation.json');

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      translations[lang] = JSON.parse(content);
      console.log(`✅ Loaded ${lang}/translation.json`);
    } catch (error) {
      console.error(`❌ Failed to load ${lang}/translation.json:`, error.message);
      hasErrors = true;
      return;
    }
  }

  console.log('');

  // Get keys for each language
  const keysByLang = {};
  for (const lang of LANGUAGES) {
    keysByLang[lang] = getAllKeys(translations[lang]).sort();
  }

  // Check for duplicate keys
  console.log('Checking for duplicate keys...');
  for (const lang of LANGUAGES) {
    const duplicates = checkDuplicates(keysByLang[lang]);
    if (duplicates.length > 0) {
      console.error(`❌ Duplicate keys in ${lang}:`, duplicates);
      hasErrors = true;
    } else {
      console.log(`✅ No duplicates in ${lang}`);
    }
  }

  console.log('');

  // Check for empty values
  console.log('Checking for empty values...');
  for (const lang of LANGUAGES) {
    const emptyPaths = checkEmptyValues(translations[lang], lang);
    if (emptyPaths.length > 0) {
      console.error(`❌ Empty values in ${lang}:`, emptyPaths);
      hasErrors = true;
    } else {
      console.log(`✅ No empty values in ${lang}`);
    }
  }

  console.log('');

  // Check key consistency across languages
  console.log('Checking key consistency across languages...');

  const enKeys = new Set(keysByLang['en']);
  const esKeys = new Set(keysByLang['es']);
  const frKeys = new Set(keysByLang['fr']);

  const missingInEs = [...enKeys].filter(key => !esKeys.has(key));
  const missingInFr = [...enKeys].filter(key => !frKeys.has(key));
  const extraInEs = [...esKeys].filter(key => !enKeys.has(key));
  const extraInFr = [...frKeys].filter(key => !enKeys.has(key));

  if (missingInEs.length > 0) {
    console.error(`❌ Keys missing in Spanish:`, missingInEs);
    hasErrors = true;
  }

  if (missingInFr.length > 0) {
    console.error(`❌ Keys missing in French:`, missingInFr);
    hasErrors = true;
  }

  if (extraInEs.length > 0) {
    console.error(`❌ Extra keys in Spanish:`, extraInEs);
    hasErrors = true;
  }

  if (extraInFr.length > 0) {
    console.error(`❌ Extra keys in French:`, extraInFr);
    hasErrors = true;
  }

  if (missingInEs.length === 0 && missingInFr.length === 0 && extraInEs.length === 0 && extraInFr.length === 0) {
    console.log(`✅ All languages have matching keys`);
  }

  console.log('');

  // Summary
  console.log('Summary:');
  console.log(`  Total keys per language: ${keysByLang['en'].length}`);
  console.log(`  Languages validated: ${LANGUAGES.join(', ')}`);

  if (hasErrors) {
    console.log('\n❌ Validation failed! Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All translation files are valid and synchronized!');
    process.exit(0);
  }
}

// Run validation
validateTranslations().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
