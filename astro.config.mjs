import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
// Single-sourced canonical origin — see site.config.mjs for the rationale.
// astro.config.mjs cannot import site-meta.ts directly because it runs in
// Node before Vite starts (import.meta.env is unavailable here).
import { SITE_ORIGIN } from './site.config.mjs';
import { loadEnv } from 'vite';
// Content-Security-Policy (roadmap Issue 035, ADR 0012) — see csp.config.mjs.
import { buildCsp, cspInlineScriptHashes } from './csp.config.mjs';
// Flag-gated template pages (roadmap Issue 046) — see flagged-pages.config.mjs.
import { flaggedPages, galleryEnabled } from './flagged-pages.config.mjs';

// Subpath the site is served under. GitHub *project* pages live at
// `<domain>/<repo>/`, so the Pages build sets ASTRO_BASE=/foodie
// (see .github/workflows/deploy.yml). Local dev + root deploys leave it unset →
// base '/'. The trailing slash is normalized by Astro.
const BASE = process.env.ASTRO_BASE || '/';
// Public-asset prefix that respects BASE (BASE already ends without a trailing
// slash unless it's '/'). Used for the PWA manifest icon paths below.
const asset = (p) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
// BASE as a path with both slashes ('/' or '/foodie/'), for the service
// worker's URL patterns.
const BASE_PATH = asset('/');
// PUBLIC_* values (.env files + process env) for the CSP's configurable
// origins (Firebase auth domain, flag-gated analytics/Sentry).
// CSP is emitted by `astro build` only, so read the production env files.
const PUBLIC_ENV = loadEnv('production', process.cwd(), 'PUBLIC_');
// The mock auth adapter (src/lib/auth/mock.ts) keeps demo accounts —
// passwords included — in localStorage. It is for dev, tests and the e2e
// build only, so refuse a build that would ship it where real users sign in:
// the production deploy (FOODIE_DEPLOY=1, set by .github/workflows/deploy.yml)
// or any build that also carries a complete Firebase config.
{
  const truthy = (v) => ['1', 'true', 'on', 'yes'].includes(String(v ?? '').trim().toLowerCase());
  const firebaseConfigured = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID'].every(
    (k) => String(PUBLIC_ENV[`PUBLIC_FIREBASE_${k}`] ?? '').trim() !== '',
  );
  if (truthy(PUBLIC_ENV.PUBLIC_AUTH_MOCK) && (truthy(process.env.FOODIE_DEPLOY) || firebaseConfigured)) {
    throw new Error(
      'PUBLIC_AUTH_MOCK is set in a deploy build or alongside a Firebase config. ' +
        'The mock auth adapter stores plaintext demo passwords in localStorage; unset PUBLIC_AUTH_MOCK.',
    );
  }
}
// The component gallery ships only behind flags.experimentalGallery: on in dev
// and in local/CI builds (the visual suite screenshots it), off in the
// production deploy. Export the decision as the PUBLIC_ env var so the
// browser-side `flags.experimentalGallery` (src/lib/flags.ts) agrees with the
// routes that were actually built.
const GALLERY = galleryEnabled({ ...PUBLIC_ENV, FOODIE_DEPLOY: process.env.FOODIE_DEPLOY });
process.env.PUBLIC_FLAG_EXPERIMENTAL_GALLERY = GALLERY ? 'true' : 'false';
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default defineConfig({
  // Production origin — single-sourced from site.config.mjs.
  // Foodie is a GitHub project page served at
  // https://artemiop.com/foodie/ (origin + ASTRO_BASE).
  site: SITE_ORIGIN,
  base: BASE,
  // i18n routing — English at root (no prefix), Spanish under /es/, French
  // under /fr/ (roadmap D7). `prefixDefaultLocale: false` keeps English URLs
  // unchanged. Keep in sync with LOCALES in src/i18n/index.ts.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  // Code blocks in the docs: GitHub's high-contrast dark theme — the default
  // `github-dark` greys comments to 3.0:1 on its background, which axe flags
  // (roadmap #043 added docs pages with commented shell snippets).
  markdown: {
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
  // Redirect targets are base-prefixed via asset() — Astro does NOT add the
  // base to redirect targets, so without it they'd 404 on a subpath deploy.
  // (The template's /dashboard, /data and /showcase redirects left with the
  // demos in roadmap Issue 046.)
  redirects: {
    // MkDocs-era page folded into the deployment guide (roadmap Issue 043);
    // the other legacy docs URLs kept their slugs.
    '/docs/guides/github-pages-setup': asset('docs/guides/deployment'),
  },
  // Per-page <meta http-equiv="content-security-policy"> rendered into
  // BaseLayout's <head>, with SHA-256 hashes for Astro's inline scripts and
  // styles. Build-only (dev serves no CSP). Policy + rationale:
  // csp.config.mjs and docs/decisions/0012-firebase-auth-adapter.md.
  security: {
    csp: buildCsp(PUBLIC_ENV),
  },
  integrations: [
    // Must precede AstroPWA: rewrites the built HTML (adds is:inline script
    // hashes to the CSP meta) before the service-worker precache is hashed.
    cspInlineScriptHashes(),
    // Injects src/flagged-pages/** (today: the component gallery) only when
    // its flag is on — a production build has no /gallery/ pages at all.
    flaggedPages({ gallery: GALLERY }),
    // MDX for the /docs/* content collection — lets pages embed React components
    mdx(),
    sitemap({
      // Don't bloat the sitemap with test artifacts or generated content
      filter: (page) =>
        !page.includes('/_') && !page.includes('/404') && !page.endsWith('.json'),
      // Trilingual alternates (roadmap Issue 022): every URL that exists
      // under /, /es/ and /fr/ gets `<xhtml:link rel="alternate"
      // hreflang="…">` siblings. Keep in sync with `i18n.locales` above.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es', fr: 'fr' },
      },
    }),
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'icons/pwa-192.png',
        'icons/pwa-512.png',
        'icons/pwa-maskable-512.png',
        'icons/logo-source.svg',
      ],
      manifest: {
        name: 'Foodie - Meal Planner',
        short_name: 'Foodie',
        description: 'Your Personal Meal Planning Assistant',
        theme_color: '#10b981',
        background_color: '#ffffff',
        lang: 'en',
        categories: ['food', 'lifestyle', 'health'],
        display: 'standalone',
        // Always with the trailing slash ('/foodie/'), so the start URL sits
        // inside the service worker's scope (the SW lives at <base>/sw.js).
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: asset('icons/pwa-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: asset('icons/pwa-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: asset('icons/pwa-maskable-512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: asset('icons/logo-source.svg'), sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Precache the static build: every Foodie page (×3 locales) plus JS,
        // CSS, icons and the self-hosted woff2 fonts (public/fonts/), so the
        // catalog pages, planner, shopping list and pantry open offline once the SW is installed (roadmap Issue 028).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // The component gallery (built only when flags.experimentalGallery is
        // on) is not part of the app — leave it out of the install payload
        // (~5 MB of HTML). Online it loads as usual.
        globIgnores: ['**/gallery/**'],
        // Navigations that match no precached page fall back to the site root.
        navigateFallback: BASE,
        navigateFallbackDenylist: [
          // Never fall back for API routes — they must not serve the app shell
          // (with and without the GitHub Pages base path).
          /^\/api\//,
          ...(BASE_PATH === '/' ? [] : [new RegExp(`^${escapeRegExp(BASE_PATH)}api/`)]),
          // The pages left out of the precache above load from the network
          // instead of turning into the home page…
          new RegExp(`^${escapeRegExp(BASE_PATH)}(?:(?:es|fr)/)?gallery(?:/|$)`),
          // …and so do plain files opened directly (llms.txt, sitemaps, JSON).
          /\.(?:txt|xml|json|webmanifest)(?:\?.*)?$/,
        ],
        runtimeCaching: [
          {
            // Catalog JSON (`public/data/*.json`, read by useCatalog): fresh
            // when online, the last copy when offline or when the network
            // takes longer than 10 s. Workbox matches same-origin regexes
            // anywhere in the URL, so no origin is needed here.
            urlPattern: new RegExp(`${escapeRegExp(BASE_PATH)}data/[^/?#]+\\.json(?:\\?.*)?$`),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'foodie-data',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // GitHub REST API (FeedbackFAB's duplicate-issue search) — stale-while-revalidate so it works offline
            urlPattern: /^https:\/\/api\.github\.com\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'github-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      experimental: {
        // Ensures that directory URLs (e.g. /recipes/) are handled correctly
        // by the SW without 404-ing on trailing-slash variants
        directoryAndTrailingSlashHandler: true,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
});
