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
    // `--ignore-lock` keeps `astro preview` in the foreground. Since Astro 7
    // the CLI auto-backgrounds itself (and exits 0) when it detects an agent
    // environment (CLAUDECODE, AI_AGENT, … via am-i-vibing), which Playwright
    // reports as "Process from config.webServer exited early" and which left
    // an orphaned daemon behind. `--ignore-lock` disables that auto-background
    // path and skips the .astro lock file, so Playwright owns (and kills) the
    // server process in every environment — and the visual (4321) and e2e
    // (4322) servers can run side by side from the same root.
    command: `npm run build && npm run preview -- --port ${PORT} --ignore-lock`,
    // Auth journeys (roadmap Issues 035/036) run against the in-memory mock
    // adapter (`src/lib/auth/mock.ts`): no Firebase project, no network, no
    // credentials in CI. Playwright merges this over process.env. NOTE: the
    // resulting dist/ has the mock enabled — rebuild before the visual suite.
    env: { PUBLIC_AUTH_MOCK: '1' },
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
