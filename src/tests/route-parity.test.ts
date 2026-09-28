/**
 * Route parity test (issue #186).
 *
 * ## What this tests
 * Every page that exists under `src/pages/<locale>/` (es, fr — roadmap Issue
 * 004) must map to a real EN route. An orphan localized page — one without a
 * corresponding English source — means either the EN page was deleted
 * (without removing the translation) or the localized page was created by
 * mistake. Both are caught here at CI time. ES and FR must also mirror each
 * other, so a page translated into one locale is translated into both.
 *
 * ## What this does NOT enforce
 * Foodie's app routes all exist in EN, ES and FR. A few routes are
 * English-only by design (the 404, the docs, the component gallery's
 * per-component pages); ES/FR carry translated bridge landings for /docs and
 * /gallery. Those are listed in EN_ONLY_ALLOWLIST below.
 *
 * Flag-gated pages (roadmap Issue 046) live in `src/flagged-pages/`, laid out
 * like `src/pages/`, and are injected by `flagged-pages.config.mjs` only when
 * their flag is on. They count as routes here, and the injected route list
 * must match the files one to one.
 *
 * ## Methodology: build-time data emitter vs runtime consumer
 * This file is a *build-time data emitter* test: it reads the file system
 * (Vite's `import.meta.glob` resolves at build/test time) and derives facts
 * about the route structure. No server is started; no HTML is fetched. The
 * pattern is documented in docs/patterns/parity-tests.md.
 */

import { describe, it, expect } from 'vitest';
import { GALLERY_ROUTES } from '../../flagged-pages.config.mjs';

// ── File-system page discovery ─────────────────────────────────────────────
// import.meta.glob is resolved by Vite at transform time; the glob runs in the
// test runner's module context so paths are relative to this file's location.

const flaggedPages = import.meta.glob('../flagged-pages/**/*.astro', { eager: false });
const allEnPages = {
  ...import.meta.glob('../pages/**/*.{astro,md,mdx}', { eager: false }),
  ...flaggedPages,
};
const localizedPages = {
  es: {
    ...import.meta.glob('../pages/es/**/*.{astro,md,mdx}', { eager: false }),
    ...import.meta.glob('../flagged-pages/es/**/*.astro', { eager: false }),
  },
  fr: {
    ...import.meta.glob('../pages/fr/**/*.{astro,md,mdx}', { eager: false }),
    ...import.meta.glob('../flagged-pages/fr/**/*.astro', { eager: false }),
  },
} as const;
const NON_DEFAULT_LOCALES = Object.keys(localizedPages) as (keyof typeof localizedPages)[];

/**
 * Intentionally English-only routes — ES translations are out of scope for
 * the current sprint. Add a route here (relative to src/pages, leading slash,
 * no extension) when you explicitly decide not to translate it.
 *
 * Use the route as it appears from toRoute() — typically the stem without
 * extension, with index files already normalized to the parent path.
 *
 * Maintenance: if you add a new top-level page and have no ES translation yet,
 * add it here so the parity test does not block CI.
 */
