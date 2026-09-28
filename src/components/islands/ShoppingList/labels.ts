/**
 * Display labels of the shopping list (roadmap Issue 026): ingredient names
 * from the catalog (or the custom item's own `name`), category and recipe
 * names in the page locale, unit words, and the localised export labels.
 * Pure — built once per render from the catalog; tested through the island.
 */
import { getTranslated, t, type Locale } from '@/i18n';
import { cleanIngredientId } from '@/lib/domain/ingredient-id';
import { humanizeId, unitLabel } from '@/lib/domain/recipe-detail';
import {
  getCategoryLabel,
  OTHER_CATEGORY,
  type ExportLabels,
  type ExportStrings,
} from '@/lib/domain/shopping';
import { formatQuantity } from '@/lib/domain/units';
import type { Category, Ingredient, Recipe, ShoppingListItem } from '@/schemas';

export interface ShoppingLabels {
  /** Display name of a line: custom `name` → catalog name → humanised id. */
  nameOf: (item: Pick<ShoppingListItem, 'ingredientId' | 'name'>) => string;
  /** Localised category name (`other` included). */
  categoryLabel: (categoryId: string) => string;
  /** Recipe id → localised recipe name (the id when unknown). */
  recipeLabel: (recipeId: string) => string;
  /** Unit word in the page locale (`units.*`), or the unit itself. */
  unitLabel: (unit: string) => string;
  /** Labels for `exportAsText` / `exportAsCSV` / `exportForWhatsApp`. */
  exportLabels: ExportLabels;
}

export function exportStrings(lang: Locale): ExportStrings {
  return {
    title: t(lang, 'shopping.title'),
    note: t(lang, 'shopping.exportNote'),
    usedIn: t(lang, 'shopping.usedIn'),
    totalItems: t(lang, 'shopping.exportTotal'),
    yes: t(lang, 'shopping.yes'),
    no: t(lang, 'shopping.no'),
    headers: {
      category: t(lang, 'shopping.csvCategory'),
      ingredient: t(lang, 'shopping.csvIngredient'),
      quantity: t(lang, 'shopping.csvQuantity'),
      unit: t(lang, 'shopping.csvUnit'),
      checked: t(lang, 'shopping.csvChecked'),
      usedIn: t(lang, 'shopping.csvUsedIn'),
      notes: t(lang, 'shopping.csvNotes'),
    },
  };
}

export function makeShoppingLabels(
  lang: Locale,
  catalog: { ingredients: ReadonlyArray<Ingredient>; recipes: ReadonlyArray<Recipe>; categories: ReadonlyArray<Category> },
  items: ReadonlyArray<ShoppingListItem> = [],
): ShoppingLabels {
  const ingredientNames = new Map(catalog.ingredients.map((i) => [i.id, getTranslated(i.name, lang)] as const));
  const recipeNames = new Map(catalog.recipes.map((r) => [r.id, getTranslated(r.name, lang)] as const));
  const customNames = new Map(items.filter((i) => i.name).map((i) => [i.ingredientId, i.name!] as const));

  const nameOf: ShoppingLabels['nameOf'] = (item) =>
    item.name || ingredientNames.get(item.ingredientId) || humanizeId(cleanIngredientId(item.ingredientId));
  const categoryLabel = (categoryId: string) =>
    !categoryId || categoryId === OTHER_CATEGORY ? t(lang, 'shopping.otherCategory') : getCategoryLabel(categoryId, catalog.categories, lang);
  const recipeLabel = (recipeId: string) => recipeNames.get(recipeId) ?? recipeId;
  const unit = (u: string) => unitLabel(lang, u);

  return {
    nameOf,
    categoryLabel,
    recipeLabel,
    unitLabel: unit,
    exportLabels: {
      categoryLabel,
      ingredientLabel: (id) => nameOf({ ingredientId: id, name: customNames.get(id) }),
      recipeLabel,
      unitLabel: unit,
      quantityLabel: formatQuantity,
      strings: exportStrings(lang),
    },
  };
}
