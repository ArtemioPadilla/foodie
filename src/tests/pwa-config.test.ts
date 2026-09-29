import { describe, expect, it } from 'vitest';
// Import the raw source of astro.config.mjs so we can assert on the text without
// actually executing the Astro/Vite module graph (which would require a full build
// environment). This is the same pattern used by other config-assertion tests in
// this project. Adapted for Foodie in roadmap Issue 028: the template only checked
// that a manifest and the GitHub API cache existed; Foodie pins its own manifest,
// the catalog-data and Google Fonts caches, and the layout wiring.
import config from '../../astro.config.mjs?raw';
import layout from '../layouts/BaseLayout.astro?raw';

/** The `AstroPWA({ … })` call, so assertions cannot be satisfied by other integrations. */
const pwa = config.slice(config.indexOf('AstroPWA({'), config.indexOf('vite: {'));
/** One `runtimeCaching` entry: from its urlPattern line to the closing `},` of its options. */
function cacheRule(marker: string): string {
  const start = pwa.lastIndexOf('urlPattern', pwa.indexOf(marker));
  const end = pwa.indexOf('cacheableResponse', start);
  expect(start, `runtime cache rule for ${marker}`).toBeGreaterThan(-1);
  return pwa.slice(start, end);
}

describe('astro.config.mjs PWA setup', () => {
  it('imports @vite-pwa/astro', () => {
    expect(config).toMatch(/from\s+['"]@vite-pwa\/astro['"]/);
  });

  it('registers AstroPWA in integrations[]', () => {
    expect(config).toMatch(/AstroPWA\s*\(/);
  });

  it("uses 'autoUpdate' registerType and a generated service worker", () => {
    expect(pwa).toMatch(/registerType:\s*['"]autoUpdate['"]/);
    expect(pwa).toMatch(/strategies:\s*['"]generateSW['"]/);
  });
});

describe('Foodie web app manifest (roadmap #028)', () => {
  it('names the app, brands it emerald on the page background and opens standalone', () => {
    expect(pwa).toContain("name: 'Foodie - Meal Planner'");
    expect(pwa).toContain("short_name: 'Foodie'");
    expect(pwa).toContain("theme_color: '#10b981'");
    // global.css: --background is oklch(1 0 0) (white) in light mode, the splash colour.
    expect(pwa).toContain("background_color: '#ffffff'");
    expect(pwa).toContain("display: 'standalone'");
  });

  it('starts and scopes at the base path (GitHub Pages /foodie/ or /)', () => {
    expect(pwa).toMatch(/start_url:\s*BASE_PATH\b/);
    expect(pwa).toMatch(/scope:\s*BASE_PATH\b/);
    expect(config).toContain("const BASE_PATH = asset('/');");
  });

  it('ships 192, 512 and maskable 512 icons through the base-aware asset()', () => {
    expect(pwa).toMatch(/asset\('icons\/pwa-192\.png'\),\s*sizes:\s*'192x192'/);
    expect(pwa).toMatch(/asset\('icons\/pwa-512\.png'\),\s*sizes:\s*'512x512'/);
    expect(pwa).toMatch(/asset\('icons\/pwa-maskable-512\.png'\),\s*sizes:\s*'512x512',[\s\S]*?purpose:\s*'maskable'/);
  });
});

describe('Workbox caching (roadmap #028)', () => {
  it('serves catalog JSON NetworkFirst: 10 s network timeout, 7 days of cache', () => {
    const rule = cacheRule("cacheName: 'foodie-data'");
    expect(rule).toContain('data/[^/?#]+\\\\.json');
    expect(rule).toContain('BASE_PATH');
    expect(rule).toMatch(/handler:\s*'NetworkFirst'/);
    expect(rule).toMatch(/networkTimeoutSeconds:\s*10\b/);
    expect(rule).toMatch(/maxAgeSeconds:\s*60 \* 60 \* 24 \* 7\b/);
  });

  it('precaches the self-hosted fonts instead of caching Google Fonts at runtime', () => {
    expect(pwa).toMatch(/globPatterns:\s*\[[^\]]*woff2/);
    expect(pwa).not.toMatch(/fonts\\?\.(googleapis|gstatic)/);
    expect(pwa).not.toContain('google-fonts-');
  });

  it("keeps the GitHub API cache (FeedbackFAB's duplicate-issue search)", () => {
    expect(cacheRule("cacheName: 'github-api'")).toMatch(/StaleWhileRevalidate/);
  });

  it('falls back to the base for unknown navigations but never for /api/', () => {
    expect(pwa).toMatch(/navigateFallback:\s*BASE\b/);
    expect(pwa).toMatch(/navigateFallbackDenylist:\s*\[[\s\S]*?\/\^\\\/api\\\/\//);
  });

  it('lets non-precached pages and plain files load from the network instead of the fallback', () => {
    const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const base of ['/', '/foodie/']) {
      const excluded = new RegExp(`^${escapeRegExp(base)}(?:(?:es|fr)/)?gallery(?:/|$)`);
      expect(excluded.test(`${base}gallery/`)).toBe(true);
      expect(excluded.test(`${base}es/gallery/`)).toBe(true);
      expect(excluded.test(`${base}gallery/dialog/`)).toBe(true);
      expect(excluded.test(`${base}recipes/`)).toBe(false);
      expect(excluded.test(`${base}galleryx/`)).toBe(false);
    }
    expect(pwa).toContain('(?:(?:es|fr)/)?gallery(?:/|$)');
    expect(pwa).toContain('/\\.(?:txt|xml|json|webmanifest)(?:\\?.*)?$/');
  });

  it('precaches the app pages and leaves the component gallery out', () => {
    expect(pwa).toContain("globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}']");
    // The demos/blocks/showcase surfaces were removed in roadmap Issue 046.
    expect(pwa).toContain("globIgnores: ['**/gallery/**'],");
    expect(pwa).not.toMatch(/demos|blocks|showcase/);
  });

  it('builds a data pattern that matches the catalog files with and without the /foodie base', () => {
    // Same expression as astro.config.mjs, evaluated for both deploy layouts.
    const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const base of ['/', '/foodie/']) {
      const pattern = new RegExp(`${escapeRegExp(base)}data/[^/?#]+\\.json(?:\\?.*)?$`);
      expect(pattern.test(`https://eat.cybere.co${base}data/recipes.json`)).toBe(true);
      expect(pattern.test(`https://eat.cybere.co${base}data/ingredients.json?v=2`)).toBe(true);
      expect(pattern.test(`https://eat.cybere.co${base}recipes/`)).toBe(false);
    }
  });
});

describe('BaseLayout PWA wiring (roadmap #028)', () => {
  it('links the generated manifest through withBase()', () => {
    expect(layout).toContain(`<link rel="manifest" href={withBase('/manifest.webmanifest')} />`);
  });

  it('mounts InstallButton, UpdateToast and OfflineBanner behind flags.pwaPrompts, localised', () => {
    expect(layout).toContain('{flags.pwaPrompts && <OfflineBanner client:idle={{ timeout: 1000 }} lang={lang} />}');
    expect(layout).toContain('{flags.pwaPrompts && <InstallButton client:idle lang={lang} />}');
    expect(layout).toContain('{flags.pwaPrompts && <UpdateToast client:idle lang={lang} />}');
  });

  it('registers the service worker only through virtual:pwa-register (no manual registration)', () => {
    expect(layout).toContain('initPwaRegister()');
    expect(layout).not.toMatch(/serviceWorker\.register/);
  });
});
