import * as React from 'react';
import { useStore } from '@nanostores/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { ArrowLeftIcon, ArrowRightIcon, RotateCcwIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Stepper } from '@/components/ui/stepper';
import { t, type Locale } from '@/i18n';
import { useCatalog, type CatalogResult } from '@/lib/catalog/use-catalog';
import { STEP_LABEL_KEYS, buildSubmissionPayload, resumeStep } from '@/lib/domain/contribute';
import { issuesToErrors, validateRecipeFormData, type ValidationError } from '@/lib/domain/validation';
import { useHydrated } from '@/lib/use-hydrated';
import {
  CONTRIBUTE_STEPS,
  EMPTY_RECIPE_SUBMISSION,
  RecipeSubmissionSchema,
  SUBMISSION_STEP_SCHEMAS,
  type ContributeStep,
  type RecipeSubmission,
} from '@/schemas';
import { $contributeDraft, $hasContributeDraft, clearContributeDraft, saveContributeDraft } from '@/stores/contribute-draft';
import { BasicInfoStep } from './ContributeWizard/BasicInfoStep';
import { IngredientsStep } from './ContributeWizard/IngredientsStep';
import { InstructionsStep } from './ContributeWizard/InstructionsStep';
import { NutritionStep } from './ContributeWizard/NutritionStep';
import { PreviewStep } from './ContributeWizard/PreviewStep';
import { SubmitStep, type SubmitStepComponent } from './ContributeWizard/SubmitStep';
import { TimingsStep } from './ContributeWizard/TimingsStep';
import { StepErrors } from './ContributeWizard/ValidationPanel';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';

/**
 * ContributeWizard — the `/contribute/` island (roadmap Issue 038, D10; the
 * rewrite of legacy `components/contribute/*`, ~3k lines of `useState` forms).
 *
 * - One react-hook-form over `RecipeSubmission`, rendered with the kit `Form`
 *   and `Stepper`. The resolver validates the **current step's sub-schema**
 *   (`SUBMISSION_STEP_SCHEMAS`, picked from `RecipeSubmissionSchema`); "Next"
 *   is refused while it has errors, focusing the first one and listing them
 *   (translated) in an alert. Preview and Submit check the whole schema.
 * - Steps: basic info (EN/ES/FR name + description, cuisine, difficulty, meal
 *   type, image) → timings/servings/equipment → ingredients (catalog
 *   `Combobox` via `useCatalog`) → ordered instructions → nutrition (with an
 *   estimate from `lib/domain/nutrition`) → preview (validation summary +
 *   the public card and detail components) → submit (Issue 039 hook point:
 *   `SubmitStep` receives the `RecipeSubmissionPayload`).
 * - Every change is saved to `localStorage['foodie:contribute-draft']`
 *   (`$contributeDraft`, ADR 0002); a returning contributor resumes where
 *   they were. "Start over" discards it, and is offered whenever a draft
 *   exists (restored or typed in this visit), on any step.
 * - Store-backed UI renders after hydration only (SSR has no localStorage);
 *   `lang` is a prop; every compound component lives in this one root.
 */
export interface ContributeWizardProps {
  lang: Locale;
}

