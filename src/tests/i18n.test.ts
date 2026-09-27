import { describe, it, expect } from 'vitest';
import { detectLocale, localizedPath, localizedRoute, t, LOCALES, DEFAULT_LOCALE, collectLeafKeys, dictionaries } from '../i18n';

describe('i18n', () => {
  describe('detectLocale', () => {
    it('returns the default locale for unprefixed paths', () => {
      expect(detectLocale('/')).toBe('en');
      expect(detectLocale('/gallery')).toBe('en');
      expect(detectLocale('/docs/start-here/quick-start')).toBe('en');
    });

    it('detects an explicit locale prefix', () => {
      expect(detectLocale('/es')).toBe('es');
      expect(detectLocale('/es/')).toBe('es');
      expect(detectLocale('/es/about')).toBe('es');
      expect(detectLocale('/fr')).toBe('fr');
      expect(detectLocale('/fr/about')).toBe('fr');
    });

    it('does not match partial matches like /espresso or /fruit', () => {
      expect(detectLocale('/espresso')).toBe('en');
      expect(detectLocale('/fruit')).toBe('en');
    });
  });

  describe('localizedPath', () => {
    it('strips the prefix when switching to the default locale', () => {
      expect(localizedPath('/es/about', 'en')).toBe('/about');
      expect(localizedPath('/es', 'en')).toBe('/');
    });

    it('adds the prefix when switching to a non-default locale', () => {
      expect(localizedPath('/about', 'es')).toBe('/es/about');
      expect(localizedPath('/', 'es')).toBe('/es');
      expect(localizedPath('/about', 'fr')).toBe('/fr/about');
      expect(localizedPath('/es/about', 'fr')).toBe('/fr/about');
    });

    it('round-trips between locales without losing the path', () => {
      const original = '/gallery/button';
      const inEs = localizedPath(original, 'es');
      const backToEn = localizedPath(inEs, 'en');
      expect(backToEn).toBe(original);
    });
  });

  describe('t', () => {
    it('resolves a dot-path key in the requested locale', () => {
      expect(t('en', 'nav.home')).toBe('Home');
      expect(t('es', 'nav.home')).toBe('Inicio');
      expect(t('fr', 'nav.home')).toBe('Accueil');
    });

    it('falls back to the default locale when a key is missing', () => {
      // Force a missing key by asking for one we know is not in the dictionaries
      const missing = t('es', 'nav.nonexistent');
      // We expect the raw key back (or the default-locale value if it existed)
      expect(missing).toBe('nav.nonexistent');
    });
  });

  describe('module shape', () => {
    it('exposes the configured locale list', () => {
      expect(LOCALES).toContain('en');
      expect(LOCALES).toContain('es');
      expect(LOCALES).toContain('fr');
      expect(LOCALES).toHaveLength(3);
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });

  // ── Key parity (issue #176, ×3 since roadmap Issue 004) ───────────────────
  // English is the structural source of truth. Every non-English locale must
  // carry exactly the same leaf keys — no more, no fewer. A missing key is a
  // compile error in es.ts / fr.ts (typeof en constraint), and a *narrower*
  // shape is blocked here at runtime so stale translations get caught in CI.
  describe('key parity', () => {
    const enKeys = collectLeafKeys(dictionaries['en']).sort();
    const others = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

    it('covers every non-default locale (es, fr)', () => {
      expect([...others]).toEqual(['es', 'fr']);
    });

    for (const locale of others) {
      it(`${locale} contains every key that en contains`, () => {
        const keys = collectLeafKeys(dictionaries[locale]).sort();
        const missing = enKeys.filter((k) => !keys.includes(k));
        expect(missing, `Keys in en but missing in ${locale}: ${missing.join(', ')}`).toEqual([]);
      });

      it(`en contains every key that ${locale} contains (no orphan ${locale} keys)`, () => {
        const keys = collectLeafKeys(dictionaries[locale]).sort();
        const extra = keys.filter((k) => !enKeys.includes(k));
        expect(extra, `Keys in ${locale} but missing in en: ${extra.join(', ')}`).toEqual([]);
      });
    }

    it('collectLeafKeys produces flat dot-paths', () => {
      const keys = collectLeafKeys({ nav: { home: 'Home', switchLanguage: 'Español' } });
      expect(keys).toContain('nav.home');
      expect(keys).toContain('nav.switchLanguage');
    });
  });

  // ── localizedRoute (roadmap Issue 005) ─────────────────────────────────────
  describe('localizedRoute', () => {
    it('always ends with a slash, including the localized roots', () => {
      expect(localizedRoute('/', 'en')).toBe('/');
      expect(localizedRoute('/', 'es')).toBe('/es/');
      expect(localizedRoute('/', 'fr')).toBe('/fr/');
      expect(localizedRoute('/recipes/', 'es')).toBe('/es/recipes/');
      expect(localizedRoute('/es/recipes', 'fr')).toBe('/fr/recipes/');
      expect(localizedRoute('/fr/recipes/', 'en')).toBe('/recipes/');
    });
  });
});

// ── Foodie dictionaries (roadmap Issue 015, D7) ─────────────────────────────
// Port of legacy `tests/unit/i18n.test.ts` (13), `tests/unit/translationSchema.test.ts`
// (19) and `scripts/validateTranslationSync.js`, now against the typed
// `src/i18n/{en,es,fr}.ts` dictionaries that absorbed `public/locales/*/translation.json`.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTranslated, type Locale } from '../i18n';

const ROOT = resolve(__dirname, '../..');
const DICTIONARY_FILES: Record<Locale, string> = {
  en: 'src/i18n/en.ts',
  es: 'src/i18n/es.ts',
  fr: 'src/i18n/fr.ts',
};

/** `{{name}}` placeholders of a value, sorted, so locales can be compared. */
function placeholdersOf(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]!).sort();
}

