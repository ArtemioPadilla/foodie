/**
 * Share a meal plan by URL (roadmap Issue 040, D11; ADR 0013).
 *
 * `encodeSharedPlan(plan)` keeps the plan's name, default servings and every
 * slot's recipe id + servings (`SharedPlanWireSchema`), writes it as compact
 * JSON, deflates it with `fflate` and base64url-encodes it. The link carries
 * it in the fragment — `/plan/shared/#p=<payload>` — so it never reaches a
 * server (GitHub Pages logs, analytics) and needs no backend.
 * `decodeSharedPlan()` reverses it and never throws: a truncated, tampered or
 * foreign payload comes back as a typed error for the page to explain.
 */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { localizedRoute, type Locale } from '@/i18n';
import { withBase } from '@/lib/href';
import {
  MAIN_MEAL_SLOTS,
  SHARED_PLAN_MAX_DAYS,
  SHARED_PLAN_VERSION,
  SharedPlanWireSchema,
  type MealPlan,
  type MealSlot,
  type MultiLangText,
  type PlanDay,
  type SharedDay,
  type SharedPlanWire,
  type SharedSlot,
} from '@/schemas';

/** Fragment parameter holding the payload: `#p=…`. */
export const SHARE_FRAGMENT_PARAM = 'p';
/** Site-relative route of the shared-plan page (localised with `localizedRoute`). */
export const SHARED_PLAN_ROUTE = '/plan/shared/';
/** Longest payload `decodeSharedPlan` accepts (a full week is ~250 characters). */
export const MAX_ENCODED_LENGTH = 4096;
/** Longest JSON accepted after inflating (guards against deflate bombs). */
const MAX_JSON_LENGTH = 32 * 1024;

const WEEKDAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** A decoded shared plan: enough to render it read-only or import it. */
export type SharedPlan = {
  name: MultiLangText;
  servings: number;
  days: PlanDay[];
};

export type SharedPlanError = 'empty' | 'too-long' | 'corrupt' | 'invalid' | 'unsupported-version';
export type DecodeResult = { ok: true; plan: SharedPlan } | { ok: false; error: SharedPlanError };

// ── base64url ────────────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// ── plan ⇄ wire ─────────────────────────────────────────────────────────────

const slotToWire = (slot: MealSlot | undefined): SharedSlot | null => (slot ? [slot.recipeId, slot.servings] : null);
const slotFromWire = ([recipeId, servings]: SharedSlot): MealSlot => ({ recipeId, servings });

function nameToWire(name: MultiLangText): SharedPlanWire['n'] {
  return name.en === name.es && name.en === name.fr ? name.en : { en: name.en, es: name.es, fr: name.fr };
}

/** The part of `plan` a link carries (description, cost, tags, ids… stay home). */
export function toSharedPlanWire(plan: Pick<MealPlan, 'name' | 'servings' | 'days'>): SharedPlanWire {
  return {
    v: SHARED_PLAN_VERSION,
    n: nameToWire(plan.name),
    s: plan.servings,
    d: plan.days.slice(0, SHARED_PLAN_MAX_DAYS).map((day): SharedDay => [
      slotToWire(day.meals.breakfast),
      slotToWire(day.meals.lunch),
      slotToWire(day.meals.dinner),
      (day.meals.snacks ?? []).map((snack) => [snack.recipeId, snack.servings] as SharedSlot),
    ]),
  };
}

export function fromSharedPlanWire(wire: SharedPlanWire): SharedPlan {
  const name = typeof wire.n === 'string' ? { en: wire.n, es: wire.n, fr: wire.n } : wire.n;
  const days = wire.d.map((day, index): PlanDay => {
    const meals: PlanDay['meals'] = {};
    MAIN_MEAL_SLOTS.forEach((slot, i) => {
      const value = day[i] as SharedSlot | null;
      if (value) meals[slot] = slotFromWire(value);
    });
    if (day[3].length > 0) meals.snacks = day[3].map(slotFromWire);
    return { dayNumber: index + 1, dayName: WEEKDAY_NAMES[index] ?? 'monday', meals };
  });
  return { name, servings: wire.s, days };
}

