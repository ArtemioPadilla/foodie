/**
 * Beverage — `public/data/beverages.json`, a BARE array (no wrapper key).
 * Used by nutrition tracking's quick-add; not part of recipes.
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';
import { NutritionInfoSchema } from './nutrition';

export const BEVERAGE_CATEGORIES = [
  'water',
  'coffee',
  'tea',
  'juice',
  'soda',
  'alcohol',
  'milk',
  'other',
] as const;
export const BeverageCategorySchema = z.enum(BEVERAGE_CATEGORIES);
export type BeverageCategory = z.infer<typeof BeverageCategorySchema>;

export const BeverageSchema = z.object({
  id: z.string().min(1),
  name: MultiLangTextSchema,
  category: BeverageCategorySchema,
  nutrition: NutritionInfoSchema,
  defaultUnit: z.string().min(1),
  defaultQuantity: z.number().positive(),
  imageUrl: z.string().optional(),
  isAlcoholic: z.boolean(),
  /** mg per default quantity. */
  caffeine: z.number().nonnegative().optional(),
});
export type Beverage = z.infer<typeof BeverageSchema>;

/** The whole `beverages.json` file. */
export const BeveragesFileSchema = z.array(BeverageSchema);
