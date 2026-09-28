/**
 * v1 → v2 URL compatibility (roadmap Issue 030, cutover).
 *
 * Foodie v1 was a single-page app on GitHub Pages using the
 * rafgraph/spa-github-pages trick: `public/404.html` rewrote a deep link such
 * as `/foodie/recipes/rec_001?tab=a&b=1#x` into
 * `/foodie/?/recipes/rec_001&tab=a~and~b=1#x` (path in the query after `?/`,
 * the original query after the first `&`, every inner `&` escaped as
 * `~and~`), and `spa-redirect.js` decoded it back on `index.html`. Links and
 * bookmarks captured mid-rewrite carry that encoded form. v2 has a static page
 * per route (D4), so this module decodes the form once and sends the visitor
 * to the real page: base-aware, trailing slash, and in the visitor's language
 * when v1 or v2 remembered one (v1 URLs never carried a locale).
 *
 * Runs from `LegacyRedirect.astro`, included by `404.astro` and by the
 * English site root (where `/foodie/?/…` actually lands).
 */

/** Site locales; `en` is the unprefixed default (kept in step with `src/i18n` by the unit test). */
export const LEGACY_REDIRECT_LOCALES = ['en', 'es', 'fr'] as const;
export type LegacyRedirectLocale = (typeof LEGACY_REDIRECT_LOCALES)[number];

export interface DecodedLegacyUrl {
  /** Site-relative path with a single leading slash and a trailing slash, e.g. `/recipes/rec_001/`. */
  path: string;
  /** Decoded query including `?`, or `''`. */
  search: string;
  /** Fragment including `#`, or `''`. */
  hash: string;
}

/**
 * Decode spa-github-pages' `?/path&query` form. Returns `null` when `search`
 * is not in that form. Runs of `/` and `\` collapse to one `/`, so the result
 * is always a same-origin path (never `//host` — no open redirect).
 */
export function decodeLegacySpaUrl(search: string, hash = ''): DecodedLegacyUrl | null {
  if (!search.startsWith('?/')) return null;
  const [encodedPath = '', ...rest] = search.slice(1).split('&');
  const unescape = (part: string) => part.replace(/~and~/g, '&');
  let path = `/${unescape(encodedPath)}`.replace(/[\\/]+/g, '/');
  if (!path.endsWith('/')) path += '/';
  const query = rest.map(unescape).join('&');
  return { path, search: query ? `?${query}` : '', hash };
}

/** The locale a v1 visitor chose: v2's `foodie:locale`, else v1's i18next `i18nextLng`. */
export function preferredLegacyLocale(storage: Pick<Storage, 'getItem'> | null): LegacyRedirectLocale {
  const known = (value: string | null) => {
    const code = (value ?? '').slice(0, 2).toLowerCase();
    return (LEGACY_REDIRECT_LOCALES as readonly string[]).includes(code) ? (code as LegacyRedirectLocale) : null;
  };
  try {
    return known(storage?.getItem('foodie:locale') ?? null) ?? known(storage?.getItem('i18nextLng') ?? null) ?? 'en';
  } catch {
    return 'en';
  }
}

/**
 * Where a v1 encoded URL should go in v2: `base` + (locale prefix unless the
 * path already has one or the locale is `en`) + path + query + hash. `null`
 * when `search` is not a v1 encoded URL.
 */
export function legacyRedirectTarget(options: {
  search: string;
  hash?: string;
  base: string;
  locale?: LegacyRedirectLocale;
}): string | null {
  const decoded = decodeLegacySpaUrl(options.search, options.hash ?? '');
  if (!decoded) return null;
  const locale = options.locale ?? 'en';
  const hasLocale = /^\/(en|es|fr)\//.test(decoded.path);
  const localized = hasLocale || locale === 'en' ? decoded.path : `/${locale}${decoded.path}`;
  const base = options.base.replace(/\/+$/, '');
  return `${base}${localized}${decoded.search}${decoded.hash}`;
}

/**
 * Browser entry point: redirect once (`location.replace`, so Back does not
 * bounce) when the current URL is a v1 encoded URL. Returns the target, or
 * `null` when there is nothing to do. The target never starts with `?/`, so
 * a 404 on it cannot loop.
 */
export function runLegacyRedirect(win: Pick<Window, 'location'> & { localStorage?: Storage } = window, base = '/'): string | null {
  let storage: Storage | null = null;
  try {
    storage = win.localStorage ?? null;
  } catch {
    storage = null;
  }
  const { search, hash, pathname } = win.location;
  const target = legacyRedirectTarget({ search, hash, base, locale: preferredLegacyLocale(storage) });
  if (!target || target === `${pathname}${search}${hash}`) return null;
  win.location.replace(target);
  return target;
}
