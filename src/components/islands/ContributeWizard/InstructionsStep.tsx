import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import type { RecipeSubmission } from '@/schemas';
import { TextField } from './fields';

/**
 * Step 4 — ordered cooking steps: add, edit, move up/down (keyboard-operable
 * buttons, the legacy reordering) and remove.
 */
export function InstructionsStep({ lang }: { lang: Locale }) {
  const { control, getValues, setValue, clearErrors } = useFormContext<RecipeSubmission>();
  const steps = useWatch({ control, name: 'instructions' }) ?? [];

  const update = (next: string[], reordered = false) => {
    // Inline errors are keyed by index: drop them when lines move, the step
    // summary and the next blur recompute them for the new order.
    if (reordered) clearErrors('instructions');
    setValue('instructions', next, { shouldDirty: true, shouldValidate: false });
  };
  const current = () => [...(getValues('instructions') ?? [])];
  const moveStep = (from: number, to: number) => {
    const list = current();
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item ?? '');
    update(list, true);
  };

  return (
    <div className="grid gap-6" data-testid="contribute-step-instructions">
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.instructionsDescription')}</p>

      {steps.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground" data-testid="contribute-no-instructions">
          {t(lang, 'contribute.noInstructionsYet')}
        </p>
      ) : (
        <ol className="grid gap-4" data-testid="contribute-instruction-list">
          {steps.map((_, index) => {
            const number = index + 1;
            return (
              <li
                // Values live in the form state, so index keys stay correct after a move.
                key={index}
                className="flex gap-3 rounded-lg border border-border bg-card p-4"
                data-testid="contribute-instruction-row"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                  aria-hidden="true"
                >
                  {number}
                </span>
                <div className="grid flex-1 gap-2">
                  <TextField
                    lang={lang}
                    name={`instructions.${index}`}
                    multiline
                    label={t(lang, 'contribute.stepNumber', { number })}
                    placeholder={t(lang, 'contribute.instructionPlaceholder')}
                    testId="contribute-instruction"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`${t(lang, 'contribute.moveStepUp')} — ${number}`}
                      data-testid="contribute-step-up"
                    >
                      <ArrowUpIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveStep(index, index + 1)}
                      disabled={index === steps.length - 1}
                      aria-label={`${t(lang, 'contribute.moveStepDown')} — ${number}`}
                      data-testid="contribute-step-down"
                    >
                      <ArrowDownIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => update(current().filter((__, i) => i !== index), true)}
                      aria-label={`${t(lang, 'contribute.removeStep')} — ${number}`}
                      data-testid="contribute-remove-step"
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Button type="button" variant="outline" onClick={() => update([...current(), ''])} data-testid="contribute-add-step">
          <PlusIcon aria-hidden="true" />
          {steps.length === 0 ? t(lang, 'contribute.addFirstStep') : t(lang, 'contribute.addStep')}
        </Button>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" aria-label={t(lang, 'contribute.instructionsTip')}>
        <li>{t(lang, 'contribute.instructionsTip1')}</li>
        <li>{t(lang, 'contribute.instructionsTip2')}</li>
        <li>{t(lang, 'contribute.instructionsTip3')}</li>
      </ul>
    </div>
  );
}