// ── encode / decode ─────────────────────────────────────────────────────────

export function encodeSharedPlan(plan: Pick<MealPlan, 'name' | 'servings' | 'days'>): string {
  const json = JSON.stringify(toSharedPlanWire(plan));
  return toBase64Url(deflateSync(strToU8(json), { level: 9 }));
}

export function decodeSharedPlan(encoded: string | null | undefined): DecodeResult {
  const text = (encoded ?? '').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > MAX_ENCODED_LENGTH) return { ok: false, error: 'too-long' };
  const bytes = fromBase64Url(text);
  if (!bytes) return { ok: false, error: 'corrupt' };

  let data: unknown;
  try {
    const inflated = inflateSync(bytes);
    if (inflated.length === 0 || inflated.length > MAX_JSON_LENGTH) return { ok: false, error: 'corrupt' };
    data = JSON.parse(strFromU8(inflated));
  } catch {
    return { ok: false, error: 'corrupt' };
  }

  if (data && typeof data === 'object' && 'v' in data && (data as { v: unknown }).v !== SHARED_PLAN_VERSION) {
    return { ok: false, error: 'unsupported-version' };
  }
  const parsed = SharedPlanWireSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  return { ok: true, plan: fromSharedPlanWire(parsed.data) };
}

// ── URLs ────────────────────────────────────────────────────────────────────

/** `/…/plan/shared/#p=<payload>` for `lang`, absolute when `origin` is given. */
export function buildSharedPlanUrl(encoded: string, lang: Locale, origin = ''): string {
  return `${origin}${withBase(localizedRoute(SHARED_PLAN_ROUTE, lang))}#${SHARE_FRAGMENT_PARAM}=${encoded}`;
}

export function sharePlanUrl(plan: Pick<MealPlan, 'name' | 'servings' | 'days'>, lang: Locale, origin = ''): string {
  return buildSharedPlanUrl(encodeSharedPlan(plan), lang, origin);
}

/** The payload of a `location.hash` such as `#p=…` (`null` when absent). */
export function readShareFragment(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get(SHARE_FRAGMENT_PARAM);
}

// ── import ──────────────────────────────────────────────────────────────────

export function sharedMealCount(plan: Pick<SharedPlan, 'days'>): number {
  return plan.days.reduce((count, { meals }) => {
    const main = MAIN_MEAL_SLOTS.filter((slot) => meals[slot]).length;
    return count + main + (meals.snacks?.length ?? 0);
  }, 0);
}

/**
 * The shared plan's days without the meals whose recipe `isKnown` rejects
 * (ids a newer or older catalog does not have), and how many were dropped.
 */
export function withoutUnknownRecipes(
  plan: SharedPlan,
  isKnown: (recipeId: string) => boolean,
): { plan: SharedPlan; dropped: number } {
  let dropped = 0;
  const keep = (slot: MealSlot | undefined) => {
    if (!slot) return undefined;
    if (isKnown(slot.recipeId)) return slot;
    dropped += 1;
    return undefined;
  };
  const days = plan.days.map((day): PlanDay => {
    const meals: PlanDay['meals'] = {};
    for (const slot of MAIN_MEAL_SLOTS) {
      const kept = keep(day.meals[slot]);
      if (kept) meals[slot] = kept;
    }
    const snacks = (day.meals.snacks ?? []).filter((snack) => keep(snack) !== undefined);
    if (snacks.length > 0) meals.snacks = snacks;
    return { ...day, meals };
  });
  return { plan: { ...plan, days }, dropped };
}

/** A read-only `MealPlan` for components that take one (e.g. `PlanSummary`). */
export function sharedPlanAsMealPlan(plan: SharedPlan, id = 'shared-plan'): MealPlan {
  return {
    id,
    name: plan.name,
    description: { en: '', es: '', fr: '' },
    servings: plan.servings,
    dietaryRestrictions: [],
    difficulty: 'easy',
    estimatedCost: 0,
    currency: 'USD',
    days: plan.days,
    tags: [],
    isPublic: false,
  };
}
