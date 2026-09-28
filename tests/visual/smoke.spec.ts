/**
 * Console-error smoke — blocks PRs on hydration mismatches, broken scripts,
 * and failed module loads. No baselines required; runs fast.
 *
 * Uses the console-guard fixture which automatically fails a test if any
 * browser console.error or uncaught pageerror is emitted during the page
 * load. See tests/fixtures/console-guard.ts for the allowlist.
 *
 * Route coverage: representative cross-section of the app — the landing in
 * all three locales (roadmap Issue 005), one coming-soon section, gallery
 * index, dashboard demo and docs.
 */

import { test, expect } from '../fixtures/console-guard';

const ROUTES = ['/', '/es/', '/fr/', '/recipes/', '/ingredients/', '/ingredients/ing_101/', '/gallery/', '/demos/dashboard/', '/docs/'] as const;

for (const route of ROUTES) {
  test(`smoke — ${route} — no console errors`, async ({ page }) => {
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
