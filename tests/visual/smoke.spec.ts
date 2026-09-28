/**
 * Console-error smoke — blocks PRs on hydration mismatches, broken scripts,
 * and failed module loads. No baselines required; runs fast.
 *
 * Uses the console-guard fixture which automatically fails a test if any
 * browser console.error or uncaught pageerror is emitted during the page
 * load. See tests/fixtures/console-guard.ts for the allowlist.
 *
 * Route coverage: representative cross-section of the app — the landing in
 * all three locales (roadmap Issue 005), the catalog, the planning islands
 * (roadmap Issue 029: /planner/, /es/shopping/, /fr/pantry/), the progress
 * charts, the contribution wizard, the gallery index (built outside the
 * production deploy — roadmap Issue 046) and the docs.
 *
 * Hermetic: the GitHub REST API (FeedbackFAB's duplicate-issue search) is answered
 * with deterministic fixtures, so a TLS-intercepting proxy or a rate limit on
 * a third-party host cannot fail the gate — it checks this app's errors, not
 * the network's. Runs under the production CSP (no bypassCSP), so a
 * "Refused to …" console error also fails it.
 */

import { test, expect } from '../fixtures/console-guard';

const ROUTES = ['/', '/es/', '/fr/', '/recipes/', '/ingredients/', '/ingredients/ing_101/', '/planner/', '/es/shopping/', '/fr/pantry/', '/tracking/progress/', '/contribute/', '/gallery/', '/docs/'] as const;

for (const route of ROUTES) {
  test(`smoke — ${route} — no console errors`, async ({ page }) => {
    await page.route(/^https:\/\/api\.github\.com\//, (r) => {
      const { pathname } = new URL(r.request().url());
      const body = /\/issues$/.test(pathname)
        ? []
        : { full_name: 'ArtemioPadilla/foodie', stargazers_count: 0, forks_count: 0, open_issues_count: 0 };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    // Assert the HydrationCanary sessionStorage key is empty, tying the
    // runtime canary and the CI gate to the same signal.
    const canaryKey = await page.evaluate(() =>
      sessionStorage.getItem('hydration-mismatch-urls'),
    );
    expect(
      canaryKey === null || canaryKey === '[]',
      `HydrationCanary detected mismatches on ${route}: ${canaryKey}`,
    ).toBe(true);
  });
}
