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

test('a favourite marked on the detail page is listed at /recipes/?favorites=1 and on the landing (roadmap #020)', async ({ page }) => {
  await page.goto('./recipes/rec_002/');
  const actions = page.getByTestId('recipe-detail-actions');
  await actions.scrollIntoViewIfNeeded();
  await expect(actions).toHaveAttribute('data-hydrated', 'true');
  const favorite = page.getByTestId('favorite-button');
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/added to your favorites/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('favoriteRecipes'))).toBe('["rec_002"]');

  // The favourites-only filter is the `?favorites=1` URL contract.
  await page.goto('./recipes/?favorites=1');
  const cards = page.getByTestId('recipe-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toHaveAttribute('data-recipe-id', 'rec_002');
  await expect(page.getByTestId('active-filter-count')).toHaveText('1');
  await expect(cards.first().getByTestId('recipe-card-favorite-button')).toHaveAttribute('aria-pressed', 'true');

  // The landing's "Your favorites" island shows it and links back to the filter.
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const section = page.getByTestId('favorite-recipes');
  await expect(section).toBeVisible();
  await expect(section.locator('[data-recipe-id="rec_002"]')).toBeVisible();
  await section.getByTestId('favorites-view-all').click();
  await page.waitForURL(/\/recipes\/\?favorites=1$/);

  // Unfavouriting from the card empties the filtered list and the storage.
  await page.getByTestId('recipe-card-favorite-button').first().click();
  await expect(page.getByTestId('empty-filtered')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('favoriteRecipes'))).toBe('[]');
});

test('the ingredient browser filters in the URL and opens the static detail, which stocks pantry and shopping (roadmap #019)', async ({ page }) => {
  await page.goto('./ingredients/');
  await expect(page.locator('main[data-page="ingredients"] h1')).toBeVisible();
  const cards = page.getByTestId('ingredient-card');
  await expect(cards.first()).toBeVisible();
  const total = await cards.count();
  expect(total).toBe(105);

  // Category chip narrows to one group and lands in `?category=`.
  await page.getByTestId('category-filter').getByRole('button', { name: /Spices/ }).click();
  await expect(page).toHaveURL(/category=spices/);
  await expect(page.getByTestId('ingredient-group')).toHaveCount(1);
  expect(await cards.count()).toBeLessThan(total);

  // Search + open the static page.
  await page.getByTestId('ingredient-search').fill('garlic');
  await expect(page).toHaveURL(/q=garlic/);
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole('link', { name: 'Garlic' }).click();
  await page.waitForURL(/\/ingredients\/ing_006\/$/);

  const main = page.locator('main[data-page="ingredient-detail"]');
  await expect(main.locator('h1')).toHaveText('Garlic');
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute('href', /\/fr\/ingredients\/ing_006\/$/);
  // "Recipes with this ingredient" is static and links to recipe pages.
  const recipeLinks = page.getByTestId('ingredient-recipes').getByRole('link');
  expect(await recipeLinks.count()).toBeGreaterThan(0);
  await expect(recipeLinks.first()).toHaveAttribute('href', /\/recipes\/rec_\d+\/$/);

  // The IngredientActions island writes the legacy pantry / shopping keys.
  const actions = page.getByTestId('ingredient-actions');
  await actions.scrollIntoViewIfNeeded();
  await expect(actions).toHaveAttribute('data-hydrated', 'true');
  await page.getByTestId('ingredient-quantity').fill('2');
  await page.getByTestId('add-to-pantry-button').click();
  await expect(page.getByTestId('ingredient-in-pantry')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pantryItems') ?? '[]')[0]?.ingredientId)).toBe('ing_006');
  await page.getByTestId('add-ingredient-to-shopping-button').click();
  await expect(page.getByTestId('ingredient-on-list')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('shoppingList') ?? '[]')[0]?.quantity)).toBe(2);
});

