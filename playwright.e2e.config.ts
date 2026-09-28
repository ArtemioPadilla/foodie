import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated E2E config — behavioural journeys under tests/e2e (roadmap Issue
 * 005), separate from the visual/screenshot suite in playwright.config.ts.
 * Same split as TradePilot: this file owns its own build + preview on a
 * dedicated port so it can run in parallel with (and independently of) the
 * visual suite, and so the journeys can be built under the production base
 * path without disturbing the screenshot baselines.
 *
 *   npm run test:e2e                  # base '/'  → http://localhost:4322/
 *   ASTRO_BASE=/foodie npm run test:e2e  # GitHub Pages layout → …:4322/foodie/
 *
 * `npx playwright test` (default config) also runs tests/e2e via its own
 * `chromium` project against the visual build on 4321.
 */
const PORT = Number(process.env.E2E_PORT ?? 4322);

// Mirror astro.config.mjs: ASTRO_BASE unset → '/', otherwise normalise to a
// single leading and trailing slash so baseURL joins with relative gotos.
const BASE_PATH = `/${(process.env.ASTRO_BASE ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/\/\/+/g, '/');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // The full `build` (with the Pagefind index, ~1 s more) rather than
    // `build:no-search`: both configs share dist/, and a search-less dist left
    // behind by this run used to break tests/visual/search.spec.ts when the
    // visual suite ran next without rebuilding. ASTRO_BASE, when set, flows
    // into both build and preview through the inherited environment.
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
