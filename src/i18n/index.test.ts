import { describe, it, expect } from 'vitest';
import {
  t,
  detectLocale,
  localizedPath,
  hreflangAlternates,
  stripBase,
  isLocale,
  LOCALES,
  LOCALE_NAMES,
  DEFAULT_LOCALE,
  dictionaries,
  collectLeafKeys,
} from './index';

// Unit tests for the i18n core (roadmap Issue 004, D7): three routed locales
// and a `t()` that reproduces the two i18next features the legacy
// dictionaries depend on — `{{name}}` interpolation and `_plural` keys.

describe('locales', () => {
  it('routes exactly en, es and fr with en as the default', () => {
    expect([...LOCALES]).toEqual(['en', 'es', 'fr']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(Object.keys(dictionaries).sort()).toEqual(['en', 'es', 'fr']);
    expect(LOCALE_NAMES.fr).toBe('Français');
  });

  it('isLocale narrows untrusted strings', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('every locale carries exactly the English leaf keys', () => {
    const enKeys = collectLeafKeys(dictionaries.en).sort();
    for (const locale of LOCALES) {
      expect(collectLeafKeys(dictionaries[locale]).sort(), locale).toEqual(enKeys);
    }
  });
});

describe('detectLocale / localizedPath with fr', () => {
  it('detects the fr prefix and ignores look-alikes', () => {
    expect(detectLocale('/fr')).toBe('fr');
    expect(detectLocale('/fr/docs/')).toBe('fr');
    expect(detectLocale('/fruit/')).toBe('en');
    expect(detectLocale('/freshly/')).toBe('en');
  });

  it('switches between all three locales preserving the route', () => {
    expect(localizedPath('/docs/', 'fr')).toBe('/fr/docs/');
    expect(localizedPath('/fr/docs/', 'es')).toBe('/es/docs/');
    expect(localizedPath('/fr/docs/', 'en')).toBe('/docs/');
    expect(localizedPath('/es', 'fr')).toBe('/fr');
    expect(localizedPath('/fr/', 'en')).toBe('/');
  });
});

describe('t() interpolation', () => {
  it('replaces {{name}} placeholders from params', () => {
    expect(t('en', 'common.maxTimeFormat', { time: 30 })).toBe('≤30m');
    expect(t('en', 'common.checkedProgress', { checked: 2, total: 5 })).toBe('2 / 5 checked');
    expect(t('es', 'common.checkedProgress', { checked: 2, total: 5 })).toBe('2 / 5 marcados');
  });

  it('accepts string values as well as numbers', () => {
    expect(t('en', 'common.maxTimeFormat', { time: '45' })).toBe('≤45m');
  });

  it('leaves unknown placeholders visible instead of blanking them', () => {
    expect(t('en', 'common.checkedProgress', { checked: 1 })).toBe('1 / {{total}} checked');
  });

  it('returns the raw value when no params are given', () => {
    expect(t('en', 'common.showMore')).toBe('Show {{count}} more');
  });

  it('does not treat prototype properties as params', () => {
    expect(t('en', 'common.maxTimeFormat', { constructor: 1 } as never)).toBe('≤{{time}}m');
  });
});

describe('t() plurals', () => {
  it('uses the singular key when count === 1', () => {
    expect(t('en', 'common.reviewCount', { count: 1 })).toBe('1 review');
    expect(t('es', 'common.reviewCount', { count: 1 })).toBe('1 reseña');
  });

  it('resolves <key>_plural when count !== 1 (0, 2, 3, …)', () => {
    expect(t('en', 'common.reviewCount', { count: 0 })).toBe('0 reviews');
    expect(t('en', 'common.reviewCount', { count: 3 })).toBe('3 reviews');
    expect(t('es', 'common.reviewCount', { count: 3 })).toBe('3 reseñas');
    expect(t('fr', 'common.reviewCount', { count: 3 })).toBe('3 avis');
  });

  it('falls back to the singular key when no plural variant exists', () => {
    // showMore has no _plural entry — the singular still interpolates count.
    expect(t('en', 'common.showMore', { count: 3 })).toBe('Show 3 more');
  });

  it('ignores a non-numeric count for plural resolution', () => {
    expect(t('en', 'common.reviewCount', { count: 'many' })).toBe('many review');
  });

  it('keeps the legacy signature working (locale, key) and (locale, key, params)', () => {
    expect(t('fr', 'nav.home')).toBe('Accueil');
    expect(t('fr', 'nav.nonexistent', { count: 2 })).toBe('nav.nonexistent');
  });
});

describe('stripBase', () => {
  it('removes the deploy base only when present', () => {
    expect(stripBase('/foodie/es/docs/', '/foodie/')).toBe('/es/docs/');
    expect(stripBase('/foodie', '/foodie/')).toBe('/');
    expect(stripBase('/es/docs/', '/foodie/')).toBe('/es/docs/');
    expect(stripBase('/es/docs/', '/')).toBe('/es/docs/');
    expect(stripBase('/foodiebar/', '/foodie')).toBe('/foodiebar/');
  });
});

describe('hreflangAlternates', () => {
  it('emits every locale plus x-default under origin + base', () => {
    const links = hreflangAlternates('/docs/', 'https://artemiopadilla.github.io', '/foodie/');
    expect(links).toEqual([
      { hreflang: 'en', href: 'https://artemiopadilla.github.io/foodie/docs/' },
      { hreflang: 'es', href: 'https://artemiopadilla.github.io/foodie/es/docs/' },
      { hreflang: 'fr', href: 'https://artemiopadilla.github.io/foodie/fr/docs/' },
      { hreflang: 'x-default', href: 'https://artemiopadilla.github.io/foodie/docs/' },
    ]);
  });

  it('handles the site root and a root base', () => {
    const links = hreflangAlternates('/', 'https://example.org', '/');
    expect(links.map((l) => l.href)).toEqual([
      'https://example.org/',
      'https://example.org/es/',
      'https://example.org/fr/',
      'https://example.org/',
    ]);
  });
});
