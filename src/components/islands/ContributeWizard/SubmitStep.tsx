import * as React from 'react';
import { SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import type { RecipeSubmissionPayload } from '@/lib/domain/contribute';

/**
 * Step 7 — sending. **Hook point for roadmap Issue 039** ("envío sin
 * secretos"): this component receives the validated `RecipeSubmissionPayload`
 * (form values, the catalog `Recipe`, its id and pretty JSON) and owns the
 * sending UI. Issue 039 replaces the body below with the JSON download
 * (`download-trigger`) and the prefilled `recipe-submission.yml` issue URL
 * built with `lib/report-issue.ts`, calling `onSubmitted` once the issue tab
 * is opened (the wizard then clears the draft).
 *
 * Until then it shows the recipe JSON and explains that sending is coming.
 */
export interface SubmitStepProps {
  lang: Locale;
  payload: RecipeSubmissionPayload;
  /** Called by the sending flow once the contribution left the device (Issue 039). */
  onSubmitted: () => void;
}

export type SubmitStepComponent = React.ComponentType<SubmitStepProps>;

export function SubmitStep({ lang, payload }: SubmitStepProps) {
  return (
    <div className="grid gap-6" data-testid="contribute-step-submit" data-recipe-id={payload.recipeId}>
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.submitInfo')}</p>
      <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground" role="status" data-testid="contribute-submit-pending">
        {t(lang, 'contribute.submitPending')}
      </p>
      <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">{t(lang, 'contribute.recipeJson')}</summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-xs" data-testid="contribute-recipe-json">
          {payload.recipeJson}
        </pre>
      </details>
      <div>
        <Button type="button" disabled data-testid="contribute-submit">
          <SendIcon aria-hidden="true" />
          {t(lang, 'contribute.submitRecipe')}
        </Button>
      </div>
    </div>
  );
}
