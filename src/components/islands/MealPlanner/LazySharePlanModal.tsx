import * as React from 'react';
import { Share2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { LazyDialog } from '../LazyDialog';
import type { SharePlanModalProps } from './SharePlanModal';

/**
 * `SharePlanModal` behind a look-alike trigger (roadmap Issue 045): the share
 * dialog (links, QR encoder) is fetched on the first press of "Share plan".
 */
const SharePlanModal = React.lazy(() => import('./SharePlanModal').then((m) => ({ default: m.SharePlanModal })));

export function LazySharePlanModal(props: SharePlanModalProps) {
  return (
    <LazyDialog
      placeholder={(open) => (
        <Button type="button" variant="outline" size="sm" data-testid="share-plan-button" onClick={open}>
          <Share2Icon className="size-4" aria-hidden="true" />
          {t(props.lang, 'planner.sharePlan')}
        </Button>
      )}
    >
      <SharePlanModal {...props} defaultOpen />
    </LazyDialog>
  );
}
