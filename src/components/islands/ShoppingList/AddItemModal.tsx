import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { t, type Locale } from '@/i18n';
import { OTHER_CATEGORY } from '@/lib/domain/shopping';
import {
  CUSTOM_ITEM_NAME_MAX,
  CUSTOM_ITEM_NOTES_MAX,
  CUSTOM_ITEM_QUANTITY_MAX,
  customShoppingItemSchema,
  SHOPPING_UNITS,
  type CustomShoppingItemFormValues,
} from '@/schemas';
import { addCustomShoppingItem } from '@/stores/shopping';

export interface AddItemModalProps {
  lang: Locale;
  /** Category choices: `{ id, label }` in display order (`other` is appended when missing). */
  categories: ReadonlyArray<{ id: string; label: string }>;
  unitLabel: (unit: string) => string;
  disabled?: boolean;
}

const DEFAULTS: CustomShoppingItemFormValues = { name: '', quantity: '1', unit: 'piece', category: OTHER_CATEGORY, notes: '' };

/**
 * "Add item" — the custom-item dialog of the shopping list (roadmap Issue
 * 026, port of PR #28's `AddItemModal`): `Dialog` + `Form` (react-hook-form +
 * zod `customShoppingItemSchema`, messages localised) with name, quantity,
 * unit, category and optional notes. The line gets a `custom-<uuid>-<slug>`
 * id (`addCustomShoppingItem`), so two items with the same name never merge.
 * Trigger, dialog and form live in the ShoppingList island (one React root).
 */
export function AddItemModal({ lang, categories, unitLabel, disabled }: AddItemModalProps) {
  const [open, setOpen] = React.useState(false);
  const schema = React.useMemo(
    () =>
      customShoppingItemSchema({
        nameRequired: t(lang, 'shopping.itemNameRequired'),
        nameTooLong: t(lang, 'shopping.itemNameTooLong', { max: CUSTOM_ITEM_NAME_MAX }),
        quantityInvalid: t(lang, 'shopping.quantityInvalid', { max: CUSTOM_ITEM_QUANTITY_MAX }),
        notesTooLong: t(lang, 'shopping.notesTooLong', { max: CUSTOM_ITEM_NOTES_MAX }),
        categoryRequired: t(lang, 'shopping.categoryRequired'),
      }),
    [lang],
  );
  const form = useForm<CustomShoppingItemFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const categoryChoices = React.useMemo(
    () =>
      categories.some((c) => c.id === OTHER_CATEGORY)
        ? categories
        : [...categories, { id: OTHER_CATEGORY, label: t(lang, 'shopping.otherCategory') }],
    [categories, lang],
  );
  const categoryItems = React.useMemo(() => Object.fromEntries(categoryChoices.map((c) => [c.id, c.label])), [categoryChoices]);
  const unitItems = React.useMemo(() => Object.fromEntries(SHOPPING_UNITS.map((u) => [u, unitLabel(u)])), [unitLabel]);

  const onSubmit = (values: CustomShoppingItemFormValues) => {
    const item = addCustomShoppingItem({
      name: values.name,
      quantity: Number(values.quantity),
      unit: values.unit,
      category: values.category,
      notes: values.notes,
    });
    toast({ title: t(lang, 'shopping.itemAdded', { name: item.name ?? values.name }) });
    form.reset(DEFAULTS);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(DEFAULTS);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} data-testid="add-item-button" />}>
        <PlusIcon className="size-4" aria-hidden="true" />
        {t(lang, 'shopping.addItem')}
      </DialogTrigger>
      <DialogContent className="max-w-lg" data-testid="add-item-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'shopping.addCustomItem')}</DialogTitle>
          <DialogDescription>{t(lang, 'shopping.addCustomItemDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" data-testid="add-item-form">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(lang, 'shopping.itemName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(lang, 'shopping.itemNamePlaceholder')}
                      autoComplete="off"
                      maxLength={CUSTOM_ITEM_NAME_MAX * 2}
                      data-testid="item-name-input"
                      {...field}
                    />
                  </FormControl>
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
                    <FormLabel>{t(lang, 'shopping.quantity')}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" min={0} step="any" data-testid="item-quantity-input" {...field} />
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
                    <FormLabel>{t(lang, 'shopping.unit')}</FormLabel>
                    <Select value={field.value} onValueChange={(value) => value && field.onChange(value)} items={unitItems}>
                      <FormControl>
                        <SelectTrigger className="w-full" data-testid="item-unit-select" onBlur={field.onBlur}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SHOPPING_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unitItems[unit]}
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(lang, 'shopping.category')}</FormLabel>
                  <Select value={field.value} onValueChange={(value) => value && field.onChange(value)} items={categoryItems}>
                    <FormControl>
                      <SelectTrigger className="w-full" data-testid="item-category-select" onBlur={field.onBlur}>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(lang, 'shopping.notes')} <span className="font-normal text-muted-foreground">({t(lang, 'common.optional')})</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t(lang, 'shopping.notesPlaceholder')} data-testid="item-notes-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</DialogClose>
              <Button type="submit" data-testid="submit-add-item">
                <PlusIcon className="size-4" aria-hidden="true" />
                {t(lang, 'common.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
