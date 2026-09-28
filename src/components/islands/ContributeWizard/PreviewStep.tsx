import * as React from 'react';
import { InfoIcon } from 'lucide-react';
import { RecipeCard } from '@/components/domain/RecipeCard';
import { RecipeDetailExtras, RecipeDetailHeader } from '@/components/domain/RecipeDetailView';
import { t, type Locale } from '@/i18n';
import { buildSubmissionPreview, type RecipeSubmissionPayload, type SubmissionCatalog } from '@/lib/domain/contribute';
import type { ValidationResult } from '@/lib/domain/validation';
import RecipeDetailActions from '../RecipeDetailActions';
import { ValidationPanel } from './ValidationPanel';

export interface PreviewStepProps {
  lang: Locale;
  /** `null` while the submission does not validate (the panel says why). */
  payload: RecipeSubmissionPayload | null;
  catalog: SubmissionCatalog;
  validation: ValidationResult;
  onEdit: (step: number) => void;
}

/**
 * Step 6 — validation summary, then the recipe exactly as the site will show
 * it: the `RecipeCard` of `/recipes/` and the `/recipes/[id]/` page built from
 * the same components (`RecipeDetailHeader`, `RecipeDetailActions` in
 * `preview` mode, `RecipeDetailExtras`).
 */
export function PreviewStep({ lang, payload, catalog, validation, onEdit }: PreviewStepProps) {
  const preview = React.useMemo(
    () => (payload ? buildSubmissionPreview(payload, catalog, lang) : null),
    [payload, catalog, lang],
  );

  return (
    <div className="grid gap-8" data-testid="contribute-step-preview">
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.previewDescription')}</p>
      <ValidationPanel lang={lang} result={validation} onEdit={onEdit} />

      {preview && (
        <>
          <p className="flex gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground" data-testid="contribute-preview-notice">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {t(lang, 'contribute.previewNotice')}
              {preview.externalImageUrl && (
                <> {t(lang, 'contribute.previewImageNote', { url: preview.externalImageUrl })}</>
              )}
            </span>
          </p>

          <section aria-labelledby="contribute-preview-card-heading" className="grid gap-3">
            <h3 id="contribute-preview-card-heading" className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              {t(lang, 'contribute.previewCardTitle')}
            </h3>
            <div className="max-w-sm" data-testid="contribute-preview-card">
              <RecipeCard recipe={preview.recipe} lang={lang} showNutrition />
            </div>
          </section>

          <section aria-labelledby="contribute-preview-detail-heading" className="grid gap-3">
            <h3 id="contribute-preview-detail-heading" className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              {t(lang, 'contribute.previewDetailTitle')}
            </h3>
            <div className="rounded-xl border border-border p-4 sm:p-8" data-testid="contribute-preview-detail">
              <RecipeDetailHeader
                recipe={preview.recipe}
                lang={lang}
                cuisineNames={preview.cuisineNames}
                mealTypeName={preview.mealTypeName}
                titleAs="h2"
                viewTransition={false}
              />
              <div className="mt-10">
                <RecipeDetailActions recipe={preview.recipe} lang={lang} ingredientMeta={preview.ingredientMeta} preview />
              </div>
              <RecipeDetailExtras recipe={preview.recipe} lang={lang} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
