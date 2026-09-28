import { test, expect, type Page } from '@playwright/test';
import { GOALS, PLAN, TRACKING, TRACKING_HISTORY, seedPlanning } from '../fixtures/planning';

/**
 * CSP audit on the real build (hardening pass after Phase 5, roadmap #035,
 * ADR 0012 § CSP). Visits every distinct route template in the three locales
 * and exercises the interactions that render styles/scripts at runtime
 * (Dialog, Select, planner drag-and-drop, recharts on /tracking/progress/),
 * and fails on ANY Content-Security-Policy violation:
 *
 *   - `securitypolicyviolation` events, collected from the first byte by an
 *     init script (a refused `<style>`, `style="…"`, inline script, `eval`,
 *     font or connection — including the ones the page swallows);
 *   - console messages that report a CSP refusal ("Refused to …",
 *     "Content Security Policy").
 *
 * Runs under the production policy (no `bypassCSP`) in both Playwright
 * configs: `npm run test:e2e` and the default config's `chromium` project.
 * Every `goto` is relative so it also works under `ASTRO_BASE=/foodie`.
 */

type Violation = { directive: string; blocked: string; sample: string; source: string; line: number };

declare global {
  interface Window {
    __cspViolations?: Violation[];
  }
}

const LOCALES = ['', 'es/', 'fr/'] as const;

/** One URL per route template (the locale prefix is added per test). */
const ROUTES = [
  '',
  'recipes/',
  'recipes/rec_001/',
  'ingredients/',
  'ingredients/ing_101/',
  'planner/',
  'shopping/',
  'pantry/',
  'tracking/',
  'tracking/goals/',
  'tracking/progress/',
  'contribute/',
  'profile/',
  'plan/shared/',
  'docs/',
  'gallery/',
  'this-page-does-not-exist/',
] as const;

/** Install the collectors before the first navigation. */
async function watchCsp(page: Page): Promise<string[]> {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener(
      'securitypolicyviolation',
      (e) => {
        window.__cspViolations?.push({
          directive: e.violatedDirective,
          blocked: e.blockedURI,
          sample: e.sample,
          source: e.sourceFile,
          line: e.lineNumber,
        });
      },
      true,
    );
  });
  const consoleRefusals: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/Content[- ]Security[- ]Policy|Refused to (apply|execute|load|connect|evaluate|create|frame)/i.test(text)) {
      consoleRefusals.push(`${page.url()}: ${text}`);
    }
  });
  return consoleRefusals;
}

/** Assert the current document recorded no violation. */
async function expectNoViolations(page: Page, consoleRefusals: string[], label: string) {
  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  const lines = violations.map(
    (v) => `${label}: ${v.directive} blocked ${v.blocked || '(inline)'} at ${v.source}:${v.line} — ${v.sample}`,
  );
  expect([...lines, ...consoleRefusals], `CSP violations on ${label}`).toEqual([]);
}

for (const locale of LOCALES) {
  test.describe(`CSP — /${locale}`, () => {
    for (const route of ROUTES) {
      test(`no violation on /${locale}${route}`, async ({ page }) => {
        const refusals = await watchCsp(page);
        await page.goto(`./${locale}${route}`);
        await page.waitForLoadState('networkidle');
        // Scroll so `client:visible` islands hydrate too.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForLoadState('networkidle');
        await expectNoViolations(page, refusals, `/${locale}${route}`);
      });
    }
  });
}

