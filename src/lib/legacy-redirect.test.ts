import { describe, expect, it, vi } from 'vitest';
import { LOCALES } from '@/i18n';
import {
  LEGACY_REDIRECT_LOCALES,
  decodeLegacySpaUrl,
  legacyRedirectTarget,
  preferredLegacyLocale,
  runLegacyRedirect,
} from './legacy-redirect';

/** v1's public/404-redirect.js (rafgraph/spa-github-pages, pathSegmentsToKeep = 1), verbatim logic. */
function encodeLikeV1(pathname: string, search = '', hash = ''): string {
  const keep = 1;
  return (
    pathname.split('/').slice(0, 1 + keep).join('/') +
    '/?/' +
    pathname.slice(1).split('/').slice(keep).join('/').replace(/&/g, '~and~') +
    (search ? '&' + search.slice(1).replace(/&/g, '~and~') : '') +
    hash
  );
}

describe('decodeLegacySpaUrl', () => {
  it('ignores URLs that are not in the ?/ form', () => {
    expect(decodeLegacySpaUrl('')).toBeNull();
    expect(decodeLegacySpaUrl('?q=1')).toBeNull();
    expect(decodeLegacySpaUrl('?%2Frecipes')).toBeNull();
  });

  it('decodes a v1 deep link into a trailing-slash path', () => {
    expect(decodeLegacySpaUrl('?/recipes/rec_001')).toEqual({ path: '/recipes/rec_001/', search: '', hash: '' });
    expect(decodeLegacySpaUrl('?/')).toEqual({ path: '/', search: '', hash: '' });
    expect(decodeLegacySpaUrl('?/planner/')).toEqual({ path: '/planner/', search: '', hash: '' });
  });

  it('restores the original query (first & separates, ~and~ is an escaped &) and keeps the hash', () => {
    expect(decodeLegacySpaUrl('?/recipes&type=breakfast~and~q=egg', '#top')).toEqual({
      path: '/recipes/',
      search: '?type=breakfast&q=egg',
      hash: '#top',
    });
    expect(decodeLegacySpaUrl('?/tracking/goals~and~more')).toEqual({ path: '/tracking/goals&more/', search: '', hash: '' });
  });

  it('round-trips everything v1 encoded', () => {
    const cases: Array<[string, string, string, string]> = [
      ['/foodie/recipes/rec_001', '', '', '/recipes/rec_001/'],
      ['/foodie/ingredients/ing_101', '?from=pantry', '#nutrition', '/ingredients/ing_101/?from=pantry#nutrition'],
      ['/foodie/recipes', '?cuisine=mexican&diet=vegan', '', '/recipes/?cuisine=mexican&diet=vegan'],
      ['/foodie/shopping', '', '', '/shopping/'],
    ];
    for (const [pathname, search, hash, expected] of cases) {
      const encoded = encodeLikeV1(pathname, search, hash);
      const url = new URL(encoded, 'https://artemiopadilla.github.io');
      expect(url.pathname).toBe('/foodie/');
      const decoded = decodeLegacySpaUrl(url.search, url.hash)!;
      expect(`${decoded.path}${decoded.search}${decoded.hash}`).toBe(expected);
    }
  });

  it('can never produce a protocol-relative (off-site) path', () => {
    expect(decodeLegacySpaUrl('?//evil.example/x')?.path).toBe('/evil.example/x/');
    expect(decodeLegacySpaUrl('?/\\evil.example')?.path).toBe('/evil.example/');
    expect(decodeLegacySpaUrl('?/\\/\\evil.example')?.path).toBe('/evil.example/');
  });
});

describe('legacyRedirectTarget', () => {
  it('prefixes the deploy base once', () => {
    expect(legacyRedirectTarget({ search: '?/recipes/rec_001', base: '/foodie/' })).toBe('/foodie/recipes/rec_001/');
    expect(legacyRedirectTarget({ search: '?/recipes/rec_001', base: '/' })).toBe('/recipes/rec_001/');
    expect(legacyRedirectTarget({ search: '?//evil.example', base: '/' })).toBe('/evil.example/');
  });

  it('localizes to the remembered language unless the path already has a locale', () => {
    expect(legacyRedirectTarget({ search: '?/planner', base: '/foodie/', locale: 'fr' })).toBe('/foodie/fr/planner/');
    expect(legacyRedirectTarget({ search: '?/', base: '/foodie/', locale: 'es' })).toBe('/foodie/es/');
    expect(legacyRedirectTarget({ search: '?/es/recipes', base: '/foodie/', locale: 'fr' })).toBe('/foodie/es/recipes/');
    expect(legacyRedirectTarget({ search: '?/recipes&q=a~and~b', hash: '#h', base: '/foodie/', locale: 'en' })).toBe(
      '/foodie/recipes/?q=a&b#h',
    );
  });

  it('returns null for ordinary URLs', () => {
    expect(legacyRedirectTarget({ search: '?q=1', base: '/foodie/' })).toBeNull();
  });
});

describe('preferredLegacyLocale', () => {
  const storage = (values: Record<string, string>) => ({ getItem: (k: string) => values[k] ?? null });

  it('prefers foodie:locale, then v1 i18nextLng, then en', () => {
    expect(preferredLegacyLocale(storage({ 'foodie:locale': 'fr', i18nextLng: 'es' }))).toBe('fr');
    expect(preferredLegacyLocale(storage({ i18nextLng: 'es-MX' }))).toBe('es');
    expect(preferredLegacyLocale(storage({ i18nextLng: 'de' }))).toBe('en');
    expect(preferredLegacyLocale(null)).toBe('en');
    expect(
      preferredLegacyLocale({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('en');
  });

  it('knows the same locales as the site', () => {
    expect([...LEGACY_REDIRECT_LOCALES]).toEqual([...LOCALES]);
  });
});

describe('runLegacyRedirect', () => {
  const win = (href: string, stored: Record<string, string> = {}) => {
    const url = new URL(href, 'https://artemiopadilla.github.io');
    const replace = vi.fn();
    return {
      replace,
      win: {
        location: { pathname: url.pathname, search: url.search, hash: url.hash, replace } as unknown as Location,
        localStorage: { getItem: (k: string) => stored[k] ?? null } as unknown as Storage,
      },
    };
  };

  it('replaces the location once with the new route', () => {
    const { win: w, replace } = win('/foodie/?/recipes/rec_001&servings=4');
    expect(runLegacyRedirect(w, '/foodie/')).toBe('/foodie/recipes/rec_001/?servings=4');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/foodie/recipes/rec_001/?servings=4');
  });

  it('uses the language v1 remembered', () => {
    const { win: w, replace } = win('/foodie/?/shopping', { i18nextLng: 'es' });
    runLegacyRedirect(w, '/foodie/');
    expect(replace).toHaveBeenCalledWith('/foodie/es/shopping/');
  });

  it('does nothing on ordinary URLs', () => {
    const { win: w, replace } = win('/foodie/recipes/?q=egg');
    expect(runLegacyRedirect(w, '/foodie/')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
