import * as React from 'react';
import { LayoutTemplateIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { LazyDialog } from '../LazyDialog';
import type { PlanTemplatesProps } from './PlanTemplates';

/**
 * `PlanTemplates` behind a look-alike trigger (roadmap Issue 045): its
 * react-hook-form + Zod form is fetched on the first press of "Templates"
 * instead of with the planner page.
 */
const PlanTemplates = React.lazy(() => import('./PlanTemplates').then((m) => ({ default: m.PlanTemplates })));

export function LazyPlanTemplates(props: PlanTemplatesProps) {
  return (
    <LazyDialog
      placeholder={(open) => (
        <Button type="button" variant="outline" size="sm" data-testid="plan-templates-button" onClick={open}>
          <LayoutTemplateIcon className="size-4" aria-hidden="true" />
          {t(props.lang, 'planner.templates')}
        </Button>
      )}
    >
      <PlanTemplates {...props} defaultOpen />
    </LazyDialog>
  );
}