test('recipe ingredients link to their ingredient page, which lists the recipe back (roadmap #019)', async ({ page }) => {
  await page.goto('./es/recipes/rec_001/');
  const actions = page.getByTestId('recipe-detail-actions');
  await actions.scrollIntoViewIfNeeded();
  const link = page.getByTestId('ingredient-link').first();
  await expect(link).toHaveAttribute('href', /\/es\/ingredients\/ing_\d+\/$/);
  await link.click();
  await page.waitForURL(/\/es\/ingredients\/ing_\d+\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByTestId('ingredient-recipes').locator('a[data-recipe-id="rec_001"]')).toHaveAttribute(
    'href',
    /\/es\/recipes\/rec_001\/$/,
  );
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
  // Roadmap Issue 024: /planner/ is the real MealPlanner page now.
  await expect(page.locator('main[data-page="planner"] h1')).toHaveText('Meal Planner');
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

// ── Catalog journeys (roadmap Issue 023) ─────────────────────────────────────
// Port of legacy `tests/e2e/recipe-browsing.spec.ts` (homepage, cards, search,
// type filter, detail, ingredients + instructions, scaling, language) and of
// the catalog part of `translations.spec.ts` (no raw translation keys; the
// network assertions on /locales/*.json are gone with i18next — dictionaries
// are compiled into each static page). Selectors are accessible roles and
// names first, data-testids only where no role/name is stable.

test.describe('catalog journeys (roadmap #023)', () => {
  test('home → recipes → search "salad" → filter type → detail → scale → Español → ingredients → detail', async ({ page }) => {
    // Home.
    await page.goto('./');
    await expect(page).toHaveTitle(/Foodie/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // → Recipes through the primary navigation.
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Recipes', exact: true }).click();
    await page.waitForURL(/\/recipes\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/recipes/i);
    const cards = page.getByTestId('recipe-card');
    await expect(cards.first()).toBeVisible();
    const all = await cards.count();

    // Search "salad": the list narrows and every hit mentions salad.
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('salad');
    await expect(page).toHaveURL(/q=salad/);
    await expect.poll(() => cards.count()).toBeLessThan(all);
    const salads = await cards.count();
    expect(salads).toBeGreaterThan(0);

    // Filter by meal type "Lunch" (a checkbox in the "Meal Type" section).
    const filters = page.getByRole('complementary', { name: 'Filters' });
    await filters.getByRole('checkbox', { name: 'Lunch' }).check();
    await expect(page).toHaveURL(/type=lunch/);
    await expect.poll(() => cards.count()).toBeLessThanOrEqual(salads);
    await expect(cards.filter({ hasText: 'Greek Salad' })).toHaveCount(1);
    await expect(cards.filter({ hasText: 'Fruit Salad' })).toHaveCount(0); // a dessert

    // Open the detail through the card's (only) link.
    await cards.filter({ hasText: 'Greek Salad' }).getByRole('link', { name: 'Greek Salad' }).click();
    await page.waitForURL(/\/recipes\/rec_039\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Greek Salad');
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instructions' })).toBeVisible();

    // Scale servings: the ingredient quantities change with them.
    const actions = page.getByTestId('recipe-detail-actions');
    await actions.scrollIntoViewIfNeeded();
    await expect(actions).toHaveAttribute('data-hydrated', 'true');
    const amounts = page.getByTestId('ingredient-amount');
    const before = await amounts.allTextContents();
    const servings = page.getByTestId('servings-value');
    const initial = Number(await servings.textContent());
    await page.getByRole('button', { name: 'Increase servings' }).click();
    await page.getByRole('button', { name: 'Increase servings' }).click();
    await expect(servings).toHaveText(String(initial + 2));
    await expect.poll(() => amounts.allTextContents()).not.toEqual(before);
    await expect(page.getByTestId('scaled-note')).toBeVisible();

    // Switch to Spanish: same recipe, localised URL and copy.
    await page.locator('a[data-lang-switch="es"]').first().click();
    await page.waitForURL(/\/es\/recipes\/rec_039\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ensalada Griega');
    await expect(page.getByRole('heading', { name: 'Ingredientes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instrucciones' })).toBeVisible();

    // → Ingredients (Spanish navigation) → an ingredient detail.
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Ingredientes', exact: true }).click();
    await page.waitForURL(/\/es\/ingredients\/$/);
    const ingredientCards = page.getByTestId('ingredient-card');
    await expect(ingredientCards.first()).toBeVisible();
    await page.getByRole('searchbox', { name: 'Buscar ingredientes' }).fill('ajo');
    await expect(ingredientCards).toHaveCount(1);
    await ingredientCards.first().getByRole('link', { name: 'Ajo' }).click();
    await page.waitForURL(/\/es\/ingredients\/ing_006\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajo');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  // Raw dictionary keys look like `recipe.filters` / `nav.home`: a namespace
  // of the dictionary, a dot, a camelCase/snake_case leaf.
  const RAW_KEY = new RegExp(
    `\\b(${[
      'nav', 'home', 'gallery', 'common', 'footer', 'app', 'tracking', 'goals', 'progress', 'errors', 'recipe',
      'planner', 'shopping', 'pantry', 'contribute', 'profile', 'auth', 'filter', 'dietary', 'cuisine', 'tags',
      'category', 'ingredients', 'ingredient', 'season', 'nutrition', 'offline', 'accessibility', 'units', 'days',
    ].join('|')})\\.[a-z][A-Za-z_]+\\b`,
  );

  for (const prefix of ['', 'es/', 'fr/']) {
    for (const route of ['', 'recipes/', 'ingredients/', 'planner/', 'shopping/']) {
      test(`no raw translation keys on /${prefix}${route}`, async ({ page }) => {
        await page.goto(`./${prefix}${route}`);
        await page.waitForLoadState('networkidle');
        // Let the page's island render its catalog before reading the text.
        if (route === 'recipes/') await expect(page.getByTestId('recipe-card').first()).toBeVisible();
        if (route === 'ingredients/') await expect(page.getByTestId('ingredient-card').first()).toBeVisible();
        if (route === 'planner/') await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty');
        if (route === 'shopping/') await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty');

        const text = await page.locator('body').innerText();
        expect(text.match(RAW_KEY)?.[0], `raw key in the text of /${prefix}${route}`).toBeUndefined();

        // Accessible names and hints count too (aria-label, placeholder, title, alt).
        const attrs = await page.$$eval('[aria-label], [placeholder], [title], img[alt]', (els) =>
          els.flatMap((el) => ['aria-label', 'placeholder', 'title', 'alt'].map((a) => el.getAttribute(a) ?? '')).filter(Boolean),
        );
        expect(attrs.filter((value) => RAW_KEY.test(value)), `raw key in attributes of /${prefix}${route}`).toEqual([]);

        // The page speaks its own language.
        await expect(page.locator('html')).toHaveAttribute('lang', prefix ? prefix.slice(0, 2) : 'en');
      });
    }
  }
});

// ── Planner journeys (roadmap Issue 024) ─────────────────────────────────────
// Port of legacy `tests/e2e/meal-planning.spec.ts` ("loads", "switches between
// week and month view" — `week-view` / `month-view` test ids kept — and the
// skipped "adds meal" / "removes meal" cases, now real), plus the new
// @dnd-kit pointer and keyboard paths.
test.describe('planner journeys (roadmap #024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./planner/');
    await expect(page.locator('main[data-page="planner"] h1')).toBeVisible();
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty');
    await page.getByTestId('create-plan-button').click();
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready');
    // The catalog feeds the side panel.
    await expect(page.getByTestId('draggable-recipe').first()).toBeVisible();
  });

  test('creates a plan and switches between week and month view', async ({ page }) => {
    await expect(page.getByTestId('week-view')).toBeVisible();
    await expect(page.getByTestId('week-view').getByRole('article')).toHaveCount(7);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('currentMealPlan') ?? 'null')?.days?.length)).toBe(7);

    await page.getByRole('tab', { name: 'Month View' }).click();
    await expect(page.getByTestId('month-view')).toBeVisible();
    await expect(page.getByTestId('week-view')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Week View' }).click();
    await expect(page.getByTestId('week-view')).toBeVisible();

    const range = await page.getByTestId('week-range').textContent();
    await page.getByTestId('next-week').click();
    await expect(page.getByTestId('week-range')).not.toHaveText(range ?? '');
    await page.getByTestId('current-week').click();
    await expect(page.getByTestId('week-range')).toHaveText(range ?? '');
  });

  test('"+" adds a recipe through the picker, it persists, and it can be removed', async ({ page }) => {
    const slot = page.getByTestId('meal-slot-monday-breakfast');
    await slot.getByTestId('add-meal-button').click();
    const picker = page.getByTestId('recipe-picker');
    await expect(picker).toBeVisible();
    await picker.getByTestId('recipe-picker-add').first().click();
    await expect(picker).toHaveCount(0);
    await expect(slot.getByTestId('planned-meal')).toHaveCount(1);

    await page.reload();
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('meal-slot-monday-breakfast').getByTestId('planned-meal')).toHaveCount(1);

    await page.getByTestId('meal-slot-monday-breakfast').getByTestId('remove-meal').click();
    await expect(page.getByTestId('meal-slot-monday-breakfast').getByTestId('planned-meal')).toHaveCount(0);
  });

  test('drags a recipe from the panel onto a slot with the pointer', async ({ page }) => {
    const source = page.getByTestId('draggable-recipe').first();
    const target = page.getByTestId('meal-slot-tuesday-dinner');
    // Centre the target: near the viewport edge dnd-kit auto-scrolls the page
    // under the pointer (by design), which would move the drop target.
    await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('no layout');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
    await expect(target).toHaveAttribute('data-over', 'true');
    await page.mouse.up();

    await expect(target.getByTestId('planned-meal')).toHaveCount(1);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('currentMealPlan') ?? 'null'));
    expect(stored.days[1].meals.dinner.recipeId).toMatch(/^rec_\d+$/);
  });

  test('drags a recipe with the keyboard (Space, arrows, Enter) and announces it', async ({ page }) => {
    const source = page.getByTestId('draggable-recipe').first();
    await source.focus();
    await page.keyboard.press('Space');
    await expect(page.getByText(/^Picked up .+\.$/)).toBeAttached();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-slot][data-over="true"]')).toHaveCount(1);
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('planned-meal')).toHaveCount(1);
    await expect(page.getByText(/ was dropped on /)).toBeAttached();
  });

  test('clears the plan after confirming', async ({ page }) => {
    await page.getByTestId('clear-plan').click();
    await expect(page.getByTestId('clear-plan-dialog')).toBeVisible();
    await page.getByTestId('confirm-clear-plan').click();
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty');
    expect(await page.evaluate(() => localStorage.getItem('currentMealPlan'))).toBe('null');
  });
});

