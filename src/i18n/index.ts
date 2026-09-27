import type { MultiLangText } from '@/schemas/multi-lang-text';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';

/**
 * The English dictionary is the structural source of truth — adding a key
 * to `en.ts` widens this type. Other locales must satisfy it (see `es.ts`,
 * `fr.ts`).
 *
 * ## Runtime locale detection for islands and non-Astro code
 *
 * Astro components can read the locale from `Astro.currentLocale` or derive it
 * from `Astro.url.pathname` via `detectLocale()`. **Islands (React, etc.) run
 * outside the Astro request context**, so they must receive the locale as a
 * prop, attribute, or store:
 *
 * 1. **Prop** (preferred for single-island use): pass `lang` as a string prop
 *    from the Astro parent and forward it into the island.
 *
 *    ```astro
 *    <MyIsland lang={detectLocale(Astro.url.pathname)} client:visible />
 *    ```
 *
 * 2. **Nano Store** (preferred when multiple islands share state): write
 *    `localeStore.set(detectLocale(pathname))` in a script tag in BaseLayout;
 *    islands subscribe with `useStore(localeStore)`. Never use React Context
 *    for cross-island state — Astro partial hydration breaks it.
 *
 * 3. **Data attribute** (simple, zero-JS): read `document.documentElement.lang`
 *    inside a client-side effect. BaseLayout always sets `<html lang={lang}>`.
 *    Fine for non-critical, display-only use.
 *
 * Worker/postMessage boundaries: locale must be passed as a plain string (not
 * wrapped in an object with an interface — use `Locale` exported from here,
 * which is a string-literal union derived from `dictionaries`).
 */
export type Dictionary = typeof en;

export type Locale = 'en' | 'es' | 'fr';
export const dictionaries: Record<Locale, Dictionary> = { en, es, fr };

export const DEFAULT_LOCALE: Locale = 'en';
/** Every routed locale, default first. Mirrors `i18n.locales` in astro.config.mjs. */
export const LOCALES: readonly Locale[] = ['en', 'es', 'fr'] as const;

/** Native-language names, for language switchers and `<html lang>` labels. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español', fr: 'Français' };

/** Type guard for untrusted strings (URL segments, storage, navigator.language). */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Detect locale from a URL pathname. Returns `'en'` when no `/<locale>/` prefix
 * matches — that mirrors `prefixDefaultLocale: false` in astro.config.mjs.
 */
export function detectLocale(pathname: string): Locale {
  const match = pathname.match(/^\/(en|es|fr)(?:\/|$)/);
  return (match?.[1] as Locale) ?? DEFAULT_LOCALE;
}

/** Interpolation values for `t()`. `count` also drives plural resolution. */
export type TranslateParams = Record<string, string | number>;

