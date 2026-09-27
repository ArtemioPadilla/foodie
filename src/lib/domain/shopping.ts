/**
 * Shopping-list arithmetic without UI or storage (roadmap Issue 013; Issue 014
 * ports the rest of `services/shoppingService` — unit normalisation, category
 * grouping, WhatsApp export — into this module).
 */
import type { MealPlan, MealSlot, Recipe, ShoppingListItem } from '@/schemas';

export type ShoppingExportFormat = 'text' | 'json' | 'csv';

/** Resolves an ingredient id to its category (Issue 014 wires the `categories` collection). */
export type CategoryResolver = (ingredientId: string) => string | undefined;

/**
 * Consolidate every recipe of `plan` into one list, scaling each recipe's
 * ingredients by `slot.servings / recipe.servings`. Quantities are summed only
 * when the unit matches; a different unit yields a separate line for the same
 * ingredient. `usedIn` holds the recipe ids (deduplicated). Sorted by category
 * (uncategorised last) like the legacy context.
 */
export function buildShoppingListFromPlan(
  plan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  categoryOf: CategoryResolver = () => undefined,
): ShoppingListItem[] {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  const lines = new Map<string, ShoppingListItem>();

  const addSlot = (slot: MealSlot | undefined) => {
    if (!slot) return;
    const recipe = recipeById.get(slot.recipeId);
    if (!recipe) return;
    const scale = slot.servings / recipe.servings;
    for (const ing of recipe.ingredients) {
      const lineKey = `${ing.ingredientId}\u0000${ing.unit}`;
      const existing = lines.get(lineKey);
      if (existing) {
        existing.quantity += ing.quantity * scale;
        if (!existing.usedIn.includes(recipe.id)) existing.usedIn.push(recipe.id);
      } else {
        lines.set(lineKey, {
          ingredientId: ing.ingredientId,
          quantity: ing.quantity * scale,
          unit: ing.unit,
          checked: false,
          usedIn: [recipe.id],
          category: categoryOf(ing.ingredientId),
          notes: '',
        });
      }
    }
  };

  for (const day of plan.days) {
    addSlot(day.meals.breakfast);
    addSlot(day.meals.lunch);
    addSlot(day.meals.dinner);
    day.meals.snacks?.forEach(addSlot);
  }

  return [...lines.values()].sort((a, b) => {
    if (!a.category && !b.category) return 0;
    if (!a.category) return 1;
    if (!b.category) return -1;
    return a.category.localeCompare(b.category);
  });
}

/** Serialise the list for copy/export (legacy `exportList`). */
export function exportShoppingList(
  list: ReadonlyArray<ShoppingListItem>,
  format: ShoppingExportFormat,
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(list, null, 2);
    case 'csv': {
      const header = 'Ingredient,Quantity,Unit,Category,Notes\n';
      const rows = list
        .map(
          (item) =>
            `${item.ingredientId},${item.quantity},${item.unit},${item.category ?? ''},"${(item.notes ?? '').replace(/"/g, '""')}"`,
        )
        .join('\n');
      return header + rows;
    }
    case 'text':
    default:
      return list
        .map((item) => `${item.checked ? '✓' : '☐'} ${item.quantity} ${item.unit} ${item.ingredientId}`)
        .join('\n');
  }
}
