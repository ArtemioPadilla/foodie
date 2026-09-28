import * as React from 'react';
import { CoinsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { LazyDialog } from '../LazyDialog';
import type { PriceManagementModalProps } from './PriceManagementModal';

/**
 * `PriceManagementModal` behind a look-alike trigger (roadmap Issue 045): the
 * price table (TanStack Table, Select, Editable) is fetched on the first
 * press of "Manage prices" instead of with the planner / shopping pages.
 */
const PriceManagementModal = React.lazy(() =>
  import('./PriceManagementModal').then((m) => ({ default: m.PriceManagementModal })),
);

export function LazyPriceManagementModal(props: PriceManagementModalProps) {
  return (
    <LazyDialog
      placeholder={(open) => (
        <Button type="button" variant="outline" size="sm" className={props.triggerClassName} data-testid="manage-prices-button" onClick={open}>
          <CoinsIcon className="size-4" aria-hidden="true" />
          {t(props.lang, 'prices.manage')}
        </Button>
      )}
    >
      <PriceManagementModal {...props} defaultOpen />
    </LazyDialog>
  );
}
