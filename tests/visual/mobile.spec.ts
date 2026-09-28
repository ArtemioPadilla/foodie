import { test, expect, devices } from '@playwright/test';

/**
 * Mobile viewport smoke (audit §2 — "not verified" gap). Asserts the three
 * highest-traffic routes render without horizontal overflow at a phone
 * viewport and keep the primary nav reachable. Uses an explicit viewport
 * instead of a separate Playwright project so it runs inside the existing
 * chromium-light/dark projects.
 */
const PHONE = devices['iPhone 12'].viewport; // 390×844

// `/recipes/` (roadmap Issue 023): the catalog browser — filter sidebar collapses on phones.
// `/planner/`, `/shopping/`, `/pantry/` (roadmap Issue 029): the planning islands.
// `/docs/reference/api/` (roadmap Issue 043): the widest docs tables, generated from src/schemas.
const routes = ['/', '/gallery/', '/docs/', '/docs/reference/api/', '/recipes/', '/planner/', '/shopping/', '/pantry/'];

for (const route of routes) {
  test(`mobile ${route} — no horizontal overflow, nav reachable`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(
      overflow,
      `${route} must not scroll horizontally at ${PHONE.width}px (overflow: ${overflow}px)`,
    ).toBeLessThanOrEqual(1); // allow a 1px rounding artifact

    // Primary nav stays reachable on phones. Foodie's header (roadmap Issue
    // 005) collapses the section links into the MobileNav sheet, so the
    // reachable controls are the brand link home and the menu trigger — the
    // template's inline `header a[href*="gallery"]` assertion no longer
    // applies (adapted deliberately in roadmap Issue 023; the sheet itself
    // is exercised by the e2e journey "on a phone the menu opens…").
    await expect(page.locator('header a[href]').first()).toBeVisible();
    await expect(page.getByTestId('mobile-nav-trigger')).toBeVisible();
  });
}
