// @vitest-environment jsdom
import * as React from 'react';
import { useStore } from '@nanostores/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import type { Locale } from '@/i18n';
import { $currentPlan, $savedPlans, addRecipeToPlan, SAVED_PLANS_KEY } from '@/stores/planner';
import { makePlan } from '@/tests/fixtures/foodie-domain';
import { PlanTemplates } from './PlanTemplates';

/**
 * jsdom tests of the planner templates manager (roadmap Issue 025): save the
 * current plan under a validated name, list, load and delete
 * `savedMealPlans`, each destructive step behind an `alert-dialog`.
 */

function Harness({ lang = 'en' }: { lang?: Locale }) {
  const plan = useStore($currentPlan);
  return (
    <>
      {plan ? <PlanTemplates lang={lang} plan={plan} /> : null}
      <Toaster closeLabel={lang === 'es' ? 'Cerrar' : 'Close'} />
    </>
  );
}

const template = (id: string, name: string, withMeal = true) => {
  const plan = makePlan({ id, name: { en: name, es: name, fr: name } });
  if (withMeal) plan.days[0]!.meals.breakfast = { recipeId: 'rec_001', servings: 2 };
  return plan;
};

async function openManager() {
  await userEvent.click(screen.getByTestId('plan-templates-button'));
  return screen.findByTestId('plan-templates');
}

beforeEach(() => {
  localStorage.clear();
  $savedPlans.set([]);
  $currentPlan.set(makePlan());
});

describe('PlanTemplates', () => {
  it('shows the empty state, validates the name and saves the current plan as a template', async () => {
    addRecipeToPlan(0, 'lunch', 'rec_002', 2);
    render(<Harness />);
    const dialog = await openManager();
    expect(within(dialog).getByTestId('templates-empty')).toHaveTextContent('No templates yet');

    await userEvent.click(within(dialog).getByTestId('save-template'));
    expect(await within(dialog).findByText('Give the template a name.')).toBeInTheDocument();
    expect(within(dialog).getByTestId('template-name-input')).toHaveAttribute('aria-invalid', 'true');
    expect($savedPlans.get()).toHaveLength(0);

    await userEvent.type(within(dialog).getByLabelText('Template name'), '  Busy week  {Enter}');
    await waitFor(() => expect($savedPlans.get()).toHaveLength(1));
    const [saved] = $savedPlans.get();
    expect(saved?.name).toEqual({ en: 'Busy week', es: 'Busy week', fr: 'Busy week' });
    expect(saved?.days[0]?.meals.lunch).toEqual({ recipeId: 'rec_002', servings: 2 });
    expect(saved?.id).not.toBe('plan_fixture');
    expect(JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) ?? '[]')).toHaveLength(1);
    expect(within(dialog).getByTestId('template-name-input')).toHaveValue('');

    const item = within(dialog).getByTestId('template-item');
    expect(item).toHaveTextContent('Busy week');
    expect(item).toHaveTextContent('1 meal');
    expect(item).toHaveTextContent('7 days');
    expect(await screen.findByText('Template “Busy week” saved')).toBeInTheDocument();
  });

  it('rejects names longer than 60 characters', async () => {
    render(<Harness />);
    const dialog = await openManager();
    await userEvent.type(within(dialog).getByTestId('template-name-input'), 'x'.repeat(61));
    await userEvent.click(within(dialog).getByTestId('save-template'));
    expect(await within(dialog).findByText('Use 60 characters or fewer.')).toBeInTheDocument();
    expect($savedPlans.get()).toHaveLength(0);
  });

  it('loads a template straight away when the current plan is empty', async () => {
    $savedPlans.set([template('template_1', 'Veggie week')]);
    render(<Harness />);
    const dialog = await openManager();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Load Veggie week' }));
    expect($currentPlan.get()?.id).toBe('template_1');
    expect(screen.queryByTestId('template-confirm-dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('plan-templates')).not.toBeInTheDocument());
    expect(await screen.findByText('“Veggie week” loaded')).toBeInTheDocument();
  });

  it('asks before a template replaces a plan with meals (cancel keeps it, confirm loads)', async () => {
    addRecipeToPlan(2, 'dinner', 'rec_002', 2);
    $savedPlans.set([template('template_1', 'Veggie week')]);
    render(<Harness />);
    const dialog = await openManager();

    await userEvent.click(within(dialog).getByTestId('load-template'));
    let confirm = await screen.findByTestId('template-confirm-dialog');
    expect(confirm).toHaveTextContent('Replace the current plan?');
    expect(confirm).toHaveTextContent('“Fixture Plan” will be replaced by “Veggie week”');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('template-confirm-dialog')).not.toBeInTheDocument());
    expect($currentPlan.get()?.id).toBe('plan_fixture');

    await userEvent.click(within(dialog).getByTestId('load-template'));
    confirm = await screen.findByTestId('template-confirm-dialog');
    await userEvent.click(within(confirm).getByTestId('confirm-template-action'));
    expect($currentPlan.get()?.id).toBe('template_1');
    expect($currentPlan.get()?.days[0]?.meals.breakfast?.recipeId).toBe('rec_001');
  });

  it('deletes a template only after the alert-dialog confirmation', async () => {
    $savedPlans.set([template('template_1', 'Veggie week'), template('template_2', 'Party')]);
    render(<Harness />);
    const dialog = await openManager();
    expect(within(dialog).getAllByTestId('template-item')).toHaveLength(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Party' }));
    const confirm = await screen.findByTestId('template-confirm-dialog');
    expect(confirm).toHaveAttribute('data-kind', 'delete');
    expect(confirm).toHaveTextContent('“Party” will be removed from this device.');
    await userEvent.click(within(confirm).getByTestId('confirm-template-action'));

    expect($savedPlans.get().map((p) => p.id)).toEqual(['template_1']);
    await waitFor(() => expect(within(dialog).getAllByTestId('template-item')).toHaveLength(1));
    expect(await screen.findByText('“Party” deleted')).toBeInTheDocument();
    // Every button — the toasts' × included — has an accessible name (axe button-name).
    const unnamed = screen
      .getAllByRole('button', { hidden: true })
      .filter((button) => !button.hasAttribute('data-base-ui-focus-guard'))
      .filter((button) => !button.getAttribute('aria-label') && !button.textContent?.trim());
    expect(unnamed).toEqual([]);
  });

  it('marks the template that is the current plan and speaks the page language', async () => {
    $savedPlans.set([makePlan()]);
    render(<Harness lang="es" />);
    await userEvent.click(screen.getByRole('button', { name: 'Plantillas' }));
    const dialog = await screen.findByTestId('plan-templates');
    expect(within(dialog).getByRole('heading', { name: 'Plantillas de plan' })).toBeInTheDocument();
    expect(within(dialog).getByTestId('template-item')).toHaveTextContent('Plan actual');
    expect(within(dialog).getByRole('button', { name: 'Cargar Plan de prueba' })).toBeInTheDocument();
  });
});