// ── Planner picker, templates and summary (roadmap Issue 025) ────────────────
test.describe('planner picker, templates and summary (roadmap #025)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./planner/');
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty');
    await page.getByTestId('create-plan-button').click();
    await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('draggable-recipe').first()).toBeVisible();
  });

  test('the picker is keyboard operable and the summary counts the new meal', async ({ page }) => {
    await expect(page.getByTestId('summary-recipes')).toContainText('0');
    await page.getByTestId('meal-slot-tuesday-lunch').getByTestId('add-meal-button').click();
    const picker = page.getByTestId('recipe-picker');
    await expect(picker).toBeVisible();

    await picker.getByRole('button', { name: /^Fits Lunch$/ }).click();
    const search = picker.getByTestId('recipe-picker-search');
    await search.focus();
    await page.keyboard.press('ArrowDown');
    const previewed = (await picker.getByTestId('recipe-picker-preview-name').textContent())?.trim() ?? '';
    expect(previewed).not.toBe('');
    await expect(picker.getByRole('option', { selected: true })).toContainText(previewed);
    await page.keyboard.press('Enter');

    await expect(picker).toHaveCount(0);
    await expect(page.getByTestId('meal-slot-tuesday-lunch').getByTestId('planned-meal')).toContainText(previewed);
    await expect(page.getByTestId('summary-recipes')).toContainText('1');
    await expect(page.getByTestId('summary-days')).toContainText('1 / 7');
  });

  test('saves the plan as a template, loads it back and deletes it after confirming', async ({ page }) => {
    await page.getByTestId('meal-slot-monday-dinner').getByTestId('add-meal-button').click();
    await page.getByTestId('recipe-picker').getByTestId('recipe-picker-add').click();
    await expect(page.getByTestId('meal-slot-monday-dinner').getByTestId('planned-meal')).toHaveCount(1);

    await page.getByTestId('plan-templates-button').click();
    const manager = page.getByTestId('plan-templates');
    await expect(manager.getByTestId('templates-empty')).toBeVisible();
    await manager.getByPlaceholder('e.g. Busy weeknights').fill('E2E week');
    await manager.getByTestId('save-template').click();
    await expect(manager.getByTestId('template-item')).toContainText('E2E week');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('savedMealPlans') ?? '[]').length)).toBe(1);
    await page.keyboard.press('Escape');
    await expect(manager).toHaveCount(0);

    // Empty the Monday dinner, then bring it back from the template (no confirmation: the plan has no meals left).
    await page.getByTestId('meal-slot-monday-dinner').getByTestId('remove-meal').click();
    await expect(page.getByTestId('planned-meal')).toHaveCount(0);
    await page.getByTestId('plan-templates-button').click();
    await manager.getByRole('button', { name: 'Load E2E week' }).click();
    await expect(manager).toHaveCount(0);
    await expect(page.getByTestId('plan-name')).toHaveText('E2E week');
    await expect(page.getByTestId('meal-slot-monday-dinner').getByTestId('planned-meal')).toHaveCount(1);

    await page.getByTestId('plan-templates-button').click();
    await manager.getByRole('button', { name: 'Delete E2E week' }).click();
    const confirm = page.getByTestId('template-confirm-dialog');
    await expect(confirm).toBeVisible();
    await confirm.getByTestId('confirm-template-action').click();
    await expect(manager.getByTestId('templates-empty')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('savedMealPlans'))).toBe('[]');
  });
});