test.describe('CSP — interactions', () => {
  test('gallery component page (Dialog open)', async ({ page }) => {
    const refusals = await watchCsp(page);
    await page.goto('./gallery/dialog/');
    await page.waitForLoadState('networkidle');
    const trigger = page.getByRole('button', { name: /open/i }).first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.getByRole('dialog').first()).toBeVisible();
    await expectNoViolations(page, refusals, '/gallery/dialog/ (open)');
  });

  test('gallery charts page renders recharts', async ({ page }) => {
    const refusals = await watchCsp(page);
    await page.goto('./gallery/charts/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.recharts-surface').first()).toBeVisible();
    await expectNoViolations(page, refusals, '/gallery/charts/');
  });

  test('planner: drag a recipe, open the share Dialog, open the shared plan', async ({ page }) => {
    const refusals = await watchCsp(page);
    await seedPlanning(page, { currentMealPlan: PLAN });
    await page.goto('./planner/');
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready');

    const source = page.getByTestId('draggable-recipe').first();
    const target = page.getByTestId('meal-slot-tuesday-dinner');
    await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('no layout');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
    await expect(target).toHaveAttribute('data-over', 'true');
    await expectNoViolations(page, refusals, '/planner/ (dragging)');
    await page.mouse.up();
    await expect(target.getByTestId('planned-meal')).toHaveCount(1);

    await page.getByTestId('share-plan-button').click();
    const dialog = page.getByTestId('share-plan-dialog');
    await expect(dialog.getByTestId('share-qr')).toBeVisible();
    const link = await dialog.getByTestId('share-url-input').inputValue();
    await expectNoViolations(page, refusals, '/planner/ (share dialog)');

    await page.goto(link.replace('/plan/shared/', '/fr/plan/shared/'));
    await expect(page.getByTestId('shared-plan')).toHaveAttribute('data-status', 'ready');
    await expectNoViolations(page, refusals, '/fr/plan/shared/#p=…');
  });

  test('tracking: quick-add Dialog with Tabs and Select', async ({ page }) => {
    const refusals = await watchCsp(page);
    await seedPlanning(page, { trackingEntries: TRACKING });
    await page.goto('./es/tracking/');
    await expect(page.getByTestId('tracking-day')).toHaveAttribute('data-catalog', 'success');
    await page.getByTestId('tracking-quick-add').click();
    const dialog = page.getByTestId('quick-add-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('quick-add-recipe-option').first().click();
    await expect(dialog.getByTestId('quick-add-preview')).toBeVisible();
    await dialog.getByRole('tab').nth(2).click();
    await expectNoViolations(page, refusals, '/es/tracking/ (quick add)');
  });

  test('progress: charts render with seeded tracking data (week + month)', async ({ page }) => {
    const refusals = await watchCsp(page);
    await seedPlanning(page, { trackingEntries: TRACKING_HISTORY, nutritionGoals: GOALS });
    await page.goto('./tracking/progress/');
    const dashboard = page.getByTestId('progress-dashboard');
    await dashboard.scrollIntoViewIfNeeded();
    await expect(dashboard).toHaveAttribute('data-status', 'ready');
    const chart = page.getByTestId('progress-calories-chart');
    await expect(chart.locator('.recharts-surface').first()).toBeVisible();
    await page.getByRole('button', { name: 'Month' }).click();
    await expect(page.getByTestId('progress-view')).toHaveAttribute('data-view', 'month');
    // Hover a bar: recharts renders its tooltip on demand.
    const box = await chart.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    await expectNoViolations(page, refusals, '/tracking/progress/ (month, tooltip)');
  });

  test('recipes: filters and sort Select open', async ({ page }) => {
    const refusals = await watchCsp(page);
    await page.goto('./recipes/');
    await expect(page.getByTestId('recipe-browser')).toHaveAttribute('data-status', 'ready');
    const combobox = page.getByRole('combobox').first();
    await combobox.click();
    await expect(page.getByRole('listbox').first()).toBeVisible();
    await expectNoViolations(page, refusals, '/recipes/ (sort select open)');
  });

  test('docs sub-page (Shiki code blocks)', async ({ page }) => {
    const refusals = await watchCsp(page);
    await page.goto('./docs/stack/overview/');
    await page.waitForLoadState('networkidle');
    await expectNoViolations(page, refusals, '/docs/stack/overview/');
  });

  // Negative control: the collector must see a refusal, or a green run means
  // nothing. An injected <style> with an unhashed text is refused by style-src.
  test('the collector reports a refused inline <style>', async ({ page }) => {
    await watchCsp(page);
    await page.goto('./');
    await page.evaluate(() => {
      const el = document.createElement('style');
      el.textContent = 'body { outline: 1px solid red; }';
      document.head.append(el);
    });
    await expect
      .poll(() => page.evaluate(() => (window.__cspViolations ?? []).map((v) => v.directive)))
      .toContain('style-src-elem');
  });
});