/** Resolve a dot-path key to its string value in one dictionary (or undefined). */
function lookup(dict: Dictionary, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Translate a dot-path key against the chosen locale's dictionary, falling back
 * to English if the key is missing in the target locale (typical i18n behavior:
 * never render an empty string). Unknown keys come back verbatim.
 *
 * `params` reproduces the two i18next features Foodie's legacy dictionaries
 * rely on (27 keys — roadmap D7):
 *
 * - **Interpolation**: every `{{name}}` in the value is replaced by
 *   `String(params.name)`. Unknown placeholders are left untouched so a typo
 *   is visible in the UI instead of silently rendering an empty string.
 * - **Plurals**: when `params.count` is a number other than `1`, the
 *   `<key>_plural` variant is preferred (`recipe.reviewCount_plural` →
 *   `"{{count}} reviews"`), falling back to the singular key when a
 *   dictionary has no plural form.
 *
 * @example
 * t('en', 'recipe.reviewCount', { count: 1 }) // "1 review"
 * t('en', 'recipe.reviewCount', { count: 3 }) // "3 reviews"
 */
export function t(locale: Locale, key: string, params?: TranslateParams): string {
  const count = params?.count;
  const candidates = typeof count === 'number' && count !== 1 ? [`${key}_plural`, key] : [key];
  let value: string | undefined;
  for (const candidate of candidates) {
    value = lookup(dictionaries[locale], candidate) ?? lookup(dictionaries[DEFAULT_LOCALE], candidate);
    if (value !== undefined) break;
  }
  if (value === undefined) return key;
  if (!params) return value;
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Produce the equivalent URL for a different locale, used by the language
 * switcher. `/about` ↔ `/es/about` ↔ `/fr/about`; `/es/about` → `/about`
 * with locale=`en`.
 */
export function localizedPath(pathname: string, target: Locale): string {
  const stripped = pathname.replace(/^\/(en|es|fr)(?=\/|$)/, '') || '/';
  if (target === DEFAULT_LOCALE) return stripped;
  return stripped === '/' ? `/${target}` : `/${target}${stripped}`;
}

/**
 * `localizedPath()` normalised to the trailing-slash form every static route
 * is built at (`/es/`, never `/es`): the canonical href for navigation links,
 * so GitHub Pages never has to redirect and tests can match the route suffix.
 */
export function localizedRoute(pathname: string, target: Locale): string {
  const p = localizedPath(pathname, target);
  return p.endsWith('/') ? p : `${p}/`;
}

/**
 * Strip the deploy base from a pathname so locale helpers see site-relative
 * routes: `('/foodie/es/docs/', '/foodie/')` → `/es/docs/`; a root base or a
 * pathname that does not carry the base is returned as-is. Astro's
 * `Astro.url.pathname` may or may not include `BASE_URL` depending on the
 * rendering mode, so callers must not assume either.
 */
export function stripBase(pathname: string, base: string): string {
  const prefix = base.replace(/\/$/, '');
  if (!prefix) return pathname || '/';
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

/** One `<link rel="alternate" hreflang>` entry (see BaseLayout `alternates`). */
export interface AlternateLink {
  /** BCP-47 locale (e.g. 'en', 'es') or 'x-default' */
  hreflang: string;
  /** Absolute URL for that locale's equivalent page */
  href: string;
}

/**
 * Build the full hreflang set (every locale + `x-default`) for a route that
 * exists in all locales. `pathname` is the route *without* base or locale
 * prefix (`'/'`, `'/docs/'`); `origin` + `base` come from `Astro.site` and
 * `import.meta.env.BASE_URL`, so the links follow the deploy (GitHub project
 * page under `/foodie/`, root deploy, local preview) instead of a hardcoded
 * domain.
 *
 * @example
 * hreflangAlternates('/docs/', 'https://example.org', '/foodie/')
 * // → en: https://example.org/foodie/docs/, es: …/foodie/es/docs/, x-default: …/foodie/docs/
 */
export function hreflangAlternates(pathname: string, origin: string, base = '/'): AlternateLink[] {
  const prefix = `${origin.replace(/\/$/, '')}${base.replace(/\/$/, '')}`;
  const url = (locale: Locale) => {
    const p = localizedPath(pathname, locale);
    return `${prefix}${p.endsWith('/') ? p : `${p}/`}`;
  };
  return [
    ...LOCALES.map((locale) => ({ hreflang: locale, href: url(locale) })),
    { hreflang: 'x-default', href: url(DEFAULT_LOCALE) },
  ];
}

/**
 * Collect every leaf-node dot-path from a nested object. Used by parity tests
 * to enumerate all translation keys and verify no locale is missing one.
 *
 * @example
 * collectLeafKeys({ nav: { home: 'Home' } }) // → ['nav.home']
 */
export function collectLeafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectLeafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

/**
 * Pick the `lang` variant of a catalog `MultiLangText` (recipe names, ingredient
 * descriptions, category labels…), falling back to English when that variant is
 * missing or blank. Port of the legacy `LanguageContext.getTranslated` (roadmap
 * Issue 015): the dictionary handles UI strings via `t()`; catalog text is
 * already trilingual in `public/data/*.json` and only needs selecting.
 *
 * Islands receive `lang` as a prop and pass it through — never read
 * `navigator.language` here (see docs/recipes/i18n-islands.md).
 *
 * @example
 * getTranslated({ en: 'Water', es: 'Agua', fr: 'Eau' }, 'fr') // "Eau"
 * getTranslated({ en: 'Water', es: '', fr: 'Eau' }, 'es')     // "Water"
 */
export function getTranslated(text: MultiLangText, lang: Locale): string {
  return text[lang] || text[DEFAULT_LOCALE];
}
