/**
 * `src/schemas/` — the Spec-DD layer.
 *
 * Every cross-boundary type lives here as a Zod schema. Forms, API
 * contracts, persisted state shapes, and worker `postMessage` payloads
 * are all defined as `z.object({ ... })` schemas with TypeScript types
 * derived via `z.infer`. See `docs/PRINCIPLES.md` §3 for the rule.
 *
 * Tests assert behavior *against* schemas (`Schema.safeParse(input).success`);
 * they never replace the schema.
 *
 * Foodie domain (roadmap Issue 010): the catalog files in `public/data/`
 * (recipe, ingredient, beverage, category) are validated at build time by the
 * content collections in `src/content.config.ts`; the persisted-state schemas
 * (meal-plan, shopping, pantry, tracking, goals, preferences) guard every
 * `localStorage` read in `src/stores/`.
 */

// ── Template forms ────────────────────────────────────────────────────────────
export { LoginSchema, type LoginValues } from './login';
export {
  ContactSchema,
  type ContactValues,
  NewsletterSchema,
  type NewsletterValues,
} from './contact';
export { FeedbackSchema, type FeedbackValues } from './feedback';

// ── Foodie domain ─────────────────────────────────────────────────────────────
export * from './multi-lang-text';
export * from './nutrition';
export * from './category';
export * from './recipe';
export * from './ingredient';
export * from './beverage';
export * from './meal-plan';
export * from './shopping';
export * from './pantry';
export * from './goals';
export * from './tracking';
export * from './preferences';
