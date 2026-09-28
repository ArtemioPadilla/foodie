/**
 * Shared meal plan — the payload carried in the `/plan/shared/#p=…` link
 * (roadmap Issue 040, D11; ADR 0014).
 *
 * The link is the only transport (no Firestore, no server): the plan is
 * reduced to what is needed to rebuild it — its name, default servings and,
 * per day, the recipe id + servings of each slot — serialised as compact
 * JSON, deflated (`fflate`) and base64url-encoded by
 * `lib/domain/plan-share.ts`. Anything decoded from a URL is untrusted input,
 * so this schema is strict about lengths and counts.
 *
 * Wire format v1 (JSON before compression):
 *
 *   { "v": 1, "n": <name>, "s": <servings>, "d": [<day> × 1..7] }
 *   <name> = "string" when the name reads the same in every locale, else { en, es, fr }
 *   <day>  = [<breakfast>, <lunch>, <dinner>, [<snack>, …]]
 *   <slot> = ["<recipeId>", <servings>] | null
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';

export const SHARED_PLAN_VERSION = 1;
export const SHARED_PLAN_MAX_DAYS = 7;
export const SHARED_PLAN_MAX_SNACKS = 8;
export const SHARED_PLAN_NAME_MAX = 120;

const Servings = z.number().positive().max(99);

export const SharedSlotSchema = z.tuple([z.string().trim().min(1).max(80), Servings]);
export type SharedSlot = z.infer<typeof SharedSlotSchema>;

export const SharedDaySchema = z.tuple([
  SharedSlotSchema.nullable(),
  SharedSlotSchema.nullable(),
  SharedSlotSchema.nullable(),
  z.array(SharedSlotSchema).max(SHARED_PLAN_MAX_SNACKS),
]);
export type SharedDay = z.infer<typeof SharedDaySchema>;

const SharedNameSchema = z.union([
  z.string().trim().min(1).max(SHARED_PLAN_NAME_MAX),
  MultiLangTextSchema.refine((name) => Object.values(name).every((text) => text.length <= SHARED_PLAN_NAME_MAX)),
]);

export const SharedPlanWireSchema = z.object({
  v: z.literal(SHARED_PLAN_VERSION),
  n: SharedNameSchema,
  s: Servings,
  d: z.array(SharedDaySchema).min(1).max(SHARED_PLAN_MAX_DAYS),
});
export type SharedPlanWire = z.infer<typeof SharedPlanWireSchema>;