/** Resolve a dot-path leaf in a dictionary (undefined when missing). */
function leaf(locale: Locale, key: string): unknown {
  return key.split('.').reduce<unknown>((cur, part) => {
    return cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
  }, dictionaries[locale]);
}

/**
 * Keys per top-level group as written in the source file — a literal duplicate
 * (`save: 'Save', … save: 'Guardar'`) is a `tsc` error (TS1117) *and* is
 * reported here by name, mirroring `validateTranslationSync.js#checkDuplicates`.
 */
function duplicateKeysInSource(locale: Locale): string[] {
  const src = readFileSync(resolve(ROOT, DICTIONARY_FILES[locale]), 'utf8');
  const duplicates: string[] = [];
  const groups = new Set<string>();
  const groupRe = /^ {2}(\w+): \{\n([\s\S]*?)^ {2}\},\n/gm;
  let m: RegExpExecArray | null;
  while ((m = groupRe.exec(src))) {
    const group = m[1]!;
    if (groups.has(group)) duplicates.push(group);
    groups.add(group);
    const seen = new Set<string>();
    for (const line of m[2]!.split('\n')) {
      const km = line.match(/^ {4}'?([\w-]+)'?:/);
      if (!km) continue;
      if (seen.has(km[1]!)) duplicates.push(`${group}.${km[1]}`);
      seen.add(km[1]!);
    }
  }
  return duplicates;
}

