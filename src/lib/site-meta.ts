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
 * introduce itself to the world as "Foodie".
 *
 * Repository links are OPT-IN (ADR 0015): `repoSlug` comes only from the
 * PUBLIC_REPO_SLUG build variable. Unset or empty — the default, and the
 * production Cloudflare build — means the site names no source repository at
 * all: no header/footer GitHub links, no FeedbackFAB, no "edit this page", no
 * prefilled issues, no `codeRepository` in JSON-LD, no repo in llms.txt.
 */
import { SITE_ORIGIN as CONFIG_SITE_ORIGIN } from '../../site.config.mjs';

/**
 * Canonical production origin, re-exported from /site.config.mjs (which reads
 * the `SITE_ORIGIN` build env, default https://eat.cybere.co).
 *
 * WHY not declared here: astro.config.mjs runs in Node before Vite starts and
 * cannot import TypeScript that uses `import.meta.env`, so the .mjs file owns
 * the value and this module re-exports it; src/tests/site-meta.test.ts
 * asserts both stay equal.
 */
export const SITE_ORIGIN: string = CONFIG_SITE_ORIGIN;

/** A GitHub `owner/repo` slug that passed `parseRepoSlug`. */
export type RepoSlug = string & { readonly __brand: 'RepoSlug' };

/**
 * GitHub's owner (1–39 alphanumerics or single hyphens) / repository (1–100
 * of `A-Za-z0-9._-`) naming rules.
 */
export const REPO_SLUG_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}\/[A-Za-z0-9._-]{1,100}$/;

/**
 * Parse the PUBLIC_REPO_SLUG build variable. Returns the trimmed slug when it
 * is a well-formed `owner/repo`, otherwise `null` (repo links disabled).
 *
 * A typed guard rather than a Zod schema on purpose: this module reaches the
 * browser through `lib/report-issue.ts`, and pulling Zod into that chunk would
 * add it to pages that otherwise never load it. The value is inlined by Vite
 * at build time, so the check runs on a constant.
 */
export function parseRepoSlug(raw: unknown): RepoSlug | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return REPO_SLUG_PATTERN.test(value) ? (value as RepoSlug) : null;
}

export const SITE = {
  /** Product name as it should appear to agents and search engines. */
  name: 'Foodie',
  /** One-line positioning (used as the default meta description). */
  description: 'Your Personal Meal Planning Assistant',
  /** Longer positioning used by /llms.txt and the JSON-LD blocks. */
  longDescription:
    'Foodie is an offline-first meal planning web app: browse a trilingual (EN/ES/FR) ' +
    'recipe and ingredient catalog, plan weekly meals, generate consolidated shopping ' +
    'lists, manage your pantry and track nutrition — with no account required.',
  /** owner/repo on GitHub, or `null` when PUBLIC_REPO_SLUG is unset (the default). */
  repoSlug: parseRepoSlug(import.meta.env.PUBLIC_REPO_SLUG),
  /** SPDX license id of the codebase. */
  license: 'MIT',
  /** Languages an agent should expect in the source. */
  programmingLanguages: ['TypeScript', 'Astro', 'CSS'],
} as const;

/** Absolute repo URL derived from the slug, or `null` when repo links are off. */
export const REPO_URL: string | null = SITE.repoSlug ? `https://github.com/${SITE.repoSlug}` : null;

/**
 * The publisher/author every JSON-LD block names: the site itself, never a
 * person (ADR 0015).
 */
export const SITE_PUBLISHER = { '@type': 'Organization', name: SITE.name } as const;

/** Absolute site origin + base (e.g. https://eat.cybere.co). */
export function siteUrl(site: URL | undefined, base: string): string {
  const origin = (site ?? new URL('https://localhost')).origin;
  return `${origin}${base.replace(/\/$/, '')}`;
}
