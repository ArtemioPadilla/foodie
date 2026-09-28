import { MapPinIcon, PencilIcon, ShoppingCartIcon, Trash2Icon } from 'lucide-react';
import { CategoryChip } from '@/components/domain/CategoryChip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import { expirationStatus, isLowStock } from '@/lib/domain/pantry';
import type { UnitConversionResult } from '@/lib/domain/units';
import { cn } from '@/lib/utils';
import type { PantryItem } from '@/schemas';
import { expirationText, locationLabel } from './labels';

export interface PantryItemRowProps {
  lang: Locale;
  item: PantryItem;
  /** Display name (catalog name in the page locale, or the custom item's name). */
  name: string;
  category: { id: string; label: string };
  /** Quantity + unit in the user's unit system. */
  display: UnitConversionResult;
  /** `display.unit` in the page locale. */
  unitText: string;
  custom: boolean;
  now: Date;
  onEdit: () => void;
  onAddToShopping: () => void;
  onRemove: () => void;
}

/**
 * One pantry item (port of legacy `pantry/PantryItem`, roadmap Issue 027):
 * name, category, status badges (expired / expiring soon / low stock / own
 * item), quantity in the user's unit system, location and the expiration line;
 * actions edit (the item dialog), add to shopping list and remove. Legacy's
 * click-to-edit quantity is folded into the edit dialog, which validates it.
 */
export function PantryItemRow({ lang, item, name, category, display, unitText, custom, now, onEdit, onAddToShopping, onRemove }: PantryItemRowProps) {
  const status = expirationStatus(item, now);
  const low = isLowStock(item);
  return (
    <li
      className={cn(
        'flex flex-col gap-3 border-l-4 border-l-transparent p-4 sm:flex-row sm:items-center',
        // A stripe, not a tint: tinted rows pushed the red "Expired on …" text under 4.5:1.
        status === 'expired' && 'border-l-destructive',
        status === 'soon' && 'border-l-[oklch(0.75_0.18_70)]',
      )}
      data-testid="pantry-item"
      data-item-id={item.id}
      data-ingredient-id={item.ingredientId}
      data-status={status}
      data-low-stock={low ? 'true' : undefined}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-foreground" data-testid="pantry-item-name">
            {name}
          </h3>
          {status === 'expired' ? (
            <Badge variant="destructive" data-testid="badge-expired">
              {t(lang, 'pantry.expired')}
            </Badge>
          ) : status === 'soon' ? (
            <Badge variant="outline" className="border-[oklch(0.75_0.18_70/0.6)]" data-testid="badge-expiring">
              {t(lang, 'pantry.expiringSoon')}
            </Badge>
          ) : null}
          {low ? (
            <Badge variant="secondary" data-testid="badge-low-stock">
              {t(lang, 'pantry.lowStock')}
            </Badge>
          ) : null}
          {custom ? (
            <Badge variant="outline" data-testid="badge-custom">
              {t(lang, 'pantry.customItem')}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground" data-testid="pantry-item-quantity">
            {display.formatted} {unitText}
          </span>
          <CategoryChip category={category.id} label={category.label} />
          {item.location ? (
            <span className="inline-flex items-center gap-1" data-testid="pantry-item-location">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {locationLabel(lang, item.location)}
            </span>
          ) : null}
        </div>
        <p
          className={cn('text-xs', status === 'expired' ? 'font-medium text-destructive' : 'text-muted-foreground')}
          data-testid="pantry-item-expiration"
        >
          {expirationText(lang, item.expirationDate, now)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={t(lang, 'pantry.editNamed', { name })} data-testid="edit-pantry-item">
          <PencilIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAddToShopping}
          aria-label={t(lang, 'pantry.addToShoppingNamed', { name })}
          data-testid="pantry-item-add-to-shopping"
        >
          <ShoppingCartIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={t(lang, 'pantry.removeNamed', { name })}
          data-testid="remove-pantry-item"
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
