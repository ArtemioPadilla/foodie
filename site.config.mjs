/**
 * Single source of truth for the canonical production origin.
 *
 * WHY a plain .mjs module, not site-meta.ts:
 *   astro.config.mjs runs in Node before Vite starts, so it cannot import
 *   TypeScript files that use `import.meta.env` (a Vite-only API).
 *   This file is intentionally dependency-free so both astro.config.mjs
 *   (static import) and src/lib/site-meta.ts (which re-exports SITE_ORIGIN)
 *   consume the same value without duplication.
 *
 * Foodie is served from the root of its own host on Cloudflare Pages
 * (https://eat.cybere.co/, ADR 0015). The origin comes from the build env
 * `SITE_ORIGIN` (the deploy workflow sets it; PR previews leave it unset) and
 * falls back to DEFAULT_SITE_ORIGIN. Canonical URLs, hreflang, the sitemap,
 * robots.txt (src/pages/robots.txt.ts), OG tags and JSON-LD all derive from
 * it; the base path comes from ASTRO_BASE ('/' for the Cloudflare build).
 * src/tests/site-meta.test.ts keeps site-meta.ts and this file in sync.
 */

/** Production origin used when the build env does not set `SITE_ORIGIN`. */
export const DEFAULT_SITE_ORIGIN = 'https://eat.cybere.co';

/**
 * Normalise a `SITE_ORIGIN` value: blank → the default; otherwise an absolute
 * https URL reduced to its origin (no path, no trailing slash). Anything else
 * fails the build loudly rather than shipping broken canonical URLs.
 *
 * @param {unknown} raw - The raw env value.
 * @returns {string} e.g. 'https://eat.cybere.co'.
 */
export function resolveSiteOrigin(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') return DEFAULT_SITE_ORIGIN;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`SITE_ORIGIN must be an absolute https URL, got "${value}".`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`SITE_ORIGIN must use https, got "${value}".`);
  }
  return url.origin;
}

/**
 * Production origin — no trailing slash. Read from the Node env at build
 * time; in a browser bundle (no `process`) it is the default, which no
 * client code relies on (islands read `import.meta.env.SITE`).
 */
export const SITE_ORIGIN = resolveSiteOrigin(
  typeof process !== 'undefined' && process.env ? process.env.SITE_ORIGIN : undefined,
);

/**
 * Canonical URL for the site root (origin + base subpath).
 * The base is set at build time via the ASTRO_BASE env var ('/' on Cloudflare).
 *
 * @param {string} [base='/'] - The base path (e.g. '/' or '/foodie').
 * @returns {string} Full canonical URL (e.g. 'https://eat.cybere.co').
 */
export function canonicalUrl(base = '/') {
  return `${SITE_ORIGIN}${base === '/' ? '' : base.replace(/\/$/, '')}`;
}
