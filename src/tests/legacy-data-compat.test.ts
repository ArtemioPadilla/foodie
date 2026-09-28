// @vitest-environment jsdom
/**
 * Legacy-data compatibility (roadmap Issue 030, cutover): a browser that ran
 * Foodie v1 (the React 18 + Vite SPA on `main`) opens v2 and keeps its plan,
 * shopping list, pantry, favourites and tracking.
 *
 * The fixture (`fixtures/legacy-v1-localstorage.json`) holds one value per
 * key of ADR 0002's table of the 12 v1 keys, shaped exactly as the legacy
 * code wrote them (derived from `git show main:src/contexts/*.tsx`,
 * `components/planner/PlanTemplates.tsx`, `components/tracking/quickAdd/*`,
 * `services/authService.ts` and `utils/nutritionCalculator.ts`): raw strings
 * for `theme`, `i18nextLng` and the v1 GitHub token, `JSON.stringify` for
 * everything else. It includes the odd shapes v1 really produced — a plan
 * without `createdAt`, a day with `snacks: []` after a removal, templates with
 * the same name in every language, pantry items whose `ingredientId` is the
 * free text typed in `AddItemModal`, `usedIn` holding English recipe *names*
 * and one line in the shape of v1's `generateFromPlan` (which truncated ids at
 * the first `_`, so `ing_001` became `ing`, with `notes: ''`).
 *
 * The same JSON is what the maintainer pastes for the manual check in
 * docs/runbooks/cutover.md.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LEGACY_GITHUB_TOKEN_KEY, purgeRetiredKeys } from '@/lib/retired-keys';

type Fixture = Record<string, unknown>;

// jsdom replaces the global `URL`, so resolve from the Vitest root (the repo).
const repoFile = (path: string) => resolve(process.cwd(), path);

const fixture = JSON.parse(
  readFileSync(repoFile('src/tests/fixtures/legacy-v1-localstorage.json'), 'utf-8'),
) as Fixture;
const legacy = Object.fromEntries(Object.entries(fixture).filter(([key]) => key !== '$comment'));

/** What v1 wrote for `key`: raw for strings, `JSON.stringify` for the rest. */
const raw = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

const UID = 'Xk2mP9qLr4TzW8vB1nYc';

/** The 12 keys of ADR 0002 § "What the legacy app stores today". */
const V1_KEYS = [
  'theme',
  'i18nextLng',
  'favoriteRecipes',
  'currentMealPlan',
  'savedMealPlans',
  'shoppingList',
  'pantryItems',
  'trackingEntries',
  'nutritionGoals',
  `user-preferences-${UID}`,
  `user-favorites-${UID}`,
  LEGACY_GITHUB_TOKEN_KEY,
];

type Stores = {
  theme: typeof import('@/stores/theme');
  favorites: typeof import('@/stores/favorites');
  planner: typeof import('@/stores/planner');
  shopping: typeof import('@/stores/shopping');
  pantry: typeof import('@/stores/pantry');
  tracking: typeof import('@/stores/tracking');
  goals: typeof import('@/stores/goals');
  preferences: typeof import('@/stores/preferences');
};
let stores: Stores;
const warn = vi.fn();

beforeAll(async () => {
  localStorage.clear();
  for (const [key, value] of Object.entries(legacy)) localStorage.setItem(key, raw(value));
  vi.spyOn(console, 'warn').mockImplementation(warn);
  // Fresh module graph: every persistentAtom hydrates from the seeded storage
  // exactly as on the first page load after the cutover.
  vi.resetModules();
  stores = {
    theme: await import('@/stores/theme'),
    favorites: await import('@/stores/favorites'),
    planner: await import('@/stores/planner'),
    shopping: await import('@/stores/shopping'),
    pantry: await import('@/stores/pantry'),
    tracking: await import('@/stores/tracking'),
    goals: await import('@/stores/goals'),
    preferences: await import('@/stores/preferences'),
  };
});

