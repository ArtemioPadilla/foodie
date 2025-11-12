import { describe, it, expect } from 'vitest';
import enTranslations from '../../public/locales/en/translation.json';
import esTranslations from '../../public/locales/es/translation.json';
import frTranslations from '../../public/locales/fr/translation.json';

describe('Translation File Schema Validation', () => {
  /**
   * Recursively get all keys from a nested object
   */
  const getAllKeys = (obj: any, prefix = ''): string[] => {
    let keys: string[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively get keys from nested objects
        keys = keys.concat(getAllKeys(obj[key], fullKey));
      } else {
        // Leaf node - actual translation string
        keys.push(fullKey);
      }
    }

    return keys;
  };

  describe('Key Consistency Across Languages', () => {
    it('should have identical key structures in all languages', () => {
      const enKeys = getAllKeys(enTranslations).sort();
      const esKeys = getAllKeys(esTranslations).sort();
      const frKeys = getAllKeys(frTranslations).sort();

      // All languages should have exactly the same keys
      expect(enKeys).toEqual(esKeys);
      expect(enKeys).toEqual(frKeys);
      expect(esKeys).toEqual(frKeys);
    });

    it('should have the same number of keys in all languages', () => {
      const enKeys = getAllKeys(enTranslations);
      const esKeys = getAllKeys(esTranslations);
      const frKeys = getAllKeys(frTranslations);

      expect(enKeys.length).toBe(esKeys.length);
      expect(enKeys.length).toBe(frKeys.length);
    });
  });

  describe('Duplicate Key Detection', () => {
    it('should have no duplicate keys in English', () => {
      const keys = getAllKeys(enTranslations);
      const uniqueKeys = new Set(keys);

      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should have no duplicate keys in Spanish', () => {
      const keys = getAllKeys(esTranslations);
      const uniqueKeys = new Set(keys);

      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should have no duplicate keys in French', () => {
      const keys = getAllKeys(frTranslations);
      const uniqueKeys = new Set(keys);

      expect(keys.length).toBe(uniqueKeys.size);
    });
  });

  describe('Required Top-Level Keys', () => {
    const requiredKeys = [
      'app',
      'nav',
      'common',
      'recipe',
      'planner',
      'shopping',
      'pantry',
      'contribute',
      'profile',
      'auth',
      'filter',
      'dietary',
      'cuisine',
      'category',
    ];

    it('should have all required top-level keys in English', () => {
      requiredKeys.forEach(key => {
        expect(enTranslations).toHaveProperty(key);
      });
    });

    it('should have all required top-level keys in Spanish', () => {
      requiredKeys.forEach(key => {
        expect(esTranslations).toHaveProperty(key);
      });
    });

    it('should have all required top-level keys in French', () => {
      requiredKeys.forEach(key => {
        expect(frTranslations).toHaveProperty(key);
      });
    });
  });

  describe('Empty String Validation', () => {
    const checkNoEmptyStrings = (obj: any, path = '', lang = ''): string[] => {
      const emptyPaths: string[] = [];

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof obj[key] === 'string') {
          if (obj[key].trim() === '') {
            emptyPaths.push(`${lang}:${currentPath}`);
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          emptyPaths.push(...checkNoEmptyStrings(obj[key], currentPath, lang));
        }
      }

      return emptyPaths;
    };

    it('should have no empty strings in English', () => {
      const emptyPaths = checkNoEmptyStrings(enTranslations, '', 'en');
      expect(emptyPaths, `Empty strings found: ${emptyPaths.join(', ')}`).toHaveLength(0);
    });

    it('should have no empty strings in Spanish', () => {
      const emptyPaths = checkNoEmptyStrings(esTranslations, '', 'es');
      expect(emptyPaths, `Empty strings found: ${emptyPaths.join(', ')}`).toHaveLength(0);
    });

    it('should have no empty strings in French', () => {
      const emptyPaths = checkNoEmptyStrings(frTranslations, '', 'fr');
      expect(emptyPaths, `Empty strings found: ${emptyPaths.join(', ')}`).toHaveLength(0);
    });
  });

  describe('Critical Translation Keys', () => {
    const criticalKeys = [
      'app.name',
      'app.tagline',
      'nav.home',
      'nav.recipes',
      'nav.planner',
      'nav.shopping',
      'nav.pantry',
      'nav.contribute',
      'common.save',
      'common.cancel',
      'common.delete',
      'common.loading',
      'common.error',
    ];

    it('should have all critical keys in all languages', () => {
      const enKeys = getAllKeys(enTranslations);
      const esKeys = getAllKeys(esTranslations);
      const frKeys = getAllKeys(frTranslations);

      criticalKeys.forEach(key => {
        expect(enKeys, `Missing ${key} in English`).toContain(key);
        expect(esKeys, `Missing ${key} in Spanish`).toContain(key);
        expect(frKeys, `Missing ${key} in French`).toContain(key);
      });
    });
  });

  describe('JSON Structure Validation', () => {
    it('should have valid JSON structure in English', () => {
      expect(() => JSON.parse(JSON.stringify(enTranslations))).not.toThrow();
    });

    it('should have valid JSON structure in Spanish', () => {
      expect(() => JSON.parse(JSON.stringify(esTranslations))).not.toThrow();
    });

    it('should have valid JSON structure in French', () => {
      expect(() => JSON.parse(JSON.stringify(frTranslations))).not.toThrow();
    });
  });

  describe('Translation Value Types', () => {
    const checkValueTypes = (obj: any, path = ''): { path: string; type: string }[] => {
      const invalidTypes: { path: string; type: string }[] = [];

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (value === null || value === undefined) {
          invalidTypes.push({ path: currentPath, type: typeof value });
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Nested object - recurse
          invalidTypes.push(...checkValueTypes(value, currentPath));
        } else if (typeof value !== 'string') {
          // Leaf node should always be string
          invalidTypes.push({ path: currentPath, type: typeof value });
        }
      }

      return invalidTypes;
    };

    it('should only have string values as leaf nodes in English', () => {
      const invalidTypes = checkValueTypes(enTranslations);
      expect(invalidTypes, `Invalid types: ${JSON.stringify(invalidTypes)}`).toHaveLength(0);
    });

    it('should only have string values as leaf nodes in Spanish', () => {
      const invalidTypes = checkValueTypes(esTranslations);
      expect(invalidTypes, `Invalid types: ${JSON.stringify(invalidTypes)}`).toHaveLength(0);
    });

    it('should only have string values as leaf nodes in French', () => {
      const invalidTypes = checkValueTypes(frTranslations);
      expect(invalidTypes, `Invalid types: ${JSON.stringify(invalidTypes)}`).toHaveLength(0);
    });
  });

  describe('Missing Translations Report', () => {
    it('should report any keys present in one language but missing in others', () => {
      const enKeys = new Set(getAllKeys(enTranslations));
      const esKeys = new Set(getAllKeys(esTranslations));
      const frKeys = new Set(getAllKeys(frTranslations));

      const missingInSpanish = [...enKeys].filter(key => !esKeys.has(key));
      const missingInFrench = [...enKeys].filter(key => !frKeys.has(key));
      const extraInSpanish = [...esKeys].filter(key => !enKeys.has(key));
      const extraInFrench = [...frKeys].filter(key => !enKeys.has(key));

      const report = {
        missingInSpanish,
        missingInFrench,
        extraInSpanish,
        extraInFrench,
      };

      // All arrays should be empty (no missing or extra keys)
      expect(report.missingInSpanish, 'Keys missing in Spanish').toHaveLength(0);
      expect(report.missingInFrench, 'Keys missing in French').toHaveLength(0);
      expect(report.extraInSpanish, 'Extra keys in Spanish').toHaveLength(0);
      expect(report.extraInFrench, 'Extra keys in French').toHaveLength(0);
    });
  });
});
