import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, PackageMinusIcon, ShoppingCartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { t, type Locale } from '@/i18n';
import { EXPIRING_SOON_DAYS } from '@/lib/domain/pantry';
import type { PantryItem } from '@/schemas';
import { expirationText } from './labels';

export interface PantryAlertsProps {
  lang: Locale;
  expiring: ReadonlyArray<PantryItem>;
  expired: ReadonlyArray<PantryItem>;
  lowStock: ReadonlyArray<PantryItem>;
  nameOf: (item: PantryItem) => string;
  quantityOf: (item: PantryItem) => string;
  now: Date;
  onAddToShopping: (item: PantryItem) => void;
}

/**
 * The pantry's attention blocks (roadmap Issue 027; port of legacy
 * `ExpirationTracker` plus a low-stock list): "Expiring soon" as a warning
 * `callout` (a success one when nothing expires in the next 7 days), expired
 * items as an error callout, and "Low stock" with a one-click "add to
 * shopping list" per item.
 */
export function PantryAlerts({ lang, expiring, expired, lowStock, nameOf, quantityOf, now, onAddToShopping }: PantryAlertsProps) {
  return (
    <section aria-labelledby="pantry-alerts-title" className="space-y-4" data-testid="pantry-alerts">
      <h2 id="pantry-alerts-title" className="sr-only">
        {t(lang, 'pantry.expirationTracker')}
      </h2>
      {expired.length > 0 ? (
        <Callout
          variant="error"
          title={`${t(lang, 'pantry.expired')} (${expired.length})`}
          icon={<AlertTriangleIcon className="size-4 text-destructive" aria-hidden="true" />}
          data-testid="pantry-expired"
        >
          <p>{t(lang, 'pantry.expiredCount', { count: expired.length })}</p>
          <ul className="mt-2 space-y-1">
            {expired.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-x-3" data-testid="expired-entry">
                <span className="font-medium text-foreground">{nameOf(item)}</span>
                <span>{expirationText(lang, item.expirationDate, now)}</span>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {expiring.length > 0 ? (
          <Callout
            variant="warning"
            title={`${t(lang, 'pantry.expiringSoon')} (${expiring.length})`}
            icon={<ClockIcon className="size-4 text-foreground" aria-hidden="true" />}
            data-testid="pantry-expiring"
            data-count={expiring.length}
          >
            <p>{t(lang, 'pantry.trackingNext', { days: EXPIRING_SOON_DAYS })}</p>
            <ul className="mt-2 space-y-1">
              {expiring.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-x-3" data-testid="expiring-entry">
                  <span className="font-medium text-foreground">{nameOf(item)}</span>
                  <span>{expirationText(lang, item.expirationDate, now)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs">{t(lang, 'pantry.expirationTip')}</p>
          </Callout>
        ) : (
          <Callout
            variant="success"
            title={t(lang, 'pantry.noExpiringItems')}
            icon={<CheckCircle2Icon className="size-4 text-foreground" aria-hidden="true" />}
            data-testid="pantry-expiring"
            data-count={0}
          >
            {t(lang, 'pantry.noExpiringDescription', { days: EXPIRING_SOON_DAYS })}
          </Callout>
        )}

        <Callout
          variant={lowStock.length > 0 ? 'warning' : 'default'}
          title={lowStock.length > 0 ? `${t(lang, 'pantry.lowStock')} (${lowStock.length})` : t(lang, 'pantry.lowStock')}
          icon={<PackageMinusIcon className="size-4 text-foreground" aria-hidden="true" />}
          data-testid="pantry-low-stock"
          data-count={lowStock.length}
        >
          {lowStock.length === 0 ? (
            <p>{t(lang, 'pantry.lowStockNone')}</p>
          ) : (
            <>
              <p>{t(lang, 'pantry.lowStockHint')}</p>
              <ul className="mt-2 space-y-1.5">
                {lowStock.map((item) => {
                  const name = nameOf(item);
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3" data-testid="low-stock-entry">
                      <span>
                        <span className="font-medium text-foreground">{name}</span> · <span className="tabular-nums">{quantityOf(item)}</span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0"
                        onClick={() => onAddToShopping(item)}
                        data-testid="low-stock-add-to-shopping"
                      >
                        <ShoppingCartIcon className="size-4" aria-hidden="true" />
                        {/* Visible text first (label-in-name), the item name for screen readers only. */}
                        <span className="sr-only sm:not-sr-only">{t(lang, 'pantry.addToShopping')}</span>
                        <span className="sr-only">: {name}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Callout>
      </div>
    </section>
  );
}
