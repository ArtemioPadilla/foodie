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

/** Freeze the clock and seed localStorage (plus the privacy ack) before the first `goto`. */
export async function seedPlanning(page: Page, storage: Record<string, unknown>): Promise<void> {
  await page.clock.setFixedTime(PLANNING_NOW);
  await page.addInitScript((entries) => {
    localStorage.setItem('foodie:privacy-ack', 'true');
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, JSON.stringify(value));
  }, storage);
}