describe('the v1 fixture', () => {
  it('covers exactly the 12 keys of ADR 0002', () => {
    expect(Object.keys(legacy).sort()).toEqual([...V1_KEYS].sort());
    const adr = readFileSync(repoFile('docs/decisions/0002-local-first-user-data.md'), 'utf-8');
    for (const key of ['theme', 'i18nextLng', 'favoriteRecipes', 'currentMealPlan', 'savedMealPlans', 'shoppingList', 'pantryItems', 'trackingEntries', 'nutritionGoals', LEGACY_GITHUB_TOKEN_KEY]) {
      expect(adr).toContain(`\`${key}\``);
    }
    expect(adr).toContain('`user-preferences-${uid}`');
    expect(adr).toContain('`user-favorites-${uid}`');
  });
});

describe('every v2 store hydrates from v1 localStorage', () => {
  it('no store rejected its value (no persistentAtom warning)', () => {
    expect(warn).not.toHaveBeenCalled();
  });

  it('theme: the raw "dark" string is the explicit choice', () => {
    expect(stores.theme.readStoredTheme()).toBe('dark');
    expect(stores.theme.$theme.get()).toBe('dark');
  });

  it('favoriteRecipes → $favorites', () => {
    expect(stores.favorites.$favorites.get()).toEqual(legacy.favoriteRecipes);
    expect(stores.favorites.isFavorite('rec_007')).toBe(true);
  });

  it('currentMealPlan → $currentPlan, meals and snacks intact', () => {
    const plan = stores.planner.$currentPlan.get();
    expect(plan).toEqual(legacy.currentMealPlan);
    expect(stores.planner.$hasPlan.get()).toBe(true);
    // breakfast Mon + lunch/dinner Wed + 2 snacks Fri; Saturday's `snacks: []` counts nothing.
    expect(stores.planner.$currentPlanMealCount.get()).toBe(5);
    expect(plan?.days[2]?.meals.dinner).toEqual({ recipeId: 'rec_001', servings: 4 });
  });

  it('savedMealPlans → $savedPlans, including v1 templates', () => {
    const saved = stores.planner.$savedPlans.get();
    expect(saved).toEqual(legacy.savedMealPlans);
    expect(saved.map((p) => p.id)).toEqual(['plan_1758189600000', 'template_1758276000000']);
    expect(saved[1]?.name.es).toBe('Busy week');
  });

  it('shoppingList → $shopping, checked state and notes intact', () => {
    const list = stores.shopping.$shopping.get();
    expect(list).toEqual(legacy.shoppingList);
    expect(stores.shopping.$shoppingCount.get()).toBe(3);
    expect(stores.shopping.$shoppingCheckedCount.get()).toBe(1);
  });

  it('pantryItems → $pantry, catalog and free-text ingredients alike', () => {
    const pantry = stores.pantry.$pantry.get();
    expect(pantry).toEqual(legacy.pantryItems);
    expect(pantry.map((i) => i.ingredientId)).toEqual(['ing_026', 'Olive oil']);
  });

  it('trackingEntries → $tracking (recipe, water and ingredient entries)', () => {
    const entries = stores.tracking.$tracking.get();
    expect(entries).toEqual(legacy.trackingEntries);
    expect(entries.map((e) => e.mealType)).toEqual(['breakfast', 'beverage', 'lunch']);
  });

  it('nutritionGoals → $goals (the user\'s own targets, not the defaults)', () => {
    expect(stores.goals.$goals.get()).toEqual(legacy.nutritionGoals);
  });

  it('first writes keep the v1 keys and shapes (a round trip loses nothing)', () => {
    stores.favorites.toggleFavorite('rec_020');
    expect(JSON.parse(localStorage.getItem('favoriteRecipes')!)).toEqual([...(legacy.favoriteRecipes as string[]), 'rec_020']);
    const plan = stores.planner.$currentPlan.get()!;
    stores.planner.updatePlan({ servings: 3 });
    expect(JSON.parse(localStorage.getItem('currentMealPlan')!)).toMatchObject({ ...plan, servings: 3 });
  });
});

