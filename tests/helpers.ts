/**
 * Playwright test helpers shared across visual specs.
 *
 * CONVENTION (from issue #175 / mexico-weather lesson):
 *   E2E specs MUST NOT assert against repo-committed data snapshots. Their
 *   content can change via cron, not PR, so any spec that reads a live data
 *   file will break on the next refresh without any code change.
 *
 *   Use `mockDataRoutes` to replace same-origin data routes with deterministic
 *   fixture payloads before the first `page.goto()` call. Example:
 *
 *   ```ts
 *   import { mockDataRoutes } from '../helpers';
 *
 *   test('my spec', async ({ page }) => {
 *     await mockDataRoutes(page, {
 *       '/data/cities.json': [{ name: 'Guadalajara' }],
 *     });
 *     await page.goto('/search');
 *     // ...
 *   });
 *   ```
 */

import type { Page } from '@playwright/test';

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/**
 * Registers `page.route` intercepts that fulfill same-origin `/data/*.json` (any prefix)
 * requests with deterministic fixture payloads.
 *
 * @param page     The Playwright `Page` object.
 * @param overrides Map of URL glob → JSON payload. Keys are matched via
 *                  Playwright's route glob (e.g. `**` followed by `/data/cities.json`).
 */
export async function mockDataRoutes(
  page: Page,
  overrides: Record<string, JsonValue>,
): Promise<void> {
  for (const [urlPattern, payload] of Object.entries(overrides)) {
    await page.route(urlPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      }),
    );
  }
}

/**
 * Answers Google Fonts (`fonts.googleapis.com` stylesheet + `fonts.gstatic.com`
 * files) with an empty stylesheet, so screenshots always render with the
 * system fallback stack (roadmap Issue 029).
 *
 * WHY: baselines must not depend on a third-party host. Where the fonts are
 * reachable (GitHub runners) the page swaps to Fraunces/Hanken Grotesk after
 * load; where they are not (proxied sandboxes, offline laptops) it keeps the
 * fallback — the same commit would produce two different pictures. Pinning the
 * fallback makes every environment render the same glyphs. Typography itself
 * is covered by Lighthouse and the a11y contrast checks, not by pixels.
 * Call it before the first `page.goto()`.
 */
export async function pinSystemFonts(page: Page): Promise<void> {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
}