const EN_ONLY_ALLOWLIST = new Set([
  // Utility page
  '/404',
  // Component gallery (flag-gated, src/flagged-pages/) — /es/gallery/ and
  // /fr/gallery/ are translated bridge landings; the per-component pages are
  // EN-only.
  '/gallery',
  '/gallery/[component]',
  // Docs (roadmap Issue 043) — the Foodie docs are written in English only.
  // /es/docs/ and /fr/docs/ are translated bridge landings that point to
  // /docs/; every page under /docs/ — the content collection and the data
  // model generated from src/schemas — is EN-only.
  '/docs',
  '/docs/[...slug]',
  '/docs/reference/api',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

/** Normalize a glob key to a route-like path without extension. */
function toRoute(globKey: string): string {
  // globKey example: "../pages/es/gallery.astro"
  // Strip leading "../pages" and extension → "/es/gallery"
  const rel = globKey.replace(/^\.\.\/(?:flagged-)?pages/, '').replace(/\.(astro|mdx?|tsx?)$/, '');
  // Normalize "/index" → "/"
  return rel.endsWith('/index') ? rel.slice(0, -'/index'.length) || '/' : rel;
}

/** Strip the "/es" or "/fr" locale prefix to get the EN equivalent. */
function toEnRoute(localizedRoute: string): string {
  return localizedRoute.replace(/^\/(es|fr)(?=\/|$)/, '') || '/';
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('route parity — localized pages must map to real EN routes', () => {
  const enRoutes = new Set(Object.keys(allEnPages).map(toRoute));
  const routesByLocale = Object.fromEntries(
    NON_DEFAULT_LOCALES.map((l) => [l, Object.keys(localizedPages[l]).map(toRoute)]),
  ) as Record<(typeof NON_DEFAULT_LOCALES)[number], string[]>;

  /**
   * Check whether `candidate` is covered by the set of EN routes. A dynamic
   * route like `/docs/[...slug]` covers any `/docs/*` path, including `/docs`
   * itself. We check both exact match and prefix-coverage by a catch-all.
   */
  function isCoveredByEnRoute(candidate: string): boolean {
    if (enRoutes.has(candidate)) return true;
    // Check whether any dynamic EN route is a prefix of the candidate
    for (const enRoute of enRoutes) {
      if (!enRoute.includes('[')) continue;
      // /docs/[...slug] → prefix "/docs"
      const prefix = enRoute.replace(/\/\[.*$/, '');
      if (candidate === prefix || candidate.startsWith(prefix + '/')) return true;
    }
    return false;
  }

  for (const locale of NON_DEFAULT_LOCALES) {
    it(`every /${locale}/* page has a corresponding EN route`, () => {
      const orphans: string[] = [];

      for (const route of routesByLocale[locale]) {
        const enEquivalent = toEnRoute(route);
        if (!isCoveredByEnRoute(enEquivalent)) {
          orphans.push(`${route} → expected EN: ${enEquivalent}`);
        }
      }

      expect(
        orphans,
        `Orphan ${locale.toUpperCase()} pages found (no matching EN route):\n${orphans.join('\n')}`,
      ).toEqual([]);
    });
  }

  it('es and fr translate the same set of pages', () => {
    const es = routesByLocale.es.map(toEnRoute).sort();
    const fr = routesByLocale.fr.map(toEnRoute).sort();
    expect(es.length).toBeGreaterThan(0);
    expect(fr).toEqual(es);
  });

  it('allowlist documents intentionally EN-only routes that exist as files', () => {
    // Every route in the allowlist should actually exist as a file (or be
    // covered by a dynamic catch-all). If a static file was deleted, its
    // allowlist entry should also be removed to keep the list honest.
    const nonExistentAllowlist: string[] = [];

    for (const allowedRoute of EN_ONLY_ALLOWLIST) {
      const exists =
        isCoveredByEnRoute(allowedRoute) ||
        // Dynamic routes like /gallery/[component] may resolve only as the
        // raw glob key — also check by looking for any file with that pattern
        Array.from(enRoutes).some((r) => r === allowedRoute);

      if (!exists) {
        nonExistentAllowlist.push(allowedRoute);
      }
    }

    expect(
      nonExistentAllowlist,
      `Allowlist entries with no matching file (stale — remove them):\n${nonExistentAllowlist.join('\n')}`,
    ).toEqual([]);
  });
});

describe('flag-gated pages (roadmap Issue 046)', () => {
  it('flagged-pages.config.mjs injects exactly the files in src/flagged-pages/', () => {
    const files = Object.keys(flaggedPages)
      .map((k) => k.replace(/^\.\.\//, './src/'))
      .sort();
    const entrypoints = GALLERY_ROUTES.map(([, entrypoint]) => entrypoint).sort();
    expect(entrypoints).toEqual(files);
  });

  it('each injected pattern is the route its file path implies', () => {
    for (const [pattern, entrypoint] of GALLERY_ROUTES) {
      expect(toRoute(entrypoint.replace(/^\.\/src\//, '../'))).toBe(pattern);
    }
  });

  it('no flag-gated route also exists under src/pages', () => {
    const pageRoutes = new Set(
      Object.keys(import.meta.glob('../pages/**/*.{astro,md,mdx}', { eager: false })).map(toRoute),
    );
    for (const [pattern] of GALLERY_ROUTES) expect(pageRoutes.has(pattern)).toBe(false);
  });
});
