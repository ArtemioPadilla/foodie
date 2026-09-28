// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeSharedPlan, readShareFragment } from '@/lib/domain/plan-share';
import { withBase } from '@/lib/href';
import { $currentPlan, addRecipeToPlan } from '@/stores/planner';
import { makePlan } from '@/tests/fixtures/foodie-domain';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { Toaster } from '@/components/ui/toast';
import { SharePlanModal } from './SharePlanModal';

closeToastsAfterEach();

/** Planner "Share plan" dialog (roadmap Issue 040): link, copy, WhatsApp, QR. */
let fillRect: ReturnType<typeof vi.fn>;
let restoreCanvas: () => void;

beforeEach(() => {
  fillRect = vi.fn();
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => ({ fillRect, fillStyle: '' }) as unknown as CanvasRenderingContext2D);
  restoreCanvas = () => getContext.mockRestore();
  $currentPlan.set(makePlan({ name: { en: 'Autumn week', es: 'Semana de otoño', fr: 'Semaine d’automne' }, servings: 3 }));
  addRecipeToPlan(0, 'breakfast', 'rec_001', 2);
  addRecipeToPlan(4, 'snacks', 'rec_019', 1);
});
afterEach(() => {
  restoreCanvas();
  $currentPlan.set(null);
});

function renderModal(lang: 'en' | 'es' | 'fr' = 'en') {
  const user = userEvent.setup();
  render(
    <>
      <SharePlanModal lang={lang} plan={$currentPlan.get()!} />
      <Toaster />
    </>,
  );
  return user;
}

describe('SharePlanModal', () => {
  it('builds a /plan/shared/#p= link that decodes back to the plan', async () => {
    const user = renderModal('es');
    await user.click(screen.getByTestId('share-plan-button'));
    const dialog = await screen.findByTestId('share-plan-dialog');
    const input = await within(dialog).findByTestId('share-url-input');
    const url = new URL((input as HTMLInputElement).value);
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe(withBase('/es/plan/shared/'));
    expect(url.search).toBe('');
    const decoded = decodeSharedPlan(readShareFragment(url.hash));
    expect(decoded.ok && decoded.plan.name.es).toBe('Semana de otoño');
    expect(decoded.ok && decoded.plan.servings).toBe(3);
    expect(decoded.ok && decoded.plan.days[4]!.meals.snacks).toEqual([{ recipeId: 'rec_019', servings: 1 }]);
    expect(within(dialog).getByTestId('share-privacy')).toBeInTheDocument();
  });

  it('copies the link, offers WhatsApp and draws a QR code', async () => {
    const user = renderModal();
    await user.click(screen.getByTestId('share-plan-button'));
    const input = (await screen.findByTestId('share-url-input')) as HTMLInputElement;

    await user.click(screen.getByTestId('copy-link-button'));
    // user-event installs its own clipboard stub on setup().
    expect(await navigator.clipboard.readText()).toBe(input.value);
    expect(await screen.findByText('Link copied')).toBeInTheDocument();

    const whatsapp = screen.getByTestId('share-whatsapp');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    const text = new URL(whatsapp.getAttribute('href')!).searchParams.get('text');
    expect(text).toBe(`My meal plan “Autumn week” on Foodie: ${input.value}`);

    const qr = screen.getByTestId('share-qr');
    expect(qr).toHaveAttribute('role', 'img');
    await waitFor(() => expect(fillRect).toHaveBeenCalled());
    // Quiet zone + modules: a square canvas whose side is (size + 8) × 4 px.
    const side = (qr as HTMLCanvasElement).width;
    expect(side).toBe((qr as HTMLCanvasElement).height);
    expect((side / 4 - 8 - 17) % 4).toBe(0);
  });

  it('warns when the plan has no meals yet', async () => {
    $currentPlan.set(makePlan());
    const user = renderModal('fr');
    await user.click(screen.getByTestId('share-plan-button'));
    expect(await screen.findByTestId('share-empty-plan')).toHaveTextContent('Ce plan n’a pas encore de repas');
  });
});