export default function ContributeWizard(props: ContributeWizardProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="ContributeWizard">
        <ContributeWizardView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export interface ContributeWizardViewProps extends ContributeWizardProps {
  /** The sending step (Issue 039 swaps in the real flow; tests may inject one). */
  SubmitStepComponent?: SubmitStepComponent;
  /** Injected clock for deterministic recipe ids in tests. */
  now?: Date;
}

export function ContributeWizardView({ lang, SubmitStepComponent = SubmitStep, now }: ContributeWizardViewProps) {
  const hydrated = useHydrated();
  const catalog = useCatalog();
  if (!hydrated) {
    return (
      <div data-testid="contribute-wizard" data-status="loading" aria-busy="true" className="grid gap-6">
        <p className="sr-only">{t(lang, 'contribute.wizardLoading')}</p>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  return <WizardForm lang={lang} catalog={catalog} SubmitStepComponent={SubmitStepComponent} now={now} />;
}

type InitialState = { values: RecipeSubmission; step: number; restored: boolean };

function readInitialState(): InitialState {
  const draft = $contributeDraft.get();
  if (!draft) return { values: structuredClone(EMPTY_RECIPE_SUBMISSION), step: 0, restored: false };
  const values = { ...structuredClone(EMPTY_RECIPE_SUBMISSION), ...draft.data } as RecipeSubmission;
  return { values, step: resumeStep(values, draft.step), restored: true };
}

/** The errors of `step`'s sub-schema for `values` (empty when it validates). */
function stepErrors(step: ContributeStep, values: unknown): ValidationError[] {
  const result = SUBMISSION_STEP_SCHEMAS[step].safeParse(values);
  return result.success ? [] : issuesToErrors(result.error.issues);
}

/** Drop empty optional strings so the JSON carries no `"preparation": ""`. */
function tidy(submission: RecipeSubmission): RecipeSubmission {
  return {
    ...submission,
    imageUrl: submission.imageUrl || undefined,
    equipment: submission.equipment?.length ? submission.equipment : undefined,
    ingredients: submission.ingredients.map(({ preparation, ...line }) =>
      preparation?.trim() ? { ...line, preparation: preparation.trim() } : line,
    ),
  };
}

interface WizardFormProps {
  lang: Locale;
  catalog: CatalogResult;
  SubmitStepComponent: SubmitStepComponent;
  now?: Date;
}

function WizardForm({ lang, catalog, SubmitStepComponent, now }: WizardFormProps) {
  const [initial, setInitial] = React.useState(readInitialState);
  const [step, setStep] = React.useState(initial.step);
  const [attempted, setAttempted] = React.useState<ReadonlySet<number>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  // "Start over" is offered whenever there is a draft to discard.
  const hasDraft = useStore($hasContributeDraft);
  const [clock] = React.useState(() => now ?? new Date());
  // The resolver reads the step when it runs; `goTo` keeps this in step with `step`.
  const stepRef = React.useRef(step);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const stepChanged = React.useRef(false);

  // Per-step validation: the resolver reads the step at call time.
  const resolver = React.useCallback<Resolver<RecipeSubmission>>((values, context, options) => {
    const schema = SUBMISSION_STEP_SCHEMAS[CONTRIBUTE_STEPS[stepRef.current] ?? 'basic'];
    const resolve = zodResolver(schema as typeof RecipeSubmissionSchema, undefined, { raw: true });
    return resolve(values, context, options) as ReturnType<Resolver<RecipeSubmission>>;
  }, []);

  const form = useForm<RecipeSubmission>({ resolver, defaultValues: initial.values, mode: 'onTouched' });
  const values = useWatch({ control: form.control }) as RecipeSubmission;

  // Persist every change (and step move) once it differs from what was loaded.
  const loaded = React.useMemo(() => JSON.stringify([initial.step, initial.values]), [initial]);
  React.useEffect(() => {
    if (JSON.stringify([step, values]) === loaded) return;
    saveContributeDraft(step, values);
  }, [values, step, loaded]);

  // Move focus to the new step's heading (not on first render).
  React.useEffect(() => {
    if (!stepChanged.current) return;
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [step]);

  const stepName: ContributeStep = CONTRIBUTE_STEPS[step] ?? 'basic';
  const labels = CONTRIBUTE_STEPS.map((name) => t(lang, STEP_LABEL_KEYS[name]));
  const currentErrors = attempted.has(step) ? stepErrors(stepName, values) : [];

  const reviewing = stepName === 'preview' || stepName === 'submit';
  const validation = React.useMemo(() => (reviewing ? validateRecipeFormData(values) : null), [reviewing, values]);
  const payload = React.useMemo(() => {
    if (!reviewing) return null;
    const parsed = RecipeSubmissionSchema.safeParse(values);
    return parsed.success ? buildSubmissionPayload(tidy(parsed.data), catalog, clock) : null;
  }, [reviewing, values, catalog, clock]);

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(0, next), CONTRIBUTE_STEPS.length - 1);
    stepChanged.current = true;
    stepRef.current = clamped;
    setStep(clamped);
  };

  const onNext = async () => {
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      setAttempted((previous) => new Set(previous).add(step));
      return;
    }
    goTo(step + 1);
  };

  const onBack = () => {
    form.clearErrors();
    goTo(step - 1);
  };

  const startOver = () => {
    clearContributeDraft();
    const fresh: InitialState = { values: structuredClone(EMPTY_RECIPE_SUBMISSION), step: 0, restored: false };
    form.reset(fresh.values);
    setInitial(fresh);
    setAttempted(new Set());
    setConfirmOpen(false);
    goTo(0);
  };

  const categories = catalog.categories;
  const submissionCatalog = React.useMemo(
    () => ({ ingredients: catalog.ingredients, categories }),
    [catalog.ingredients, categories],
  );
  const last = CONTRIBUTE_STEPS.length - 1;
  const nextBlocked = stepName === 'preview' && !payload;

  return (
    <div data-testid="contribute-wizard" data-status="ready" data-step={stepName} className="grid gap-8">
      <nav aria-label={t(lang, 'contribute.wizardProgress')} className="grid gap-2">
        <p className="text-sm text-muted-foreground" data-testid="contribute-step-counter">
          {t(lang, 'contribute.stepCounter', { current: step + 1, total: CONTRIBUTE_STEPS.length })}
        </p>
        <div className="overflow-x-auto pb-2">
          <Stepper steps={labels} current={step} className="min-w-max" data-testid="contribute-stepper" />
        </div>
      </nav>

      {initial.restored && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm" data-testid="contribute-draft-restored">
          <span className="text-foreground">{t(lang, 'contribute.draftRestored')}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} data-testid="contribute-start-over">
            <RotateCcwIcon aria-hidden="true" />
            {t(lang, 'contribute.startOver')}
          </Button>
        </div>
      )}

      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step < last && !nextBlocked) void onNext();
          }}
          className="grid gap-6 rounded-xl border border-border bg-card p-4 sm:p-8"
          aria-labelledby="contribute-step-heading"
        >
          <h2
            id="contribute-step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl font-semibold text-foreground focus:outline-none"
          >
            {labels[step]}
          </h2>

          <StepErrors lang={lang} errors={currentErrors} />

          {stepName === 'basic' && <BasicInfoStep lang={lang} categories={categories} />}
          {stepName === 'timings' && <TimingsStep lang={lang} />}
          {stepName === 'ingredients' && (
            <IngredientsStep
              lang={lang}
              ingredients={catalog.ingredients}
              catalogStatus={catalog.status}
              onRetryCatalog={catalog.refetch}
            />
          )}
          {stepName === 'instructions' && <InstructionsStep lang={lang} />}
          {stepName === 'nutrition' && <NutritionStep lang={lang} ingredients={catalog.ingredients} />}
          {stepName === 'preview' && validation && (
            <PreviewStep
              lang={lang}
              payload={payload}
              catalog={submissionCatalog}
              validation={validation}
              onEdit={(index) => goTo(index)}
            />
          )}
          {stepName === 'submit' && payload && (
            <SubmitStepComponent lang={lang} payload={payload} onSubmitted={clearContributeDraft} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={onBack} disabled={step === 0} data-testid="contribute-back">
              <ArrowLeftIcon aria-hidden="true" />
              {t(lang, 'common.back')}
            </Button>
            {step < last && (
              <Button type="submit" disabled={nextBlocked} data-testid="contribute-next">
                {t(lang, 'common.next')}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            )}
          </div>
        </form>
      </Form>

      {!initial.restored && hasDraft && (
        <div className="text-center">
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} data-testid="contribute-start-over">
            <RotateCcwIcon aria-hidden="true" />
            {t(lang, 'contribute.startOver')}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="contribute-start-over-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t(lang, 'contribute.startOverConfirm')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
            <Button type="button" variant="destructive" onClick={startOver} data-testid="confirm-start-over">
              {t(lang, 'contribute.startOver')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

