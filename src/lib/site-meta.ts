/**
 * Single source of the site's machine-readable identity (Foodie).
 *
 * Everything an external agent (LLM crawler, search engine, tooling) learns
 * about this site flows from this object: /llms.txt, /llms-full.txt, the
 * JSON-LD blocks (WebSite, SoftwareSourceCode, Article, BreadcrumbList), and
 * the default <meta name="description">.
 *
 * RE-BRAND ON INSTANTIATION — this file was re-branded from the upstream
 * template for Foodie (roadmap Issue 003). If this repo is ever used as the
 * seed of another project, update every field below or the new site will
 * introduce itself to the world as "Foodie". `repoSlug` honors
 * PUBLIC_REPO_SLUG so CI/fork setups can override without an edit.
 */

/**
 * Canonical production origin — must match SITE_ORIGIN in /site.config.mjs.
 *
 * WHY declared twice (here + site.config.mjs):
 *   astro.config.mjs runs in Node before Vite starts, so it cannot import
 *   TypeScript files that use `import.meta.env`. Both files declare the same
 *   string; the vitest in src/tests/site-meta.test.ts and the doctor script
 *   assert they are in sync so a stale one-sided edit is caught immediately.
 *
 * Foodie is a GitHub *project* page: origin is the github.io user domain and
 * the `/foodie` subpath comes from ASTRO_BASE (see astro.config.mjs).
 */
export const SITE_ORIGIN = 'https://artemiop.com';
export const SITE = {
  /** Product name as it should appear to agents and search engines. */
  name: 'Foodie',
  /** One-line positioning (used as the default meta description). */
  description: 'Your Personal Meal Planning Assistant',
  /** Longer positioning used by /llms.txt and the JSON-LD SoftwareSourceCode block. */
  longDescription:
    'Foodie is an offline-first meal planning web app: browse a trilingual (EN/ES/FR) ' +
    'recipe and ingredient catalog, plan weekly meals, generate consolidated shopping ' +
    'lists, manage your pantry and track nutrition — with no account required.',
  /** owner/repo on GitHub. */
  repoSlug: (import.meta.env.PUBLIC_REPO_SLUG as string | undefined) ?? 'ArtemioPadilla/foodie',
  /** SPDX license id of the codebase. */
  license: 'MIT',
  /** Languages an agent should expect in the source. */
  programmingLanguages: ['TypeScript', 'Astro', 'CSS'],
} as const;

/** Absolute repo URL derived from the slug. */
export const REPO_URL = `https://github.com/${SITE.repoSlug}`;

/** Absolute site origin + base (e.g. https://artemiop.com/foodie). */
export function siteUrl(site: URL | undefined, base: string): string {
  const origin = (site ?? new URL('https://localhost')).origin;
  return `${origin}${base.replace(/\/$/, '')}`;
}
