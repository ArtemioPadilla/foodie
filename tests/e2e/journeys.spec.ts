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

test('landing loads and the "Browse recipes" CTA reaches the /recipes/ browser', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const cta = page.getByTestId('hero-cta-recipes');
  await expect(cta).toHaveText(/browse recipes/i);
  await cta.click();

  await page.waitForURL(/\/recipes\/$/);
  // Roadmap Issue 017: the real page renders the RecipeBrowser island — the
  // heading is static, the search box hydrates, and the catalog cards follow.
  await expect(page.locator('main[data-page="recipes"] h1')).toContainText(/recipes/i);
  await expect(page.getByTestId('recipe-search')).toBeVisible();
  await expect(page.getByTestId('recipe-card').first()).toBeVisible();
});

test('the recipe browser keeps its filters in the URL and applies them from it', async ({ page }) => {
  await page.goto('./recipes/?type=breakfast&sort=time-asc');

  const results = page.getByTestId('recipe-results');
  await expect(results).toBeVisible();
  const cards = page.getByTestId('recipe-card');
  const withFilter = await cards.count();
  expect(withFilter).toBeGreaterThan(0);
  await expect(page.getByTestId('active-filter-count')).toHaveText('1');

  // Typing a search narrows the list and lands in `?q=`.
  await page.getByTestId('recipe-search').fill('zzzz-no-such-recipe');
  await expect(page.getByTestId('empty-filtered')).toBeVisible();
  await expect(page).toHaveURL(/q=zzzz-no-such-recipe/);

  // "Clear filters" resets to the full catalog and cleans the URL.
  await page.getByTestId('reset-all').click();
  await expect(page.getByTestId('empty-filtered')).toHaveCount(0);
  expect(await cards.count()).toBeGreaterThan(withFilter);
  await expect(page).not.toHaveURL(/type=|q=/);
});

test('a recipe card opens the static detail page, which scales, favourites and plans (roadmap #018)', async ({ page }) => {
  await page.goto('./recipes/');
  const firstCard = page.getByTestId('recipe-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.getByRole('link').click();
  await page.waitForURL(/\/recipes\/rec_\d+\/$/);

  const main = page.locator('main[data-page="recipe-detail"]');
  await expect(main.locator('h1')).toBeVisible();
  // Static SEO surface: one Recipe JSON-LD block and hreflang alternates.
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
  expect(ld['@type']).toBe('Recipe');
  expect(Array.isArray(ld.recipeIngredient) && ld.recipeIngredient.length).toBeTruthy();
  await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute('href', /\/es\/recipes\/rec_\d+\/$/);

  // The island hydrates on visibility; scaling doubles the servings value.
  const actions = page.getByTestId('recipe-detail-actions');
  await actions.scrollIntoViewIfNeeded();
  await expect(actions).toHaveAttribute('data-hydrated', 'true');
  const value = page.getByTestId('servings-value');
  const before = Number(await value.textContent());
  await page.getByRole('button', { name: /increase servings/i }).click();
  await expect(value).toHaveText(String(before + 1));
  await expect(page.getByTestId('scaled-note')).toBeVisible();

  // Favourite persists under the legacy key.
  const favorite = page.getByTestId('favorite-button');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('favoriteRecipes'))).toMatch(/rec_\d+/);

  // Add to plan through the day/meal dialog.
  await page.getByTestId('add-to-plan-button').click();
  await expect(page.getByTestId('add-to-plan-dialog')).toBeVisible();
  await page.getByTestId('confirm-add-to-plan').click();
  await expect(page.getByTestId('add-to-plan-dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('currentMealPlan'))).toMatch(/rec_\d+/);

  // Add ingredients to the shopping list.
  await page.getByTestId('add-to-shopping-button').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shoppingList') ?? '[]').length)).toBeGreaterThan(0);

  // Related recipes are static links to other detail pages.
  const related = page.getByTestId('related-recipes').getByRole('link').first();
  await expect(related).toHaveAttribute('href', /\/recipes\/rec_\d+\/$/);
});

test('recipe detail pages exist in every locale with localised copy', async ({ page }) => {
  await page.goto('./es/recipes/rec_001/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByTestId('back-to-recipes')).toHaveAttribute('href', /\/es\/recipes\/$/);
  await expect(page.getByRole('heading', { name: 'Ingredientes' })).toBeVisible();

  await page.goto('./fr/recipes/rec_001/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { name: 'Instructions' })).toBeVisible();
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
