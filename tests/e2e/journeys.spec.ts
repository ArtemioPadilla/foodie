/**
 * E2E journeys — the critical paths of the Foodie shell (roadmap Issue 005).
 *
 * These run under two configs:
 *  - `npm run test:e2e` (playwright.e2e.config.ts) builds + previews on its
 *    own port; `ASTRO_BASE=/foodie npm run test:e2e` exercises the GitHub
 *    Pages layout because baseURL carries the base path.
 *  - `npx playwright test` (playwright.config.ts) runs them alongside the
 *    visual suite against the existing build on 4321.
 *
 * Every navigation uses `page.goto('./…')`-style relative paths so the same
 * spec works with and without a base path, and assertions on URLs match the
 * route *suffix* rather than an absolute path.
 */
import { test, expect } from '@playwright/test';

const SECTIONS = ['recipes', 'ingredients', 'planner', 'shopping', 'pantry', 'tracking', 'contribute'] as const;

test('landing loads and the "Browse recipes" CTA reaches the /recipes/ placeholder', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const cta = page.getByTestId('hero-cta-recipes');
  await expect(cta).toHaveText(/browse recipes/i);
  await cta.click();

  await page.waitForURL(/\/recipes\/$/);
  // The section is not migrated yet: the coming-soon body renders with the
  // section name in its heading and a way back home.
  await expect(page.locator('main[data-page="coming-soon"]')).toHaveAttribute('data-section', 'recipes');
  await expect(page.locator('main h1')).toContainText(/recipes/i);
  await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
});

test('the language switcher keeps the current route (EN → ES → FR)', async ({ page }) => {
  await page.goto('./recipes/');

  await page.locator('a[data-lang-switch="es"]').first().click();
  await page.waitForURL(/\/es\/recipes\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('main h1')).toContainText('Recetas');

  await page.locator('a[data-lang-switch="fr"]').first().click();
  await page.waitForURL(/\/fr\/recipes\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('main h1')).toContainText('Recettes');

  // The explicit choice is persisted so the first-visit redirect never
  // bounces the visitor back (LangSwitcher contract).
  const stored = await page.evaluate(() => localStorage.getItem('foodie:locale'));
  expect(stored).toBe('fr');
});

test('the header links every section in the page locale', async ({ page }) => {
  await page.goto('./es/');
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(nav).toBeVisible();
  for (const section of SECTIONS) {
    const link = nav.locator(`a[href$="/es/${section}/"]`).first();
    await expect(link, `header should link /es/${section}/`).toHaveCount(1);
  }
  // Home is the active item on the landing.
  await expect(nav.locator('a[aria-current="page"]').first()).toHaveAttribute('href', /\/es\/$/);
});

test('on a phone the menu opens in a sheet and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('./');

  const trigger = page.getByTestId('mobile-nav-trigger');
  await expect(trigger).toBeVisible();
  // MobileNav hydrates client:idle; Astro drops the `ssr` attribute from the
  // <astro-island> once the React root is live — click only after that, or
  // the SSR button is inert and the sheet never opens.
  await page.waitForSelector('astro-island:not([ssr]) [data-testid="mobile-nav-trigger"]');
  await trigger.click();

  const sheet = page.getByTestId('mobile-nav');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Planner' })).toBeVisible();
  await sheet.getByRole('link', { name: 'Planner' }).click();

  await page.waitForURL(/\/planner\/$/);
  await expect(page.locator('main[data-page="coming-soon"]')).toHaveAttribute('data-section', 'planner');
});

test('unknown paths render the Foodie 404 with a way home per language', async ({ page }) => {
  const response = await page.goto('./this-page-does-not-exist/');
  // `astro preview` answers 404 with dist/404.html; GitHub Pages does the same.
  expect(response?.status()).toBe(404);
  await expect(page.locator('main h1')).toHaveText('Page not found');
  // Scoped to <main>: the header/footer LangSwitcher also carries hreflang links.
  await expect(page.locator('main a[hreflang="es"][lang="es"]')).toHaveAttribute('href', /\/es\/$/);
  await expect(page.locator('main a[hreflang="fr"][lang="fr"]')).toHaveAttribute('href', /\/fr\/$/);
});