// ── Shopping list (roadmap Issue 026) ────────────────────────────────────────
// Port of legacy `tests/e2e/shopping-list.spec.ts`: its three live tests
// ("loads shopping list page", "checks off items", "groups items by category")
// keep their assertions — `h1`, `shopping-item` + checkbox + `checked` class,
// `category-group` + category headers — now against a seeded list instead of
// an `if (visible)` guard. The skipped legacy cases (custom item, export,
// WhatsApp, clear completed) are real here, plus generate-from-plan.
test.describe('shopping list journeys (roadmap #026)', () => {
  const SEEDED = [
    { ingredientId: 'ing_001', quantity: 1.5, unit: 'lb', checked: false, usedIn: ['rec_001'], category: 'protein' },
    { ingredientId: 'ing_005', quantity: 3, unit: 'piece', checked: false, usedIn: ['rec_001'], category: 'vegetables' },
    { ingredientId: 'ing_016', quantity: 1, unit: 'cup', checked: false, usedIn: [], category: 'dairy' },
  ];

  async function seed(page: import('@playwright/test').Page, items: unknown[] = SEEDED) {
    await page.goto('./shopping/');
    await page.evaluate((list) => localStorage.setItem('shoppingList', JSON.stringify(list)), items);
    await page.reload();
    await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'ready');
    // Group order and labels come from the catalog; wait for it so rows stop
    // reordering under the locators below.
    await expect(page.getByTestId('shopping-board')).toHaveAttribute('data-catalog', 'success');
  }

  test('loads shopping list page', async ({ page }) => {
    await page.goto('./shopping/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main[data-page="shopping"] h1')).toHaveText('Shopping List');
    await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty');
    await expect(page.getByTestId('shopping-empty')).toBeVisible();
    for (const [prefix, title] of [['es/', 'Lista de Compras'], ['fr/', 'Liste de Courses']] as const) {
      await page.goto(`./${prefix}shopping/`);
      await expect(page.locator('main[data-page="shopping"] h1')).toHaveText(title);
    }
  });

  test('checks off items', async ({ page }) => {
    await seed(page);
    // Anchor the row by ingredient id (legacy used `.first()`), so a re-sort
    // can never retarget the locator between the click and the assertions.
    const firstId = await page.getByTestId('shopping-item').first().getAttribute('data-ingredient-id');
    expect(firstId).toBeTruthy();
    const firstItem = page.locator(`[data-testid="shopping-item"][data-ingredient-id="${firstId}"]`);
    await expect(firstItem).toBeVisible();
    const checkbox = firstItem.getByRole('checkbox');
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    // Item should have checked style
    await expect(firstItem).toHaveClass(/checked/);
    await expect(firstItem).toHaveAttribute('data-checked', 'true');

    await page.reload();
    await expect(page.getByTestId('shopping-board')).toHaveAttribute('data-catalog', 'success');
    await expect(firstItem.getByRole('checkbox')).toBeChecked();
  });

  test('groups items by category', async ({ page }) => {
    await seed(page);
    const categories = page.getByTestId('category-group');
    await expect(categories.first()).toBeVisible();
    await expect(categories).toHaveCount(3);
    // Should have category headers (catalog names; legacy matched Produce|Dairy|Meat)
    await expect(page.getByTestId('category-toggle').filter({ hasText: /Proteins|Vegetables|Dairy/ })).toHaveCount(3);
  });

  test('generates the list from the plan, consolidated and grouped', async ({ page }) => {
    await page.goto('./planner/');
    await page.getByTestId('create-plan-button').click();
    await expect(page.getByTestId('draggable-recipe').first()).toBeVisible();
    await page.getByTestId('meal-slot-monday-dinner').getByTestId('add-meal-button').click();
    await page.getByTestId('recipe-picker').getByTestId('recipe-picker-add').click();
    await expect(page.getByTestId('meal-slot-monday-dinner').getByTestId('planned-meal')).toHaveCount(1);

    await page.goto('./shopping/');
    await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty');
    const generate = page.getByTestId('generate-from-plan');
    await expect(generate).toBeEnabled();
    await generate.click();
    await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'ready');
    await expect(page.getByTestId('category-group').first()).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('shoppingList') ?? '[]'));
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.every((i: { usedIn: string[] }) => i.usedIn.length === 1)).toBe(true);
  });

  test('adds a custom item', async ({ page }) => {
    await page.goto('./shopping/');
    await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty');
    await page.getByTestId('add-item-button').click();
    const dialog = page.getByTestId('add-item-dialog');
    await dialog.getByTestId('item-name-input').fill('Custom Item');
    await dialog.getByTestId('item-quantity-input').fill('2');
    await dialog.getByTestId('item-unit-select').click();
    await page.getByRole('option', { name: 'cup', exact: true }).click();
    await dialog.getByTestId('submit-add-item').click();
    await expect(dialog).toHaveCount(0);

    const item = page.getByTestId('shopping-item').filter({ hasText: 'Custom Item' });
    await expect(item).toBeVisible();
    await expect(item.getByTestId('shopping-item-custom')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('shoppingList') ?? '[]'));
    expect(stored[0].ingredientId).toMatch(/^custom-/);
    expect(stored[0]).toMatchObject({ name: 'Custom Item', quantity: 2, unit: 'cup' });
  });

  test('exports CSV and text (downloads) and shares via WhatsApp (wa.me link)', async ({ page }) => {
    await seed(page);
    await page.getByTestId('export-menu').click();
    const dialog = page.getByTestId('export-dialog');

    const csvDownload = page.waitForEvent('download');
    await dialog.getByTestId('export-csv').click();
    const csv = await csvDownload;
    expect(csv.suggestedFilename()).toBe('shopping-list.csv');

    const textDownload = page.waitForEvent('download');
    await dialog.getByTestId('export-text').click();
    expect((await textDownload).suggestedFilename()).toContain('shopping-list');

    const whatsapp = dialog.getByTestId('whatsapp-share');
    await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/);
    await expect(whatsapp).toHaveAttribute('target', '_blank');
  });

  test('clears completed items after confirming', async ({ page }) => {
    await seed(page);
    const items = page.getByTestId('shopping-item');
    await expect(items).toHaveCount(3);
    await items.first().getByRole('checkbox').click();
    await page.getByTestId('clear-completed').click();
    await page.getByTestId('shopping-confirm-dialog').getByTestId('confirm-shopping-action').click();
    // Checked items should be removed
    await expect(items).toHaveCount(2);
  });
});

