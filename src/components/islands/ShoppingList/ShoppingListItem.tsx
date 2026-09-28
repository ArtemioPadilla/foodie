import * as React from 'react';
import { StickyNoteIcon, XIcon } from 'lucide-react';
import { CategoryChip } from '@/components/domain/CategoryChip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { t, type Locale } from '@/i18n';
import type { UnitConversionResult } from '@/lib/domain/units';
import { CUSTOM_ITEM_NOTES_MAX, type ShoppingListItem } from '@/schemas';
import { cn } from '@/lib/utils';

export interface ShoppingListItemRowProps {
  lang: Locale;
  item: ShoppingListItem;
  /** Display name (catalog name in the page locale, or the custom item's name). */
  name: string;
  /** Quantity + unit in the user's unit system (`toShoppingDisplay`). */
  display: UnitConversionResult;
  /** `display.unit` in the page locale. */
  unitText: string;
  /** Recipe names the line comes from. */
  usedIn: string[];
  /** Custom (user-typed) line — gets a badge. */
  custom: boolean;
  /** Shown only in the flat (non-grouped) sorts, where the group header is gone. */
  category?: { id: string; label: string };
  onToggle: () => void;
  onRemove: () => void;
  /** New quantity, expressed in `display.unit`. */
  onQuantityChange: (quantity: number) => void;
  onNotesChange: (notes: string) => void;
}

/**
 * One shopping line (port of legacy `ShoppingListItem`, roadmap Issue 026):
 * checkbox, click-to-edit quantity (in the unit the user sees), name, "Used
 * in" recipes, click-to-edit notes (legacy left notes as a TODO; they now
 * persist through `updateShoppingNotes`) and remove. Enter/blur commits an
 * edit, Escape cancels it. `data-checked` + the `checked` class keep the
 * legacy e2e assertion (`toHaveClass(/checked/)`) meaningful.
 */
/** Move focus into an inline editor the user just opened (click-to-edit). */
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

export function ShoppingListItemRow({
  lang,
  item,
  name,
  display,
  unitText,
  usedIn,
  custom,
  category,
  onToggle,
  onRemove,
  onQuantityChange,
  onNotesChange,
}: ShoppingListItemRowProps) {
  const [editingQuantity, setEditingQuantity] = React.useState(false);
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [quantityDraft, setQuantityDraft] = React.useState('');
  const [notesDraft, setNotesDraft] = React.useState('');
  const amount = `${display.formatted} ${unitText}`;

  const startQuantity = () => {
    setQuantityDraft(String(display.quantity));
    setEditingQuantity(true);
  };
  const commitQuantity = () => {
    const value = Number(quantityDraft);
    if (quantityDraft.trim() !== '' && Number.isFinite(value) && value > 0 && value !== display.quantity) onQuantityChange(value);
    setEditingQuantity(false);
  };
  const startNotes = () => {
    setNotesDraft(item.notes ?? '');
    setEditingNotes(true);
  };
  const commitNotes = () => {
    const next = notesDraft.trim();
    if (next !== (item.notes ?? '')) onNotesChange(next);
    setEditingNotes(false);
  };

  return (
    <li
      data-testid="shopping-item"
      data-ingredient-id={item.ingredientId}
      data-unit={item.unit}
      data-checked={item.checked ? 'true' : 'false'}
      className={cn(
        'flex items-start gap-3 px-3 py-2.5 transition-colors break-inside-avoid',
        item.checked ? 'checked bg-muted/60' : 'hover:bg-muted/40',
      )}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle()}
        aria-label={t(lang, 'shopping.markItem', { name })}
        className="mt-1 size-5"
        data-testid="shopping-item-checkbox"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {editingQuantity ? (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={quantityDraft}
              onChange={(event) => setQuantityDraft(event.target.value)}
              onBlur={commitQuantity}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitQuantity();
                if (event.key === 'Escape') setEditingQuantity(false);
              }}
              aria-label={t(lang, 'shopping.quantityInputLabel', { name, unit: unitText })}
              className="h-8 w-24"
              ref={focusOnMount}
              data-testid="shopping-item-quantity-input"
            />
          ) : (
            <button
              type="button"
              onClick={startQuantity}
              className={cn(
                'rounded-sm font-semibold tabular-nums text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                item.checked && 'line-through',
              )}
              aria-label={t(lang, 'shopping.editQuantityLabel', { name, amount })}
              data-testid="shopping-item-quantity"
            >
              {amount}
            </button>
          )}
          <span className={cn('text-foreground', item.checked && 'text-muted-foreground line-through')} data-testid="shopping-item-name">
            {name}
          </span>
          {custom ? (
            <Badge variant="outline" className="text-[0.7rem]" data-testid="shopping-item-custom">
              {t(lang, 'shopping.customBadge')}
            </Badge>
          ) : null}
          {category ? <CategoryChip category={category.id} label={category.label} className="text-xs text-muted-foreground" /> : null}
        </div>

        {usedIn.length > 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground" data-testid="shopping-item-used-in">
            {t(lang, 'shopping.usedIn')}: {usedIn.join(', ')}
          </p>
        ) : null}

        {editingNotes ? (
          <Input
            type="text"
            value={notesDraft}
            maxLength={CUSTOM_ITEM_NOTES_MAX}
            placeholder={t(lang, 'shopping.addNotes')}
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={commitNotes}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitNotes();
              if (event.key === 'Escape') setEditingNotes(false);
            }}
            aria-label={t(lang, 'shopping.notesInputLabel', { name })}
            className="mt-1.5 h-8 text-sm"
            ref={focusOnMount}
            data-testid="shopping-item-notes-input"
          />
        ) : item.notes ? (
          <button
            type="button"
            onClick={startNotes}
            className="mt-1 flex items-start gap-1.5 rounded-sm text-left text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t(lang, 'shopping.editNotesLabel', { name })}
            data-testid="shopping-item-notes"
          >
            <StickyNoteIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{item.notes}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startNotes}
            className="mt-1 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
            aria-label={t(lang, 'shopping.editNotesLabel', { name })}
            data-testid="shopping-item-add-note"
          >
            + {t(lang, 'shopping.addNote')}
          </button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={t(lang, 'shopping.removeItemLabel', { name })}
        title={t(lang, 'shopping.removeItemLabel', { name })}
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive print:hidden"
        data-testid="remove-shopping-item"
      >
        <XIcon className="size-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