describe('keys v2 does not read yet, or never will', () => {
  it('per-account keys (10, 11) are left untouched while signed out and already match their schemas', async () => {
    const { UserPreferencesSchema, FavoriteRecipesSchema } = await import('@/schemas');
    const prefs = localStorage.getItem(`user-preferences-${UID}`);
    expect(prefs).toBe(raw(legacy[`user-preferences-${UID}`]));
    expect(UserPreferencesSchema.safeParse(JSON.parse(prefs!)).success).toBe(true);
    const favs = localStorage.getItem(`user-favorites-${UID}`);
    expect(favs).toBe(raw(legacy[`user-favorites-${UID}`]));
    expect(FavoriteRecipesSchema.safeParse(JSON.parse(favs!)).success).toBe(true);
    // The guest preferences store starts from its own key, not the account's.
    expect(stores.preferences.$preferences.get().allergies).toEqual([]);
  });

  it('per-account keys (10, 11) become $preferences / $favorites when that v1 account signs in (Issue 037)', async () => {
    const { $user } = await import('@/stores/user');
    $user.set({ uid: UID, email: 'v1@foodie.test', displayName: 'V1', photoURL: null, emailVerified: true, method: 'password', createdAt: null });
    expect(stores.preferences.$preferences.key).toBe(`user-preferences-${UID}`);
    expect(stores.preferences.$preferences.get()).toEqual(legacy[`user-preferences-${UID}`]);
    expect(stores.favorites.$favorites.key).toBe(`user-favorites-${UID}`);
    expect(stores.favorites.$favorites.get()).toEqual(legacy[`user-favorites-${UID}`]);
    // Reading does not rewrite them.
    expect(localStorage.getItem(`user-preferences-${UID}`)).toBe(raw(legacy[`user-preferences-${UID}`]));
    $user.set(null);
    expect(stores.favorites.$favorites.key).toBe('favoriteRecipes');
  });

  it('the v1 GitHub token (12) is never read by a store and is purged on first load (D10, roadmap #039)', () => {
    expect(localStorage.getItem(LEGACY_GITHUB_TOKEN_KEY)).toBe(legacy[LEGACY_GITHUB_TOKEN_KEY]);
    for (const store of [
      stores.favorites.$favorites,
      stores.planner.$currentPlan,
      stores.shopping.$shopping,
      stores.pantry.$pantry,
      stores.tracking.$tracking,
      stores.goals.$goals,
      stores.preferences.$preferences,
    ]) {
      expect(store.key).not.toBe(LEGACY_GITHUB_TOKEN_KEY);
    }
    // BaseLayout runs purgeRetiredKeys() on every page: the credential goes, the data stays.
    const snapshot = { ...localStorage };
    try {
      expect(purgeRetiredKeys()).toEqual([LEGACY_GITHUB_TOKEN_KEY]);
      expect(localStorage.getItem(LEGACY_GITHUB_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem('currentMealPlan')).not.toBeNull();
    } finally {
      for (const [key, value] of Object.entries(snapshot)) localStorage.setItem(key, value);
    }
  });

  it('i18nextLng (2) drives the one-time locale redirect on the English root', () => {
    // Run BaseLayout's inline script as the browser would: `location` is
    // shadowed so the redirect is observable instead of navigating jsdom.
    const layout = readFileSync(repoFile('src/layouts/BaseLayout.astro'), 'utf-8');
    const match = layout.match(/define:vars=\{\{ base: baseDir, locales: redirectLocales \}\}>([\s\S]*?)<\/script>/);
    expect(match?.[1]).toBeTruthy();
    const replace = vi.fn();
    const location = { pathname: '/foodie/', search: '', hash: '', replace };
    localStorage.removeItem('foodie:locale');
    new Function('base', 'locales', 'location', match![1]!)('/foodie/', ['es', 'fr'], location);
    expect(localStorage.getItem('foodie:locale')).toBe('es');
    expect(replace).toHaveBeenCalledWith('/foodie/es/');

    // …but it steps aside for a v1 encoded deep link, which LegacyRedirect
    // decodes and localizes itself (src/lib/legacy-redirect.ts).
    replace.mockClear();
    localStorage.removeItem('foodie:locale');
    new Function('base', 'locales', 'location', match![1]!)('/foodie/', ['es', 'fr'], { ...location, search: '?/recipes' });
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem('foodie:locale')).toBeNull();
  });
});
