import * as React from 'react';
import { useStore } from '@nanostores/react';
import { PackagePlusIcon, ShoppingCartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from '@/components/ui/toast';
import { t, type Locale } from '@/i18n';
import { unitLabel } from '@/lib/domain/recipe-detail';
import { formatQuantity } from '@/lib/domain/units';
import { useHydrated } from '@/lib/use-hydrated';
import { IngredientQuickAddSchema, PANTRY_LOCATIONS, type PantryLocation } from '@/schemas';
import { $pantry, addPantryItem } from '@/stores/pantry';
import { $shopping, addShoppingItem } from '@/stores/shopping';

/**
 * IngredientActions — the one interactive island of `/ingredients/[id]/`
 * (roadmap Issue 019, D4): add the ingredient to the pantry (`$pantry`, with
 * a location) or to the shopping list (`$shopping`, merged by
 * `ingredientId`), in the catalog unit and the quantity typed here
 * (validated with `IngredientQuickAddSchema`).
 *
 * - Hydrated with `client:visible`; the server render shows the form.
 * - What the stores already hold for this ingredient is only shown after
 *   hydration, so the SSR markup and the first client render agree.
 * - The `Toaster` lives inside this React root (compound components never
 *   span islands).
 */
export interface IngredientActionsProps {
  ingredientId: string;
  /** Localised ingredient name (for toasts). */
  name: string;
  /** Catalog unit (`Ingredient.unit`). */
  unit: string;
  /** `Ingredient.category`, copied onto the shopping line for grouping. */
  category: string;
  lang: Locale;
}

const LOCATION_LABEL_KEYS: Record<PantryLocation, string> = {
  Pantry: 'pantry.pantryLocation',
  Fridge: 'pantry.fridge',
  Freezer: 'pantry.freezer',
  Cabinet: 'pantry.cabinet',
  Counter: 'pantry.counter',
};

function formatAmounts(entries: ReadonlyArray<{ quantity: number; unit: string }>, lang: Locale): string {
  const byUnit = new Map<string, number>();
  for (const entry of entries) byUnit.set(entry.unit, (byUnit.get(entry.unit) ?? 0) + entry.quantity);
  return [...byUnit].map(([unit, quantity]) => `${formatQuantity(quantity)} ${unitLabel(lang, unit)}`).join(' · ');
}

export default function IngredientActions({ ingredientId, name, unit, category, lang }: IngredientActionsProps) {
  const hydrated = useHydrated();
  const pantry = useStore($pantry);
  const shopping = useStore($shopping);
  const quantityId = React.useId();
  const locationId = React.useId();
  const errorId = React.useId();
  const [quantity, setQuantity] = React.useState('1');
  const [location, setLocation] = React.useState<PantryLocation>('Pantry');
  const [error, setError] = React.useState(false);

  const inPantry = hydrated ? pantry.filter((item) => item.ingredientId === ingredientId) : [];
  const onList = hydrated ? shopping.filter((item) => item.ingredientId === ingredientId) : [];

  const parse = () => {
    const parsed = IngredientQuickAddSchema.safeParse({ quantity: Number(quantity), location });
    setError(!parsed.success);
    return parsed.success ? parsed.data : null;
  };

  const onAddToPantry = () => {
    const data = parse();
    if (!data) return;
    addPantryItem({ ingredientId, quantity: data.quantity, unit, location: data.location });
    toast({ title: t(lang, 'ingredient.addedToPantry', { name }) });
  };

  const onAddToShopping = () => {
    const data = parse();
    if (!data) return;
    addShoppingItem({ ingredientId, quantity: data.quantity, unit, usedIn: [], category });
    toast({ title: t(lang, 'ingredient.addedToShopping', { name }) });
  };

  const locationItems = PANTRY_LOCATIONS.map((value) => ({ value, label: t(lang, LOCATION_LABEL_KEYS[value]) }));

  return (
    <section
      aria-labelledby="ingredient-actions-heading"
      className="rounded-lg border border-border bg-card p-4 sm:p-6"
      data-testid="ingredient-actions"
      data-hydrated={hydrated ? 'true' : undefined}
    >
      <h2 id="ingredient-actions-heading" className="font-display text-xl font-semibold text-foreground">
        {t(lang, 'ingredient.actionsTitle')}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor={quantityId} className="text-sm font-medium text-foreground">
            {t(lang, 'pantry.quantity')} ({unitLabel(lang, unit)})
          </label>
          <Input
            id={quantityId}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setError(false);
            }}
            aria-invalid={error || undefined}
            aria-describedby={error ? errorId : undefined}
            data-testid="ingredient-quantity"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor={locationId} className="text-sm font-medium text-foreground">
            {t(lang, 'pantry.location')}
          </label>
          <Select value={location} onValueChange={(value) => value && setLocation(value as PantryLocation)} items={locationItems}>
            <SelectTrigger id={locationId} data-testid="ingredient-location">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {t(lang, 'ingredient.invalidQuantity')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onAddToPantry} data-testid="add-to-pantry-button">
          <PackagePlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'ingredient.addToPantry')}
        </Button>
        <Button type="button" variant="outline" onClick={onAddToShopping} data-testid="add-ingredient-to-shopping-button">
          <ShoppingCartIcon className="size-4" aria-hidden="true" />
          {t(lang, 'ingredient.addToShopping')}
        </Button>
      </div>

      {(inPantry.length > 0 || onList.length > 0) && (
        <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted-foreground" data-testid="ingredient-stock">
          {inPantry.length > 0 && <li data-testid="ingredient-in-pantry">{t(lang, 'ingredient.inPantry', { amount: formatAmounts(inPantry, lang) })}</li>}
          {onList.length > 0 && <li data-testid="ingredient-on-list">{t(lang, 'ingredient.onShoppingList', { amount: formatAmounts(onList, lang) })}</li>}
        </ul>
      )}

      <Toaster closeLabel={t(lang, 'common.close')} />
    </section>
  );
}
