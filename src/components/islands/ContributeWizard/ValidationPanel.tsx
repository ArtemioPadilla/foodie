import * as React from 'react';
import { AlertTriangleIcon, CheckCircle2Icon, PencilIcon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import {
  STEP_LABEL_KEYS,
  stepIndex,
  stepOfField,
  translateValidationError,
  validationSummaryWording,
} from '@/lib/domain/contribute';
import { getValidationSummary, type ValidationError, type ValidationResult } from '@/lib/domain/validation';
import { cn } from '@/lib/utils';

/**
 * Errors of the current step (after a blocked "Next"), announced as an alert.
 * Each line is the schema message translated, with the item prefix
 * ("Ingredient #2: …") for list fields.
 */
export function StepErrors({ lang, errors }: { lang: Locale; errors: ReadonlyArray<ValidationError> }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/5 p-4" data-testid="contribute-step-errors">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <XCircleIcon className="size-4" aria-hidden="true" />
        {t(lang, 'contribute.errorsTitle')}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-destructive">
        {errors.map((error, index) => (
          <li key={`${error.field}-${index}`} data-field={error.field}>
            {translateValidationError(lang, error)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The whole-submission check shown on the preview: `getValidationSummary`
 * (translated) plus every error and warning, each with an "Edit" link back to
 * the step that owns the field.
 */
export function ValidationPanel({
  lang,
  result,
  onEdit,
}: {
  lang: Locale;
  result: ValidationResult;
  onEdit: (step: number) => void;
}) {
  const clean = result.valid && result.warnings.length === 0;
  const Icon = !result.valid ? XCircleIcon : clean ? CheckCircle2Icon : AlertTriangleIcon;
  const items = [...result.errors, ...result.warnings];
  return (
    <section
      aria-labelledby="contribute-validation-heading"
      className={cn(
        'rounded-lg border p-4',
        !result.valid ? 'border-destructive/50 bg-destructive/5' : clean ? 'border-primary/40 bg-primary/5' : 'border-amber-500/50 bg-amber-500/5',
      )}
      data-testid="contribute-validation"
      data-valid={result.valid ? 'true' : 'false'}
    >
      <h3 id="contribute-validation-heading" className="text-sm font-medium text-muted-foreground">
        {t(lang, 'contribute.validationResults')}
      </h3>
      <p className="mt-1 flex items-center gap-2 font-semibold text-foreground" data-testid="contribute-validation-summary">
        <Icon className="size-4" aria-hidden="true" />
        {getValidationSummary(result, validationSummaryWording(lang))}
      </p>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item, index) => {
            const step = stepOfField(item.field);
            return (
              <li
                key={`${item.severity}-${item.field}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2"
                data-severity={item.severity}
              >
                <span className={item.severity === 'error' ? 'text-destructive' : 'text-foreground'}>
                  {translateValidationError(lang, item)}
                </span>
                {step && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(stepIndex(step))}>
                    <PencilIcon aria-hidden="true" />
                    {t(lang, 'contribute.editStep', { step: t(lang, STEP_LABEL_KEYS[step]) })}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
