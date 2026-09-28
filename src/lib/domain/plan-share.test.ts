import { deflateSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { MealPlan, PlanDay } from '@/schemas';
import {
  MAX_ENCODED_LENGTH,
  buildSharedPlanUrl,
  decodeSharedPlan,
  encodeSharedPlan,
  readShareFragment,
  sharePlanUrl,
  sharedMealCount,
  sharedPlanAsMealPlan,
  toSharedPlanWire,
  withoutUnknownRecipes,
} from './plan-share';

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** A full week: breakfast, lunch, dinner and one snack every day (7 × 4 meals). */
function fullWeek(id: (day: number, meal: number) => string = (d, m) => `rec_${String(d * 4 + m + 1).padStart(3, '0')}`): PlanDay[] {
  return WEEK.map((dayName, d) => ({
    dayNumber: d + 1,
    dayName,
    meals: {
      breakfast: { recipeId: id(d, 0), servings: 2 },
      lunch: { recipeId: id(d, 1), servings: 3 },
      dinner: { recipeId: id(d, 2), servings: 4 },
      snacks: [{ recipeId: id(d, 3), servings: 1 }],
    },
  }));
}

function plan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    ...sharedPlanAsMealPlan({ name: { en: 'Autumn week', es: 'Semana de otoño', fr: 'Semaine d’automne' }, servings: 2, days: fullWeek() }, 'plan_1'),
    description: { en: 'Private notes', es: '', fr: '' },
    estimatedCost: 42,
    tags: ['secret'],
    ...overrides,
  };
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodeRaw = (value: unknown) => b64url(deflateSync(strToU8(typeof value === 'string' ? value : JSON.stringify(value))));

