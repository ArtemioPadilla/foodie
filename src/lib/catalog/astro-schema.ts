/**
 * Zod 4 → Astro bridge for content collections.
 *
 * Foodie's Spec-DD schemas (`src/schemas/`) are written with the project's
 * `zod` (v4). Astro 5's `defineCollection({ schema })` is typed against the
 * Zod 3 it bundles (`astro/zod`), so handing it a v4 schema is a type error
 * even though it validates at runtime. `toAstroSchema()` wraps the v4 schema
 * in a Zod 3 `transform` that
 *
 * - runs the real v4 `safeParse` (same rules as `catalog-schema.test.ts`),
 * - forwards every issue with its path so `astro build` names the exact
 *   record/field that is wrong (US-1.1), and
 * - keeps the inferred output type, so `getCollection('recipes')[n].data`
 *   is the `Recipe` type derived with `z.infer` — no casts downstream.
 *
 * Only `src/content.config.ts` should need this; islands and lib code import
 * the v4 schemas directly.
 */
import { z as astroZod } from 'astro/zod';
import type { z } from 'zod';

export function toAstroSchema<S extends z.ZodType>(schema: S) {
  return astroZod.unknown().transform((value, ctx): z.output<S> => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: astroZod.ZodIssueCode.custom,
        path: issue.path.filter((p): p is string | number => typeof p !== 'symbol'),
        message: issue.message,
      });
    }
    return astroZod.NEVER;
  });
}
