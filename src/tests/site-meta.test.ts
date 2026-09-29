/**
 * Asserts that all canonical-origin references stay in sync.
 *
 * Failure here means one of the sources drifted:
 *   1. SITE_ORIGIN in site.config.mjs (from the `SITE_ORIGIN` build env,
 *      default https://eat.cybere.co; consumed by astro.config.mjs)
 *   2. SITE_ORIGIN re-exported by src/lib/site-meta.ts
 *   3. The Sitemap URL of /robots.txt (src/pages/robots.txt.ts — generated
 *      from origin + base since ADR 0015 replaced the static public file)
 *
 * Re-brand checklist: change DEFAULT_SITE_ORIGIN (or set SITE_ORIGIN in the
 * build env), run `npm test` to confirm.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

import { REPO_SLUG_PATTERN, SITE_ORIGIN, parseRepoSlug } from '../lib/site-meta';
import { robotsTxt } from '../lib/robots';

// Resolve from project root (two levels up from src/tests/)
const ROOT = resolve(__dirname, '../../');

describe('canonical site URL single-source (#185)', () => {
  it('SITE_ORIGIN in site-meta.ts is a valid https URL', () => {
    expect(SITE_ORIGIN).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i);
    // Compare the parsed hostname exactly — a substring test would match
    // `localhost` or `example.com` anywhere in the URL.
    const { hostname } = new URL(SITE_ORIGIN);
    expect(hostname).not.toBe('localhost');
    expect(hostname === 'example.com' || hostname.endsWith('.example.com')).toBe(false);
  });

  it('site.config.mjs SITE_ORIGIN matches site-meta.ts SITE_ORIGIN', async () => {
    // Dynamic import so Vitest resolves the .mjs from Node — bypasses Vite
    // transform that would ordinarily handle ?raw imports.
    const siteConfigPath = resolve(ROOT, 'site.config.mjs');
    const { SITE_ORIGIN: mjs } = await import(siteConfigPath);
    expect(mjs).toBe(SITE_ORIGIN);
  });

  it('astro.config.mjs `site` value matches SITE_ORIGIN', () => {
    // Read as raw text to avoid executing the Astro/Vite module graph.
    // The pattern matches: site: SITE_ORIGIN  (after import from site.config.mjs)
    const raw = readFileSync(resolve(ROOT, 'astro.config.mjs'), 'utf-8');
    // Confirm the config uses the variable, not a hardcoded string
    expect(raw).toMatch(/site:\s*SITE_ORIGIN/);
    // Also confirm the import statement is present
    expect(raw).toMatch(/from\s+['"]\.\/site\.config\.mjs['"]/);
  });

  it('robots.txt is generated (no static public/robots.txt) and its Sitemap URL starts with SITE_ORIGIN', () => {
    expect(existsSync(resolve(ROOT, 'public/robots.txt'))).toBe(false);
    const robots = robotsTxt(SITE_ORIGIN, '/');
    const match = robots.match(/^Sitemap:\s*(.+)$/m);
    expect(match, 'robots.txt must contain a Sitemap: directive').toBeTruthy();
    const sitemapUrl = match![1]!.trim();
    expect(sitemapUrl).toMatch(/^https:\/\//);
    expect(sitemapUrl).toBe(`${SITE_ORIGIN}/sitemap-index.xml`);
  });
});

describe('SITE_ORIGIN comes from the build env (ADR 0015)', () => {
  it('defaults to https://eat.cybere.co and normalises to an origin', async () => {
    const { DEFAULT_SITE_ORIGIN, resolveSiteOrigin } = await import(resolve(ROOT, 'site.config.mjs'));
    expect(DEFAULT_SITE_ORIGIN).toBe('https://eat.cybere.co');
    expect(resolveSiteOrigin(undefined)).toBe('https://eat.cybere.co');
    expect(resolveSiteOrigin('   ')).toBe('https://eat.cybere.co');
    expect(resolveSiteOrigin('https://preview.example.org/')).toBe('https://preview.example.org');
    expect(resolveSiteOrigin('https://eat.cybere.co/some/path')).toBe('https://eat.cybere.co');
  });

  it('refuses a non-https or malformed origin instead of shipping broken canonicals', async () => {
    const { resolveSiteOrigin } = await import(resolve(ROOT, 'site.config.mjs'));
    expect(() => resolveSiteOrigin('http://eat.cybere.co')).toThrow(/https/);
    expect(() => resolveSiteOrigin('eat.cybere.co')).toThrow(/absolute/);
  });

  it('the unit run (no SITE_ORIGIN env) uses the default', () => {
    if (!process.env.SITE_ORIGIN) expect(SITE_ORIGIN).toBe('https://eat.cybere.co');
  });

  it('site-meta.ts re-exports the value instead of declaring its own', () => {
    const meta = readFileSync(resolve(ROOT, 'src/lib/site-meta.ts'), 'utf-8');
    expect(meta).toMatch(/from '\.\.\/\.\.\/site\.config\.mjs'/);
    expect(meta).not.toMatch(/SITE_ORIGIN = 'https?:/);
  });
});

describe('PUBLIC_REPO_SLUG is opt-in (ADR 0015)', () => {
  it('parses a well-formed owner/repo and nothing else', () => {
    expect(parseRepoSlug('example-org/foodie')).toBe('example-org/foodie');
    expect(parseRepoSlug('  example-org/foo.d_ie-2  ')).toBe('example-org/foo.d_ie-2');
    for (const bad of [undefined, null, '', '   ', 'foodie', 'a/b/c', '-org/x', 'org-/x', 'o--rg/x', 'org/', '/repo', 'org/re po', 'https://github.com/o/r']) {
      expect(parseRepoSlug(bad), String(bad)).toBeNull();
    }
    expect(REPO_SLUG_PATTERN.test('example-org/foodie')).toBe(true);
  });

  it('has no fallback slug: unset means no repository', () => {
    const meta = readFileSync(resolve(ROOT, 'src/lib/site-meta.ts'), 'utf-8');
    expect(meta).toContain('repoSlug: parseRepoSlug(import.meta.env.PUBLIC_REPO_SLUG)');
    expect(meta).not.toMatch(/PUBLIC_REPO_SLUG[^\n]*\?\?/);
  });
});
