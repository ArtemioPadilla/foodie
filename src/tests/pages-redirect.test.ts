import { describe, expect, it } from 'vitest';
import { MOVABLE_KEYS, buildKillSwitchSw, buildRedirectHtml, isMovableKey, redirectTarget } from '../../scripts/build-pages-redirect.mjs';
import { AUTH_INFRA_KEYS, LEGACY_KEYS, PER_ACCOUNT_KEY_PREFIXES } from '@/lib/user-data';
import { IDENTITY_PATTERN } from './fixtures/identity';

/**
 * The redirect site that replaces the old GitHub Pages deploy (ADR 0015,
 * deploy.yml job `pages-redirect`, scripts/build-pages-redirect.mjs).
 */
const TARGET = 'https://eat.cybere.co';

describe('redirectTarget — old /foodie/<path> → new root', () => {
  it.each([
    ['/foodie/', '', '', 'https://eat.cybere.co/'],
    ['/foodie', '', '', 'https://eat.cybere.co/'],
    ['/foodie/recipes/rec_001/', '?servings=4', '#nutrition', 'https://eat.cybere.co/recipes/rec_001/?servings=4#nutrition'],
    ['/foodie/es/planner/', '', '', 'https://eat.cybere.co/es/planner/'],
    // v1's encoded SPA links reach the new root untouched; the new site's
    // legacy-redirect decodes them there.
    ['/foodie/', '?/recipes/rec_001&tab=a~and~b', '#x', 'https://eat.cybere.co/?/recipes/rec_001&tab=a~and~b#x'],
    // Never another host: slashes collapse into a path.
    ['/foodie//evil.example/', '', '', 'https://eat.cybere.co/evil.example/'],
    ['/foodie/\\\\evil.example', '', '', 'https://eat.cybere.co/evil.example'],
    ['/foodiex/', '', '', 'https://eat.cybere.co/foodiex/'],
  ])('%s%s%s → %s', (pathname, search, hash, expected) => {
    expect(redirectTarget(pathname, search, hash, TARGET, '/foodie')).toBe(expected);
  });

  it('works for a root deploy too', () => {
    expect(redirectTarget('/recipes/', '', '', TARGET, '/')).toBe('https://eat.cybere.co/recipes/');
  });
});

describe('isMovableKey — mirrors src/lib/user-data.ts', () => {
  it('carries every user-data key and no UI, auth or credential key', () => {
    for (const key of LEGACY_KEYS.filter((k) => !['theme', 'i18nextLng', 'github-access-token'].includes(k))) {
      expect(isMovableKey(key, MOVABLE_KEYS), key).toBe(true);
    }
    for (const prefix of PER_ACCOUNT_KEY_PREFIXES) {
      expect(MOVABLE_KEYS.prefixes).toContain(prefix);
      expect(isMovableKey(`${prefix}uid-1`, MOVABLE_KEYS)).toBe(true);
      expect(isMovableKey(prefix, MOVABLE_KEYS)).toBe(false);
    }
    for (const key of ['foodie:preferences', 'foodie:custom-prices', 'foodie:contribute-draft']) {
      expect(isMovableKey(key, MOVABLE_KEYS), key).toBe(true);
    }
    for (const key of [...AUTH_INFRA_KEYS, 'theme', 'i18nextLng', 'github-access-token', 'foodie:locale', 'foodie:privacy-ack', 'other-app']) {
      expect(isMovableKey(key, MOVABLE_KEYS), key).toBe(false);
    }
  });
});

describe('buildRedirectHtml', () => {
  const html = buildRedirectHtml({ target: TARGET, base: '/foodie' });

  it('is noindex, canonical to the new host and has a no-JS fallback', () => {
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<link rel="canonical" href="https://eat.cybere.co/">');
    expect(html).toContain('<noscript><meta http-equiv="refresh" content="0; url=https://eat.cybere.co/"></noscript>');
    expect(html).toContain('location.replace(to)');
  });

  it('inlines the tested helpers instead of a second copy', () => {
    expect(html).toContain(redirectTarget.toString());
    expect(html).toContain(isMovableKey.toString());
    expect(html).toContain(JSON.stringify(MOVABLE_KEYS));
  });

  it('offers the old-origin data as a /profile-format export before leaving', () => {
    expect(html).toContain("format: 'foodie-user-data', version: 1");
    expect(html).toContain('Download my data');
  });

  it('names no one', () => {
    expect(IDENTITY_PATTERN.test(html)).toBe(false);
    expect(IDENTITY_PATTERN.test(buildKillSwitchSw())).toBe(false);
  });

  it('refuses a non-https target', () => {
    expect(() => buildRedirectHtml({ target: 'http://eat.cybere.co', base: '/foodie' })).toThrow(/https/);
  });

  it('the kill-switch worker unregisters itself and reloads open tabs', () => {
    const sw = buildKillSwitchSw();
    expect(sw).toContain('self.skipWaiting()');
    expect(sw).toContain('self.registration.unregister()');
    expect(sw).toContain('client.navigate(client.url)');
    expect(sw).not.toContain('localStorage');
  });

  it("the kill-switch worker deletes only Foodie's caches, not other apps' on the shared origin", () => {
    const sw = buildKillSwitchSw();
    expect(sw).toContain('self.registration.scope');
    expect(sw).toContain("'foodie-data'");
    expect(sw).not.toContain("'github-api'");
    expect(sw).not.toMatch(/keys\.map\(function \(key\) \{ return caches\.delete\(key\); \}\)\)/);
  });
});
