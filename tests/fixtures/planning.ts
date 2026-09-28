/**
 * Deterministic planner / shopping / pantry state for the visual and a11y
 * specs (roadmap Issue 029). Shapes are the legacy localStorage shapes the
 * stores read (`currentMealPlan`, `shoppingList`, `pantryItems`).
 *
 * The clock is frozen on Monday 2026-09-28 10:00 UTC so the planner's current
 * week, the pantry's "expires in N days" and the suggestion ranking never move.
 */
import type { Page } from '@playwright/test';

export const PLANNING_NOW = new Date('2026-09-28T10:00:00Z');

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const PLAN = {
  id: 'plan_visual',
  name: { en: 'Visual week', es: 'Semana visual', fr: 'Semaine visuelle' },
  description: { en: '', es: '', fr: '' },
  servings: 2,
  dietaryRestrictions: [],
  difficulty: 'easy',
  estimatedCost: 0,
  currency: 'USD',
  days: DAY_NAMES.map((dayName, i) => ({
    dayNumber: i + 1,
    dayName,
    meals:
      i === 0
        ? { breakfast: { recipeId: 'rec_007', servings: 2 }, dinner: { recipeId: 'rec_001', servings: 2 } }
        : i === 2
          ? { lunch: { recipeId: 'rec_003', servings: 3 } }
          : {},
  })),
  tags: [],
  isPublic: false,
  createdAt: '2026-09-28T09:00:00.000Z',
};

export const SHOPPING = [
  { ingredientId: 'ing_001', quantity: 6, unit: 'piece', checked: false, usedIn: ['rec_001'], category: 'protein' },
  { ingredientId: 'ing_005', quantity: 3, unit: 'piece', checked: true, usedIn: ['rec_001'], category: 'vegetables' },
  { ingredientId: 'ing_025', quantity: 1, unit: 'piece', checked: false, usedIn: ['rec_007'], category: 'fruits' },
  { ingredientId: 'ing_016', quantity: 1, unit: 'cup', checked: false, usedIn: [], category: 'dairy', notes: 'plain' },
  {
    ingredientId: 'custom-00000000-0000-4000-8000-000000000000-maple-syrup',
    name: 'Maple syrup',
    quantity: 1,
    unit: 'piece',
    checked: false,
    usedIn: [],
    category: 'other',
  },
];

const ADDED = '2026-09-20T10:00:00.000Z';

export const PANTRY = [
  { id: 'p1', ingredientId: 'ing_026', quantity: 2, unit: 'cup', addedAt: ADDED, location: 'Cupboard' },
  { id: 'p2', ingredientId: 'ing_025', quantity: 3, unit: 'piece', addedAt: ADDED, expirationDate: '2026-09-30' },
  { id: 'p3', ingredientId: 'ing_001', quantity: 1, unit: 'piece', addedAt: ADDED, expirationDate: '2026-09-26' },
  { id: 'p4', ingredientId: 'ing_016', quantity: 2, unit: 'cup', addedAt: ADDED, location: 'Fridge' },
];

const n = (calories: number, protein: number, carbs: number, fat: number) => ({
  servingSize: '1 serving', calories, protein, carbs, fat, fiber: 3, sugar: 4, sodium: 300, cholesterol: 0,
});

/** Food diary on the frozen "today" (roadmap Issue 031): a recipe, an ingredient, water and a coffee. */
export const TRACKING = [
  { id: 't1', date: '2026-09-28', time: '08:10:00', mealType: 'breakfast', recipeId: 'rec_007', quantity: 1, unit: 'servings', servings: 1, nutrition: n(85, 2.8, 13, 2.5), loggedAt: '2026-09-28T08:10:00.000Z' },
  { id: 't2', date: '2026-09-28', time: '13:05:00', mealType: 'lunch', ingredientId: 'ing_025', quantity: 120, unit: 'g', nutrition: n(180, 30, 0, 6), loggedAt: '2026-09-28T13:05:00.000Z' },
  { id: 't3', date: '2026-09-28', time: '10:30:00', mealType: 'beverage', beverageId: 'bev_water', quantity: 500, unit: 'ml', nutrition: n(0, 0, 0, 0), loggedAt: '2026-09-28T10:30:00.000Z' },
  { id: 't4', date: '2026-09-28', time: '09:00:00', mealType: 'beverage', beverageId: 'bev_coffee_black', quantity: 240, unit: 'ml', nutrition: n(2, 0.3, 0, 0), loggedAt: '2026-09-28T09:00:00.000Z' },
];

/**
 * Custom daily goals for the goals / progress pages (roadmap Issue 034): a
 * 1 800 kcal target, so the seeded days land on both sides of "on track".
 */
export const GOALS = { calories: 1800, protein: 60, carbs: 220, fat: 60, fiber: 28, sodium: 2000, sugar: 40, water: 2500 };

/**
 * Two weeks of diary history before the frozen "today" (roadmap Issue 034),
 * plus `TRACKING` itself: the progress dashboard's month view gets bars, a
 * trend line, macro sparklines, a streak and a most-logged recipe. Days 4 and
 * 9 back are left empty (gaps in the trend). Deterministic — no randomness.
 */
export const TRACKING_HISTORY = [
  ...Array.from({ length: 13 }, (_, i) => i + 1)
    .filter((back) => back !== 4 && back !== 9)
    .flatMap((back) => {
      const date = `2026-09-${String(28 - back).padStart(2, '0')}`;
      const lunch = 900 + ((back * 137) % 700);
      return [
        { id: `h${back}b`, date, time: '08:00:00', mealType: 'breakfast', recipeId: 'rec_007', quantity: 2, unit: 'servings', servings: 2, nutrition: n(680, 22, 104, 20), loggedAt: `${date}T08:00:00.000Z` },
        { id: `h${back}l`, date, time: '13:00:00', mealType: 'lunch', recipeId: 'rec_001', quantity: 1, unit: 'servings', servings: 1, nutrition: n(lunch, 30 + (back % 5) * 6, 90, 35), loggedAt: `${date}T13:00:00.000Z` },
      ];
    }),
  ...TRACKING,
];

/** Freeze the clock and seed localStorage (plus the privacy ack) before the first `goto`. */
export async function seedPlanning(page: Page, storage: Record<string, unknown>): Promise<void> {
  await page.clock.setFixedTime(PLANNING_NOW);
  await page.addInitScript((entries) => {
    localStorage.setItem('foodie:privacy-ack', 'true');
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, JSON.stringify(value));
  }, storage);
}
