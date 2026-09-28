import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { PlusIcon, SaveIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import { makeCustomIngredientId } from '@/lib/domain/ingredient-id';
import { resolveCatalogIngredient, type PantryNaming } from '@/lib/domain/pantry';
import { OTHER_CATEGORY } from '@/lib/domain/shopping';
import {
  PANTRY_ITEM_NAME_MAX,
  PANTRY_ITEM_QUANTITY_MAX,
  PANTRY_LOCATIONS,
  PANTRY_UNITS,
  pantryItemFormSchema,
  type Ingredient,
  type PantryItem,
  type PantryItemFormValues,
} from '@/schemas';
import { addPantryItem, updatePantryItem, type NewPantryItem } from '@/stores/pantry';
import { LOCATION_LABEL_KEYS } from './labels';

const ExpiryDatePicker = React.lazy(() => import('./ExpiryDatePicker'));

/** Base UI's Select needs a non-empty value for "no location". */
const NO_LOCATION = 'none';

const EMPTY: PantryItemFormValues = { name: '', quantity: '1', unit: 'piece', expirationDate: '', location: '', category: OTHER_CATEGORY };

export interface PantryItemDialogProps {
  lang: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The item being edited, or `null` to add a new one. */
  editing: PantryItem | null;
  ingredients: ReadonlyArray<Ingredient>;
  /** Category choices for custom items: `{ id, label }` (`other` appended when missing). */
  categories: ReadonlyArray<{ id: string; label: string }>;
  naming: PantryNaming;
  unitLabel: (unit: string) => string;
}

function valuesOf(item: PantryItem, naming: PantryNaming): PantryItemFormValues {
  const date = item.expirationDate ? (/^\d{4}-\d{2}-\d{2}/.exec(item.expirationDate)?.[0] ?? '') : '';
  const location = (PANTRY_LOCATIONS as ReadonlyArray<string>).includes(item.location ?? '') ? (item.location as PantryItemFormValues['location']) : '';
  return {
    name: naming.nameOf(item),
    quantity: String(item.quantity),
    unit: item.unit,
    expirationDate: date,
    location,
    category: naming.categoryOf(item),
  };
}

/**
 * Add / edit a pantry item (port of legacy `pantry/AddItemModal`, roadmap
 * Issue 027): `Dialog` + `Form` (react-hook-form + zod `pantryItemFormSchema`,
 * messages localised) with the ingredient name (catalog suggestions through a
 * native `<datalist>`), quantity, unit, expiration (`date-picker`, lazy) and
 * location. A name that matches a catalog ingredient in any language stores
 * that ingredient's id — and picks its unit while the unit is untouched —
 * otherwise the item is the user's own (`custom-<uuid>-<slug>`, with `name`
 * and a chosen category). Controlled by the island, which owns the trigger
 * buttons (header "Add item", each row's edit); everything stays in one root.
 */
export function PantryItemDialog({ lang, open, onOpenChange, editing, ingredients, categories, naming, unitLabel }: PantryItemDialogProps) {
  const listId = React.useId();
  const schema = React.useMemo(
    () =>
      pantryItemFormSchema({
        nameRequired: t(lang, 'pantry.ingredientRequired'),
        nameTooLong: t(lang, 'pantry.nameTooLong', { max: PANTRY_ITEM_NAME_MAX }),
        quantityInvalid: t(lang, 'pantry.quantityInvalid', { max: PANTRY_ITEM_QUANTITY_MAX }),
        unitRequired: t(lang, 'pantry.unitRequired'),
        dateInvalid: t(lang, 'pantry.dateInvalid'),
      }),
    [lang],
  );
  const form = useForm<PantryItemFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Fill the form each time the dialog opens (a new item, or the one to edit).
  React.useEffect(() => {
    if (open) form.reset(editing ? valuesOf(editing, naming) : EMPTY);
    // `naming` changes with the catalog; re-filling mid-edit would drop the user's input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const name = useWatch({ control: form.control, name: 'name' });
  const unit = useWatch({ control: form.control, name: 'unit' });
  const matched = React.useMemo(() => resolveCatalogIngredient(name ?? '', ingredients), [name, ingredients]);

  // A catalog match brings its unit, unless the user already chose one.
  React.useEffect(() => {
    if (matched && !form.getFieldState('unit').isDirty) form.setValue('unit', matched.unit);
  }, [matched, form]);

  const suggestions = React.useMemo(
    () => [...new Set(ingredients.map((i) => getTranslated(i.name, lang)))].sort((a, b) => a.localeCompare(b, lang)),
    [ingredients, lang],
  );
  const units = React.useMemo(() => [...new Set<string>([...PANTRY_UNITS, ...(matched ? [matched.unit] : []), ...(unit ? [unit] : [])])], [matched, unit]);
  const unitItems = React.useMemo(() => Object.fromEntries(units.map((u) => [u, unitLabel(u)])), [units, unitLabel]);
  const locationItems = React.useMemo(
    () => ({
      [NO_LOCATION]: t(lang, 'pantry.noLocation'),
      ...Object.fromEntries(PANTRY_LOCATIONS.map((l) => [l, t(lang, LOCATION_LABEL_KEYS[l])])),
    }),
    [lang],
  ) as Record<string, string>;
  const categoryChoices = React.useMemo(
    () => (categories.some((c) => c.id === OTHER_CATEGORY) ? categories : [...categories, { id: OTHER_CATEGORY, label: t(lang, 'pantry.otherCategory') }]),
    [categories, lang],
  );
  const categoryItems = React.useMemo(() => Object.fromEntries(categoryChoices.map((c) => [c.id, c.label])), [categoryChoices]);

  const onSubmit = (values: PantryItemFormValues) => {
    const typed = values.name.trim();
    const catalog = resolveCatalogIngredient(typed, ingredients);
    const item: NewPantryItem = { ingredientId: '', quantity: Number(values.quantity), unit: values.unit };
    if (values.expirationDate) item.expirationDate = values.expirationDate;
    if (values.location) item.location = values.location;
    if (catalog) {
      item.ingredientId = catalog.id;
    } else {
      // Keep the id of an item that stays custom under the same name (a rename mints a new one).
      const keepId = editing && !ingredients.some((i) => i.id === editing.ingredientId) && naming.nameOf(editing) === typed;
      item.ingredientId = keepId ? editing.ingredientId : makeCustomIngredientId(typed);
      item.name = typed;
      item.category = values.category || OTHER_CATEGORY;
    }
    const label = naming.nameOf(item);
    if (editing) {
      // Replace the whole record so cleared fields (date, location, custom name) really go away.
      updatePantryItem(editing.id, { name: undefined, category: undefined, expirationDate: undefined, location: undefined, ...item });
      toast({ title: t(lang, 'pantry.itemUpdated', { name: label }) });
    } else {
      addPantryItem(item);
      toast({ title: t(lang, 'pantry.itemAdded', { name: label }) });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="pantry-item-dialog" data-mode={editing ? 'edit' : 'add'}>
        <DialogHeader>
          <DialogTitle>{t(lang, editing ? 'pantry.editItem' : 'pantry.addItemModal')}</DialogTitle>
          <DialogDescription>{t(lang, editing ? 'pantry.editItemDescription' : 'pantry.addItemDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" data-testid="pantry-item-form">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(lang, 'pantry.ingredientName')}</FormLabel>
                  <FormControl>
                    <Input
                      list={listId}
                      placeholder={t(lang, 'pantry.ingredientPlaceholder')}
                      autoComplete="off"
                      maxLength={PANTRY_ITEM_NAME_MAX * 2}
                      data-testid="pantry-name-input"
                      {...field}
                    />
                  </FormControl>
                  <datalist id={listId}>
                    {suggestions.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                  <FormDescription>{t(lang, 'pantry.nameHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(lang, 'pantry.quantity')}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" min={0} step="any" data-testid="pantry-quantity-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(lang, 'pantry.unit')}</FormLabel>
                    <Select value={field.value} onValueChange={(value) => value && field.onChange(value)} items={unitItems}>
                      <FormControl>
                        <SelectTrigger className="w-full" data-testid="pantry-unit-select" onBlur={field.onBlur}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u} value={u}>
                            {unitItems[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(lang, 'pantry.expirationDateLabel')}{' '}
                    <span className="font-normal text-muted-foreground">({t(lang, 'common.optional')})</span>
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <ExpiryField lang={lang} value={field.value} onChange={field.onChange} placeholder={t(lang, 'pantry.pickDate')} />
                    </FormControl>
                    {field.value ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => field.onChange('')}
                        aria-label={t(lang, 'pantry.clearDate')}
                        title={t(lang, 'pantry.clearDate')}
                        data-testid="pantry-clear-expiry"
                      >
                        <XIcon className="size-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                  <FormDescription>{t(lang, 'pantry.expirationHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(lang, 'pantry.location')} <span className="font-normal text-muted-foreground">({t(lang, 'common.optional')})</span>
                  </FormLabel>
                  <Select
                    value={field.value || NO_LOCATION}
                    onValueChange={(value) => value && field.onChange(value === NO_LOCATION ? '' : value)}
                    items={locationItems}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full" data-testid="pantry-location-select" onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(locationItems).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {matched ? null : (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(lang, 'pantry.category')}</FormLabel>
                    <Select value={field.value || OTHER_CATEGORY} onValueChange={(value) => value && field.onChange(value)} items={categoryItems}>
                      <FormControl>
                        <SelectTrigger className="w-full" data-testid="pantry-category-select" onBlur={field.onBlur}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryChoices.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t(lang, 'pantry.categoryHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</DialogClose>
              <Button type="submit" data-testid="submit-pantry-item">
                {editing ? <SaveIcon className="size-4" aria-hidden="true" /> : <PlusIcon className="size-4" aria-hidden="true" />}
                {t(lang, editing ? 'common.save' : 'common.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ref-able wrapper so `<FormControl>` can attach its ref and a11y props
 * (id / aria-describedby / aria-invalid), which land on the date picker's
 * trigger button — the same pattern as the kit's `DateFieldControl`.
 */
const ExpiryField = React.forwardRef<
  HTMLDivElement,
  { lang: Locale; value: string; onChange: (value: string) => void; placeholder: string } & React.ComponentPropsWithoutRef<'button'>
>(({ lang, value, onChange, placeholder, ...a11y }, ref) => (
  <div ref={ref} className="min-w-0 flex-1">
    <React.Suspense fallback={<Skeleton className="h-10 w-full" />}>
      <ExpiryDatePicker lang={lang} value={value} onChange={onChange} placeholder={placeholder} triggerProps={a11y} />
    </React.Suspense>
  </div>
));
ExpiryField.displayName = 'ExpiryField';