describe('Foodie dictionaries (legacy translation.json → src/i18n)', () => {
  const enKeys = collectLeafKeys(dictionaries.en).sort();

  describe('translation loading', () => {
    it('resolves the app name and tagline in every locale', () => {
      expect(t('en', 'app.name')).toBe('Foodie');
      expect(t('es', 'app.name')).toBe('Foodie');
      expect(t('fr', 'app.name')).toBe('Foodie');
      expect(t('en', 'app.tagline')).toBe('Your Personal Meal Planning Assistant');
      expect(t('es', 'app.tagline')).toBe('Tu Asistente Personal de Planificación de Comidas');
      expect(t('fr', 'app.tagline')).toBe('Votre Assistant Personnel de Planification de Repas');
    });

    it('translates navigation items in the three locales', () => {
      expect(t('en', 'nav.recipes')).toBe('Recipes');
      expect(t('en', 'nav.shopping')).toBe('Shopping');
      expect(t('en', 'nav.pantry')).toBe('Pantry');
      expect(t('en', 'nav.contribute')).toBe('Contribute');
      expect(t('es', 'nav.recipes')).toBe('Recetas');
      expect(t('es', 'nav.planner')).toBe('Planificador');
      expect(t('fr', 'nav.recipes')).toBe('Recettes');
      expect(t('fr', 'nav.planner')).toBe('Planificateur');
    });

    it('supports exactly three languages', () => {
      expect(Object.keys(dictionaries).sort()).toEqual(['en', 'es', 'fr']);
    });
  });

  describe('translation key validation', () => {
    const sampleKeys = [
      'app.name',
      'app.tagline',
      'nav.home',
      'common.save',
      'common.cancel',
      'common.delete',
      'common.edit',
      'recipe.ingredients',
      'recipe.instructions',
      'recipe.prepTime',
      'recipe.cookTime',
    ];

    it('never returns the key itself for known keys, in any locale', () => {
      for (const locale of LOCALES) {
        for (const key of sampleKeys) {
          const value = t(locale, key);
          expect(value, `${locale}:${key}`).not.toBe(key);
          expect(value, `${locale}:${key}`).not.toMatch(/^[a-z]+\.[a-zA-Z]+$/);
          expect(value.length).toBeGreaterThan(0);
        }
      }
    });

    it('returns the raw key for unknown keys (i18next semantics)', () => {
      expect(t('en', 'this.key.does.not.exist')).toBe('this.key.does.not.exist');
      expect(t('fr', 'this.key.does.not.exist')).toBe('this.key.does.not.exist');
    });
  });

  describe('schema: parity, duplicates, empties, types', () => {
    it('keeps the 29 legacy groups plus the template groups', () => {
      const legacyGroups = [
        'app', 'nav', 'tracking', 'goals', 'progress', 'common', 'errors', 'recipe', 'planner',
        'shopping', 'pantry', 'contribute', 'profile', 'auth', 'filter', 'dietary', 'cuisine',
        'tags', 'category', 'ingredients', 'ingredient', 'season', 'nutrition', 'footer',
        'offline', 'accessibility', 'home', 'units', 'days',
      ];
      for (const locale of LOCALES) {
        for (const group of legacyGroups) {
          expect(dictionaries[locale], `${locale}.${group}`).toHaveProperty(group);
        }
      }
      // 716 legacy leaves minus the 26 keys the template already defined, plus
      // the template's own keys — never fewer than the legacy catalog of strings.
      expect(enKeys.length).toBeGreaterThanOrEqual(716);
    });

    it('has identical key structures and counts in all languages', () => {
      const esKeys = collectLeafKeys(dictionaries.es).sort();
      const frKeys = collectLeafKeys(dictionaries.fr).sort();
      expect(esKeys).toEqual(enKeys);
      expect(frKeys).toEqual(enKeys);
      expect(esKeys.length).toBe(enKeys.length);
      expect(frKeys.length).toBe(enKeys.length);
    });

    for (const locale of LOCALES) {
      it(`${locale}: has no duplicate keys`, () => {
        const keys = collectLeafKeys(dictionaries[locale]);
        expect(new Set(keys).size).toBe(keys.length);
        expect(duplicateKeysInSource(locale)).toEqual([]);
      });

      it(`${locale}: has no empty or non-string leaf values`, () => {
        const problems = collectLeafKeys(dictionaries[locale]).filter((key) => {
          const value = leaf(locale, key);
          return typeof value !== 'string' || value.trim() === '';
        });
        expect(problems, `Empty/non-string values in ${locale}: ${problems.join(', ')}`).toEqual([]);
      });
    }

    it('has every critical key in all languages', () => {
      const critical = [
        'app.name', 'app.tagline', 'nav.home', 'nav.recipes', 'nav.planner', 'nav.shopping',
        'nav.pantry', 'nav.contribute', 'common.save', 'common.cancel', 'common.delete',
        'common.loading', 'common.error',
      ];
      for (const locale of LOCALES) {
        for (const key of critical) {
          expect(typeof leaf(locale, key), `${locale}:${key}`).toBe('string');
        }
      }
    });

    it('uses the same {{placeholders}} for each key in the three locales', () => {
      const mismatches: string[] = [];
      for (const key of enKeys) {
        const expected = placeholdersOf(leaf('en', key) as string);
        for (const locale of LOCALES) {
          const actual = placeholdersOf(leaf(locale, key) as string);
          if (actual.join(',') !== expected.join(',')) {
            mismatches.push(`${locale}:${key} has {{${actual}}} vs en {{${expected}}}`);
          }
        }
      }
      expect(mismatches).toEqual([]);
    });

    it('pairs every <key>_plural with its singular key', () => {
      const plurals = enKeys.filter((k) => k.endsWith('_plural'));
      expect(plurals.length).toBeGreaterThan(0);
      for (const plural of plurals) {
        expect(enKeys, `${plural} without singular`).toContain(plural.replace(/_plural$/, ''));
      }
    });

    it('resolves the legacy hyphenated keys (tags, season) through t()', () => {
      expect(t('en', 'tags.gluten-free')).toBe('Gluten Free');
      expect(t('fr', 'season.year-round')).not.toBe('season.year-round');
    });
  });

  describe('getTranslated (catalog MultiLangText)', () => {
    const water = { en: 'Water', es: 'Agua', fr: 'Eau' };

    it('returns the requested language', () => {
      expect(getTranslated(water, 'en')).toBe('Water');
      expect(getTranslated(water, 'es')).toBe('Agua');
      expect(getTranslated(water, 'fr')).toBe('Eau');
    });

    it('falls back to English when the variant is blank', () => {
      expect(getTranslated({ ...water, es: '' }, 'es')).toBe('Water');
    });
  });

  it('public/locales/ (i18next runtime files) is gone', () => {
    expect(existsSync(resolve(ROOT, 'public/locales'))).toBe(false);
  });
});
