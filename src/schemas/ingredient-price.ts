/**
 * Ingredient prices (roadmap Issue 041, port of PR #28's
 * `public/data/ingredient-prices.json` + `IngredientContext` pricing).
 *
 * - `public/data/ingredient-prices.json` — the store price sheet from PR #28,
 *   re-keyed onto catalog ingredient ids (`{ "ing_005": { price, unit,
 *   currency, legacyKey } }`). A quote is the price of one *pack* (`unit` is
 *   `lb`, `25oz`, `dozen`, `gallon`, `head`…); `lib/domain/cost.ts` converts it
 *   to the ingredient's recipe unit when that is exact. Validated at build time
 *   by the `prices` content collection (ADR 0014).
 * - `localStorage['foodie:custom-prices']` — the user's own per-ingredient
 *   prices, per the ingredient's recipe unit, each with the currency it was
 *   entered in (ADR 0002 "New keys").
 */
import { z } from 'zod';

/** ISO 4217 code (`USD`, `EUR`, `MXN`…). */
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 currency code');
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/** Currencies offered in the price manager (PR #28's symbol table). */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'CAD', 'AUD', 'JPY'] as const;

/** `lb`, `head`, `25oz`, `5lb`, `20bags` — an optional pack size glued to a unit. */
export const PACK_UNIT_PATTERN = /^(\d+(?:\.\d+)?)?([a-z]+)$/;

export const IngredientPriceSchema = z.object({
  /** Catalog ingredient id (`ing_NNN`) — the key in the file. */
  id: z.string().min(1),
  /** Price of one `unit` (one pack). */
  price: z.number().positive(),
  unit: z.string().regex(PACK_UNIT_PATTERN, 'pack unit such as "lb" or "25oz"'),
  currency: CurrencyCodeSchema,
  /** The quote's key in PR #28's sheet (English slug), kept for provenance. */
  legacyKey: z.string().min(1),
});
export type IngredientPrice = z.infer<typeof IngredientPriceSchema>;

/** The whole file: `{ [ingredientId]: quote-without-id }`. */
export const IngredientPricesFileSchema = z.record(z.string().min(1), IngredientPriceSchema.omit({ id: true }));
export type IngredientPricesFile = z.infer<typeof IngredientPricesFileSchema>;

/** `IngredientPricesFile` → `IngredientPrice[]` (the file key becomes `id`). */
export function pricesFromFile(file: IngredientPricesFile): IngredientPrice[] {
  return Object.entries(file).map(([id, quote]) => ({ id, ...quote }));
}

/** One user override: price per the ingredient's recipe unit, in `currency`. */
export const CustomPriceSchema = z.object({
  price: z.number().positive().finite(),
  currency: CurrencyCodeSchema,
});
export type CustomPrice = z.infer<typeof CustomPriceSchema>;

/** `localStorage['foodie:custom-prices']`. */
export const CustomPricesSchema = z.record(z.string().min(1), CustomPriceSchema);
export type CustomPrices = z.infer<typeof CustomPricesSchema>;
