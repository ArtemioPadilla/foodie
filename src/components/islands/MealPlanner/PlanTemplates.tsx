import * as React from 'react';
import { useStore } from '@nanostores/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { BookmarkPlusIcon, LayoutTemplateIcon, Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import {
  PLAN_TEMPLATE_NAME_MAX,
  planTemplateFormSchema,
  type MealPlan,
  type PlanTemplateFormValues,
} from '@/schemas';
import { $savedPlans, deleteSavedPlan, getMealCount, loadPlan, saveAsTemplate } from '@/stores/planner';

export interface PlanTemplatesProps {
  lang: Locale;
  /** The current plan (the one saved as a template, and replaced on load). */
  plan: MealPlan;
}

type Pending = { kind: 'load' | 'delete'; template: MealPlan } | null;

/**
 * PlanTemplates — "Templates" button + manager `Dialog` of the planner
 * toolbar (roadmap Issue 025, port of legacy `PlanTemplates`).
 *
 * - Save the current plan under a name (`Form` rhf + zod
 *   `planTemplateFormSchema`, localised messages) → `saveAsTemplate`.
 * - List `savedMealPlans` (`$savedPlans`): meals, days, servings; load
 *   (`loadPlan`) or delete (`deleteSavedPlan`).
 * - Deleting always asks through an `alert-dialog` (legacy used
 *   `window.confirm`); loading asks too when it would replace a plan that
 *   already has meals.
 *
 * Trigger, dialog and alert dialog form one composition rendered inside the
 * MealPlanner island (compound components never span islands).
 */
export function PlanTemplates({ lang, plan }: PlanTemplatesProps) {
  const templates = useStore($savedPlans);
  const [open, setOpen] = React.useState(false);
  // `pending` outlives `confirmOpen` so the alert dialog keeps its text while it animates out.
  const [pending, setPending] = React.useState<Pending>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const ask = (next: NonNullable<Pending>) => {
    setPending(next);
    setConfirmOpen(true);
  };
  const currentName = getTranslated(plan.name, lang);
  const currentMeals = getMealCount(plan);

  const schema = React.useMemo(
    () =>
      planTemplateFormSchema({
        required: t(lang, 'planner.templateNameRequired'),
        tooLong: t(lang, 'planner.templateNameTooLong', { max: PLAN_TEMPLATE_NAME_MAX }),
      }),
    [lang],
  );
  const form = useForm<PlanTemplateFormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } });

  const onSave = ({ name }: PlanTemplateFormValues) => {
    const template = saveAsTemplate(name);
    if (!template) return;
    toast({ title: t(lang, 'planner.templateSaved', { name: getTranslated(template.name, lang) }) });
    form.reset({ name: '' });
  };

  const load = (template: MealPlan) => {
    if (!loadPlan(template.id)) return;
    toast({ title: t(lang, 'planner.templateLoaded', { name: getTranslated(template.name, lang) }) });
    setOpen(false);
  };

  const requestLoad = (template: MealPlan) => {
    if (template.id !== plan.id && currentMeals > 0) ask({ kind: 'load', template });
    else load(template);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'load') load(pending.template);
    else {
      deleteSavedPlan(pending.template.id);
      toast({ title: t(lang, 'planner.templateDeleted', { name: getTranslated(pending.template.name, lang) }) });
    }
    setConfirmOpen(false);
  };

  const pendingName = pending ? getTranslated(pending.template.name, lang) : '';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset({ name: '' });
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" data-testid="plan-templates-button" />}>
        <LayoutTemplateIcon className="size-4" aria-hidden="true" />
        {t(lang, 'planner.templates')}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl grid-rows-[auto_auto_minmax(0,1fr)_auto]" data-testid="plan-templates">
        <DialogHeader>
          <DialogTitle>{t(lang, 'planner.templatesTitle')}</DialogTitle>
          <DialogDescription>{t(lang, 'planner.templatesDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSave)}
            noValidate
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-end"
            data-testid="save-template-form"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>{t(lang, 'planner.templateName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(lang, 'planner.templateNamePlaceholder')}
                      autoComplete="off"
                      data-testid="template-name-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" data-testid="save-template">
              <BookmarkPlusIcon className="size-4" aria-hidden="true" />
              {t(lang, 'planner.saveAsTemplate')}
            </Button>
          </form>
        </Form>

        <section aria-labelledby="plan-templates-list-heading" className="min-h-0 overflow-y-auto">
          <h3 id="plan-templates-list-heading" className="mb-2 text-sm font-semibold text-foreground">
            {t(lang, 'planner.savedTemplates')}
          </h3>
          {templates.length === 0 ? (
            <EmptyState
              icon={<LayoutTemplateIcon aria-hidden="true" />}
              title={t(lang, 'planner.noTemplates')}
              description={t(lang, 'planner.noTemplatesDescription')}
              data-testid="templates-empty"
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" data-testid="template-list">
              {templates.map((template) => {
                const name = getTranslated(template.name, lang);
                return (
                  <li
                    key={template.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground"
                    data-testid="template-item"
                    data-template-id={template.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium text-foreground">{name}</p>
                      {template.id === plan.id ? <Badge variant="secondary">{t(lang, 'planner.currentTemplate')}</Badge> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="outline">{t(lang, 'planner.mealCount', { count: getMealCount(template) })}</Badge>
                      <Badge variant="outline">{t(lang, 'planner.dayCount', { count: template.days.length })}</Badge>
                      <Badge variant="outline">{t(lang, 'planner.mealServings', { count: template.servings })}</Badge>
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => requestLoad(template)}
                        aria-label={t(lang, 'planner.loadTemplateLabel', { name })}
                        data-testid="load-template"
                      >
                        {t(lang, 'planner.loadTemplate')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => ask({ kind: 'delete', template })}
                        aria-label={t(lang, 'planner.deleteTemplateLabel', { name })}
                        title={t(lang, 'planner.deleteTemplateLabel', { name })}
                        data-testid="delete-template"
                      >
                        <Trash2Icon className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>{t(lang, 'common.close')}</DialogClose>
        </DialogFooter>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent data-testid="template-confirm-dialog" data-kind={pending?.kind}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(lang, pending?.kind === 'load' ? 'planner.confirmLoadTitle' : 'planner.confirmDeleteTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pending?.kind === 'load'
                  ? t(lang, 'planner.confirmLoadBody', { current: currentName, name: pendingName })
                  : t(lang, 'planner.confirmDeleteBody', { name: pendingName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
              <Button
                type="button"
                variant={pending?.kind === 'load' ? 'default' : 'destructive'}
                onClick={confirm}
                data-testid="confirm-template-action"
              >
                {pending?.kind === 'load' ? t(lang, 'planner.loadTemplate') : t(lang, 'common.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