describe('encodeSharedPlan / decodeSharedPlan', () => {
  it('round-trips name, servings and every slot (ids + servings) of a 7 × 4 plan', () => {
    const original = plan();
    const result = decodeSharedPlan(encodeSharedPlan(original));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.name).toEqual(original.name);
    expect(result.plan.servings).toBe(2);
    expect(result.plan.days).toEqual(original.days);
    expect(sharedMealCount(result.plan)).toBe(28);
  });

  it('round-trips a sparse plan: empty days, several snacks, a name that is the same in every locale', () => {
    const days: PlanDay[] = WEEK.map((dayName, d) => ({ dayNumber: d + 1, dayName, meals: {} }));
    days[2]!.meals = { dinner: { recipeId: 'weeknight-green-skillet-mg3k2x1a', servings: 1.5 } };
    days[5]!.meals = { snacks: [{ recipeId: 'rec_019', servings: 2 }, { recipeId: 'rec_035', servings: 1 }] };
    const original = plan({ name: { en: 'Mi semana', es: 'Mi semana', fr: 'Mi semana' }, servings: 3, days });
    expect(toSharedPlanWire(original).n).toBe('Mi semana');
    const result = decodeSharedPlan(encodeSharedPlan(original));
    expect(result).toEqual({ ok: true, plan: { name: original.name, servings: 3, days } });
  });

  it('carries only what a link needs (no description, cost, tags or id)', () => {
    const wire = toSharedPlanWire(plan());
    expect(Object.keys(wire).sort()).toEqual(['d', 'n', 's', 'v']);
    expect(JSON.stringify(wire)).not.toMatch(/Private notes|secret|plan_1|42/);
  });

  it('a 7-day × 4-meal plan fits in a URL under 2 KB, even with long ids and names', () => {
    const origin = 'https://artemiopadilla.github.io';
    const catalog = plan();
    const worst = plan({
      name: { en: 'x'.repeat(60), es: 'y'.repeat(60), fr: 'z'.repeat(60) },
      days: fullWeek((d, m) => `community-recipe-number-${d}-${m}-${(d * 7919 + m * 104729).toString(36)}`),
    });
    for (const lang of ['en', 'es', 'fr'] as const) {
      expect(sharePlanUrl(catalog, lang, origin).length).toBeLessThan(2048);
      expect(sharePlanUrl(worst, lang, origin).length).toBeLessThan(2048);
    }
    // A realistic catalog week stays a few hundred characters.
    expect(encodeSharedPlan(catalog).length).toBeLessThan(400);
  });

  it('is URL-fragment safe (base64url, no padding)', () => {
    expect(encodeSharedPlan(plan())).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('corrupt or foreign payloads never throw', () => {
  const valid = encodeSharedPlan(plan());

  it.each([
    ['missing', undefined, 'empty'],
    ['blank', '   ', 'empty'],
    ['not base64url', 'abc$%^&', 'corrupt'],
    ['truncated', valid.slice(0, Math.floor(valid.length / 2)), 'corrupt'],
    ['random bytes', 'SGVsbG8gd29ybGQh', 'corrupt'],
    ['impossible base64 length', 'abcde', 'corrupt'],
    ['over the size cap', 'A'.repeat(MAX_ENCODED_LENGTH + 1), 'too-long'],
    ['deflated non-JSON', encodeRaw('not json {'), 'corrupt'],
    ['JSON of the wrong shape', encodeRaw({ hello: 'world' }), 'invalid'],
    ['a future version', encodeRaw({ v: 2, n: 'x', s: 2, d: [] }), 'unsupported-version'],
    ['too many days', encodeRaw({ v: 1, n: 'x', s: 2, d: Array.from({ length: 8 }, () => [null, null, null, []]) }), 'invalid'],
    ['negative servings', encodeRaw({ v: 1, n: 'x', s: 2, d: [[['rec_001', -1], null, null, []]] }), 'invalid'],
    ['blank recipe id', encodeRaw({ v: 1, n: 'x', s: 2, d: [[['  ', 1], null, null, []]] }), 'invalid'],
    ['huge name', encodeRaw({ v: 1, n: 'x'.repeat(500), s: 2, d: [[null, null, null, []]] }), 'invalid'],
  ])('%s → %s', (_label, payload, error) => {
    expect(decodeSharedPlan(payload as string | undefined)).toEqual({ ok: false, error });
  });

  it('a flipped character is rejected or decodes to a schema-valid plan, never a crash', () => {
    for (let i = 0; i < valid.length; i += 7) {
      const flipped = valid.slice(0, i) + (valid[i] === 'A' ? 'B' : 'A') + valid.slice(i + 1);
      const result = decodeSharedPlan(flipped);
      if (result.ok) expect(result.plan.days.length).toBeGreaterThan(0);
      else expect(['corrupt', 'invalid', 'unsupported-version']).toContain(result.error);
    }
  });
});

describe('URLs and import helpers', () => {
  it('puts the payload in the fragment of the localised /plan/shared/ page', () => {
    expect(buildSharedPlanUrl('abc', 'en', 'https://example.test')).toMatch(/^https:\/\/example\.test(\/[\w-]+)?\/plan\/shared\/#p=abc$/);
    expect(buildSharedPlanUrl('abc', 'es')).toMatch(/\/es\/plan\/shared\/#p=abc$/);
    expect(buildSharedPlanUrl('abc', 'fr')).toMatch(/\/fr\/plan\/shared\/#p=abc$/);
  });

  it('readShareFragment reads #p= and ignores the rest', () => {
    expect(readShareFragment('#p=abc_-9')).toBe('abc_-9');
    expect(readShareFragment('p=xyz')).toBe('xyz');
    expect(readShareFragment('#other=1&p=q')).toBe('q');
    expect(readShareFragment('')).toBeNull();
    expect(readShareFragment('#main-content')).toBeNull();
  });

  it('withoutUnknownRecipes drops (and counts) meals the catalog does not have', () => {
    const decoded = decodeSharedPlan(encodeSharedPlan(plan()));
    if (!decoded.ok) throw new Error('fixture');
    const known = new Set(['rec_001', 'rec_002', 'rec_004']);
    const { plan: kept, dropped } = withoutUnknownRecipes(decoded.plan, (id) => known.has(id));
    expect(dropped).toBe(25);
    expect(sharedMealCount(kept)).toBe(3);
    expect(kept.days[0]!.meals).toEqual({
      breakfast: { recipeId: 'rec_001', servings: 2 },
      lunch: { recipeId: 'rec_002', servings: 3 },
      snacks: [{ recipeId: 'rec_004', servings: 1 }],
    });
    expect(kept.days[1]!.meals).toEqual({});
  });
});
