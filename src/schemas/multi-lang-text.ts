/**
 * MultiLangText — the trilingual text atom of the Foodie catalog.
 *
 * Every user-visible string in `public/data/*.json` (names, descriptions,
 * instructions, notes, tips…) is an object with the three supported locales.
 * All three are REQUIRED and non-blank: a missing `fr` is a build error, not a
 * runtime fallback (roadmap US-1.4, port of legacy `validateTranslations.js`).
 */
import { z } from 'zod';

export const LOCALES = ['en', 'es', 'fr'] as const;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

/** A string with at least one non-whitespace character. */
export const NonBlankStringSchema = z.string().regex(/\S/, 'Must not be blank');

export const MultiLangTextSchema = z.object({
  en: NonBlankStringSchema,
  es: NonBlankStringSchema,
  fr: NonBlankStringSchema,
});
export type MultiLangText = z.infer<typeof MultiLangTextSchema>;

/**
 * Same shape, but blank strings are allowed. Used for user-authored text
 * (meal-plan descriptions default to `{ en: '', es: '', fr: '' }` in legacy
 * localStorage data) — never for catalog data.
 */
export const OptionalMultiLangTextSchema = z.object({
  en: z.string(),
  es: z.string(),
  fr: z.string(),
});
