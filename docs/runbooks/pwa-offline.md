# PWA and offline — manual check

Operator runbook for Foodie's installable, offline-capable build (roadmap
Issue 028, decision D6 / US-3.5). Run it before a release and whenever
`astro.config.mjs` (`AstroPWA`), `src/lib/pwa-register.ts` or the PWA islands
change. The automated part lives in `src/tests/pwa-config.test.ts` (config)
and the `offline PWA (roadmap #028)` journey in `tests/e2e/journeys.spec.ts`
(service worker + airplane mode in Chromium); this page covers what those
cannot: a real install and a real device.

## What is configured

| Piece | Where | Behaviour |
| --- | --- | --- |
| Manifest | `AstroPWA({ manifest })` → `dist/manifest.webmanifest`, linked from `BaseLayout.astro` through `withBase()` | `name` "Foodie - Meal Planner", `short_name` "Foodie", `theme_color` `#10b981`, `background_color` `#ffffff` (light `--background`), `display` `standalone`, `start_url` = `scope` = base with trailing slash (`/` or `/foodie/`), icons 192, 512 and maskable 512 |
| Service worker | `generateSW` → `dist/sw.js`, registered only by `virtual:pwa-register` (`src/lib/pwa-register.ts`, called from `BaseLayout.astro`); `autoUpdate` | Precaches every Foodie page ×3 locales, JS, CSS, icons and the self-hosted `woff2` fonts (`public/fonts/`). The template's gallery, demos, blocks and showcase are left out (online only) |
| Catalog data | `runtimeCaching` → `foodie-data` | `<base>data/*.json` **NetworkFirst**: fresh when online, cached copy when offline or after a 10 s network timeout; entries expire after 7 days. `useCatalog` also persists the parsed catalog in IndexedDB (TanStack Query) |
| Fonts | `public/fonts/*.woff2`, `@font-face` in `src/styles/global.css` | Self-hosted and **precached** (`globPatterns` includes `woff2`); no runtime cache and no third-party font host |
| Navigation fallback | `navigateFallback: BASE` | A navigation to a page that is not precached is answered with the home page — except `/api/`, `<base>api/`, the excluded template sections and plain files (`.txt`, `.xml`, `.json`, `.webmanifest`), which go to the network |
| UI | `OfflineBanner`, `InstallButton`, `UpdateToast` in `BaseLayout.astro`, all behind `flags.pwaPrompts` (`PUBLIC_FLAG_PWA_PROMPTS`, default on), localised with the page `lang` | Offline banner while `navigator.onLine` is false; install button when the browser fires `beforeinstallprompt`; update toast when a new SW is waiting |

User data (plan, shopping list, pantry, diary…) never depends on the network:
it lives in `localStorage` (ADR 0002).

## 1. Build and serve like production

```bash
ASTRO_BASE=/foodie npm run build     # the GitHub Pages layout
ls dist/sw.js dist/manifest.webmanifest
ASTRO_BASE=/foodie npm run preview   # http://localhost:4321/foodie/
```

`npm run dev` does **not** register the service worker; always check against
`preview` (or the deployed site).

## 2. Installable (Lighthouse / DevTools)

1. Open `http://localhost:4321/foodie/` in Chrome.
2. DevTools → **Application → Manifest**: name, short name, theme colour,
   start URL `/foodie/`, the three icons (the maskable one previews inside the
   safe zone) and **no installability warnings**.
3. DevTools → **Application → Service workers**: `sw.js` is *activated and is
   running*, scope `/foodie/`.
4. Lighthouse: Lighthouse 12+ no longer has a PWA category, so "installable"
   is read from DevTools (step 2) or from Chrome's own install affordance — the
   install icon in the address bar, or Foodie's floating **Install app**
   button (`InstallButton`). With an older Lighthouse (≤ 11), run the PWA
   category and expect "Installable" to pass.
   Scripted equivalent (what the check above relies on): the CDP call
   `Page.getInstallabilityErrors` on the preview returns an empty list.
5. Install it; the app opens standalone with the emerald title bar.

## 3. Airplane mode: `/recipes/` and `/planner/` work

1. Online, visit `/foodie/` and wait until DevTools shows the service worker
   activated (first visit precaches ~1 300 files; a few seconds on broadband).
2. Visit `/foodie/recipes/` once online, so the catalog JSON goes through the
   worker and lands in the `foodie-data` cache (DevTools → Application → Cache
   storage).
3. Go offline: DevTools → Network → **Offline**, or airplane mode on a phone.
4. Reload `/foodie/recipes/`: the page renders, the recipe grid is filled, and
   the red **"You're offline"** pill shows at the bottom.
5. Open `/foodie/planner/`: the planner loads; create a plan and add a meal —
   it is saved to `localStorage` as usual.
6. Also try a recipe detail (`/foodie/recipes/rec_001/`), `/foodie/es/pantry/`
   and `/foodie/fr/shopping/`: all precached.
7. Back online: the pill disappears; the next catalog request refreshes the
   data cache.

Expected gaps offline: the template gallery/demos are not available. Fonts
are part of the precache, so typography is identical offline (DevTools →
Application → Cache storage → `workbox-precache-…` lists `fonts/*.woff2`).

## 4. Updates

1. With the installed app open, rebuild with any visible change and restart
   `preview`.
2. Reload once: the new worker installs; `UpdateToast` ("Update available →
   Reload") appears when it is waiting, and **Reload** activates it.

## Troubleshooting

- **Stale content after a deploy** — DevTools → Application → Service workers
  → *Update*, or *Clear site data*.
- **`non-precached-url` in the SW console** — `navigateFallback` must be a
  precached URL; `@vite-pwa/astro`'s `directoryAndTrailingSlashHandler`
  precaches the base itself, so keep `navigateFallback: BASE`.
- **A page opens as the home page** — it is not precached and not in
  `navigateFallbackDenylist`; add it to one or the other.
