// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { DEFAULT_GOALS, GOAL_FIELDS, type NutritionGoals } from '@/schemas';
import { $goals, GOALS_KEY } from '@/stores/goals';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { GoalsFormView } from './GoalsForm';

closeToastsAfterEach();

/**
 * jsdom tests of the `/tracking/goals/` island (roadmap Issue 032) — the port
 * of legacy `tests/integration/GoalsPage.test.tsx` (19 tests, same describe
 * blocks and names) plus the new behaviours: range validation with inline
 * errors, presets, the donut macro preview, localisation and store sync.
 *
 * Deliberate adaptations of the legacy assertions:
 * - Legacy `<input type="number">` (role `spinbutton`) → the kit
 *   `number-field`, a text input with `inputmode="numeric"` (role `textbox`)
 *   whose value is locale-formatted ("2,000"); `numberValue()` parses it.
 * - Legacy "at least 5" counts → exactly the 8 goals the form edits.
 * - Legacy "buttons ≥ 2" → the named Save / Reset buttons.
 */

vi.setConfig({ testTimeout: 20_000 });

function renderGoals(lang: 'en' | 'es' | 'fr' = 'en') {
  return render(<GoalsFormView lang={lang} />);
}
async function ready() {
  await waitFor(() => expect(screen.getByTestId('goals-form')).toHaveAttribute('data-hydrated', 'true'));
}
const inputs = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const sliders = () => screen.getAllByRole('slider') as HTMLInputElement[];
const numberValue = (el: HTMLInputElement) => Number(el.value.replace(/[^\d.-]/g, ''));
const stored = () => JSON.parse(localStorage.getItem(GOALS_KEY) ?? 'null') as NutritionGoals | null;
const saveButton = () => screen.getByRole('button', { name: 'Save Goals' });
const resetButton = () => screen.getByRole('button', { name: 'Reset to Defaults' });

beforeEach(() => {
  localStorage.clear();
  $goals.set(DEFAULT_GOALS);
  localStorage.clear();
});

describe('GoalsForm (port of GoalsPage integration tests)', () => {
  describe('page rendering', () => {
    it('renders the goals page', async () => {
      renderGoals();
      await ready();
      expect(inputs().length).toBeGreaterThan(0);
      expect(screen.getByRole('heading', { name: 'Daily goals' })).toBeInTheDocument();
    });

    it('displays all goal input fields', async () => {
      renderGoals();
      await ready();
      expect(inputs()).toHaveLength(GOAL_FIELDS.length);
      for (const name of ['Calories', 'Protein', 'Carbohydrates', 'Fat', 'Fiber', 'Sugar', 'Sodium', 'Water']) {
        expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
      }
    });

    it('displays save and reset buttons', async () => {
      renderGoals();
      await ready();
      expect(saveButton()).toHaveAttribute('type', 'submit');
      expect(resetButton()).toHaveAttribute('type', 'button');
    });
  });

  describe('default goals', () => {
    it('displays default goal values', async () => {
      renderGoals();
      await ready();
      expect(numberValue(inputs()[0]!)).toBe(2000);
      expect(inputs().map(numberValue)).toEqual(GOAL_FIELDS.map((f) => DEFAULT_GOALS[f]));
    });

    it('can display custom goals', async () => {
      $goals.set({ calories: 1800, protein: 120, carbs: 180, fat: 60, fiber: 30, water: 3000 });
      renderGoals();
      await ready();
      expect(numberValue(screen.getByRole('textbox', { name: 'Calories' }) as HTMLInputElement)).toBe(1800);
      expect(numberValue(screen.getByRole('textbox', { name: 'Protein' }) as HTMLInputElement)).toBe(120);
      expect(numberValue(screen.getByRole('textbox', { name: 'Water' }) as HTMLInputElement)).toBe(3000);
      // Optional goals missing from storage fall back to the defaults.
      expect(numberValue(screen.getByRole('textbox', { name: 'Sodium' }) as HTMLInputElement)).toBe(DEFAULT_GOALS.sodium);
    });
  });

  describe('editing goals', () => {
    it('number inputs are editable', async () => {
      renderGoals();
      await ready();
      for (const input of inputs()) expect(input).not.toBeDisabled();
      const user = userEvent.setup();
      const fiber = screen.getByRole('textbox', { name: 'Fiber' }) as HTMLInputElement;
      await user.clear(fiber);
      await user.type(fiber, '32');
      expect(numberValue(fiber)).toBe(32);
    });

    it('goals can be focused for editing', async () => {
      renderGoals();
      await ready();
      inputs()[0]!.focus();
      expect(inputs()[0]).toHaveFocus();
      const user = userEvent.setup();
      await user.tab();
      // The stepper buttons are pointer-only (arrow keys step the input), so
      // the next stop is the same goal's slider.
      expect(screen.getByRole('slider', { name: 'Calories (kcal)' })).toHaveFocus();
    });

    it('all goal inputs are accessible', async () => {
      renderGoals();
      await ready();
      for (const input of inputs()) {
        // Label via htmlFor/id, range hint via aria-describedby.
        expect(input).toHaveAccessibleName();
        expect(input).toHaveAccessibleDescription(/per day/);
        expect(input).toHaveAttribute('aria-invalid', 'false');
      }
      expect(screen.getByRole('textbox', { name: 'Calories' })).toHaveAccessibleDescription('800–6,000 kcal per day');
    });

    it('has range sliders for each goal', async () => {
      renderGoals();
      await ready();
      expect(sliders()).toHaveLength(GOAL_FIELDS.length);
      expect(screen.getByRole('slider', { name: 'Calories (kcal)' })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Water (ml)' })).toBeInTheDocument();
    });

    it('sliders sync with number inputs', async () => {
      renderGoals();
      await ready();
      const calorieInput = screen.getByRole('textbox', { name: 'Calories' }) as HTMLInputElement;
      const calorieSlider = screen.getByRole('slider', { name: 'Calories (kcal)' }) as HTMLInputElement;
      expect(numberValue(calorieInput)).toBe(Number(calorieSlider.value));

      // input → slider
      const user = userEvent.setup();
      await user.clear(calorieInput);
      await user.type(calorieInput, '2500');
      await waitFor(() => expect(calorieSlider.value).toBe('2500'));

      // slider → input (once focus has left the number input)
      await user.tab();
      fireEvent.change(calorieSlider, { target: { value: '1800' } });
      await waitFor(() => expect(numberValue(calorieInput)).toBe(1800));
    });
  });

  describe('saving goals', () => {
    it('has save button', async () => {
      renderGoals();
      await ready();
      expect(saveButton()).toBeEnabled();
    });

    it('page renders with interactive controls', async () => {
      renderGoals();
      await ready();
      expect(inputs().length).toBeGreaterThan(0);
      expect(sliders().length).toBeGreaterThan(0);
      // Three presets + reset + save, plus the steppers' −/+ buttons.
      expect(screen.getAllByRole('button', { name: /Maintenance|Deficit|Surplus/ })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: 'Increase' })).toHaveLength(GOAL_FIELDS.length);
    });

    it('provides UI for setting nutrition goals', async () => {
      renderGoals();
      await ready();
      const user = userEvent.setup();
      const protein = screen.getByRole('textbox', { name: 'Protein' });
      await user.clear(protein);
      await user.type(protein, '95');
      await user.tab();
      expect(screen.getByTestId('goals-status')).toHaveTextContent('You have unsaved changes.');
      // Nothing is persisted before saving.
      expect($goals.get().protein).toBe(DEFAULT_GOALS.protein);

      await user.click(saveButton());
      await waitFor(() => expect($goals.get().protein).toBe(95));
      expect(stored()).toMatchObject({ protein: 95, calories: 2000 });
      expect(await screen.findByText('Goals saved successfully')).toBeInTheDocument();
      expect(screen.getByTestId('goals-status')).toHaveTextContent('');
    });
  });

  describe('resetting goals', () => {
    it('has reset button available', async () => {
      renderGoals();
      await ready();
      expect(resetButton()).toBeEnabled();
    });

    it('provides reset functionality', async () => {
      $goals.set({ ...DEFAULT_GOALS, calories: 3100, protein: 160 });
      renderGoals();
      await ready();
      expect(numberValue(inputs()[0]!)).toBe(3100);
      const user = userEvent.setup();
      await user.click(resetButton());
      await waitFor(() => expect(numberValue(inputs()[0]!)).toBe(2000));
      expect($goals.get()).toEqual(DEFAULT_GOALS);
      expect(stored()).toEqual(DEFAULT_GOALS);
      expect(await screen.findByText('Goals reset to defaults')).toBeInTheDocument();
    });
  });

  describe('goal validation', () => {
    it('number inputs accept numeric values', async () => {
      renderGoals();
      await ready();
      for (const input of inputs()) expect(input).toHaveAttribute('inputmode', 'numeric');
      const user = userEvent.setup();
      const fat = screen.getByRole('textbox', { name: 'Fat' }) as HTMLInputElement;
      await user.clear(fat);
      await user.type(fat, 'abc');
      await user.tab();
      // Non-numeric text never reaches the form value.
      expect(fat.value.replace(/\D/g, '')).toBe('');
      expect(await screen.findByText('Enter a value between 10 and 300 g.')).toBeInTheDocument();
    });

    it('inputs have valid numeric values', async () => {
      renderGoals();
      await ready();
      for (const input of inputs()) {
        const value = numberValue(input);
        expect(Number.isNaN(value)).toBe(false);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('responsive behavior', () => {
    it('renders successfully', async () => {
      // SSR (and the hydration render) show the skeleton, never store data.
      const html = renderToString(<GoalsFormView lang="en" />);
      expect(html).toContain('data-status="loading"');
      expect(html).toContain('Loading your goals…');
      renderGoals();
      await ready();
      expect(screen.getByTestId('goals-form')).toHaveAttribute('data-status', 'ready');
    });

    it('provides complete nutrition goal interface', async () => {
      renderGoals();
      await ready();
      expect(inputs()).toHaveLength(8);
      expect(sliders()).toHaveLength(8);
      expect(saveButton()).toBeInTheDocument();
      expect(resetButton()).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Macro split' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to the diary' })).toHaveAttribute('href', withBase('/tracking/'));
    });
  });
});

describe('GoalsForm — range validation (roadmap #032)', () => {
  it('shows an inline error for an out-of-range value and refuses to save', async () => {
    renderGoals();
    await ready();
    const user = userEvent.setup();
    const calories = screen.getByRole('textbox', { name: 'Calories' });
    await user.clear(calories);
    await user.type(calories, '9000');
    await user.tab();
    const message = await screen.findByText('Enter a value between 800 and 6,000 kcal.');
    expect(calories).toHaveAttribute('aria-invalid', 'true');
    expect(calories.getAttribute('aria-describedby')).toContain(message.id);

    await user.click(saveButton());
    expect(screen.getByTestId('goals-status')).toHaveTextContent('Some values are out of range. Fix them to save.');
    expect($goals.get().calories).toBe(2000);
    expect(stored()).toBeNull();
  });

  it('an emptied field is an error too, and fixing it clears the message', async () => {
    renderGoals();
    await ready();
    const user = userEvent.setup();
    const water = screen.getByRole('textbox', { name: 'Water' });
    await user.clear(water);
    await user.tab();
    expect(await screen.findByText('Enter a value between 500 and 6,000 ml.')).toBeInTheDocument();
    await user.type(water, '2500');
    await user.tab();
    await waitFor(() => expect(screen.queryByText('Enter a value between 500 and 6,000 ml.')).not.toBeInTheDocument());
    expect(water).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('GoalsForm — presets (roadmap #032)', () => {
  it('a preset fills every field without saving until "Save Goals"', async () => {
    renderGoals();
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Deficit/ }));
    await waitFor(() => expect(numberValue(screen.getByRole('textbox', { name: 'Calories' }) as HTMLInputElement)).toBe(1500));
    expect(numberValue(screen.getByRole('textbox', { name: 'Protein' }) as HTMLInputElement)).toBe(110);
    expect(screen.getByTestId('goals-status')).toHaveTextContent('“Deficit” applied — review the values and save.');
    expect($goals.get().calories).toBe(2000);

    await user.click(saveButton());
    await waitFor(() => expect($goals.get()).toMatchObject({ calories: 1500, protein: 110, carbs: 150, fat: 50 }));
  });

  it('presets advertise their calorie target', async () => {
    renderGoals();
    await ready();
    expect(screen.getByRole('button', { name: /Maintenance.*2,000 kcal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Surplus.*2,300 kcal/ })).toBeInTheDocument();
  });
});

describe('GoalsForm — macro split preview (roadmap #032)', () => {
  it('renders the kit donut with a text legend that follows the form', async () => {
    renderGoals();
    await ready();
    const preview = screen.getByTestId('goals-macros');
    expect(within(preview).getByRole('img', { name: 'Macro split: Protein 11%, Carbohydrates 55%, Fat 34%' })).toBeInTheDocument();
    const legend = within(preview).getByTestId('goals-macro-legend');
    expect(within(legend).getByText('250 g · 1,000 kcal · 55%')).toBeInTheDocument();

    const user = userEvent.setup();
    const carbs = screen.getByRole('textbox', { name: 'Carbohydrates' });
    await user.clear(carbs);
    await user.type(carbs, '100');
    await waitFor(() =>
      expect(within(preview).getByRole('img')).toHaveAccessibleName('Macro split: Protein 16%, Carbohydrates 33%, Fat 51%'),
    );
    // 200 + 400 + 630 = 1230 kcal, more than 10 % away from the 2000 kcal goal.
    expect(preview).toHaveTextContent('Macros add up to 1,230 kcal a day. That is 770 kcal away from your calorie goal of 2,000 kcal.');
  });

  it('shows a hint instead of the chart when there are no macros', async () => {
    renderGoals();
    await ready();
    const user = userEvent.setup();
    for (const name of ['Protein', 'Carbohydrates', 'Fat']) await user.clear(screen.getByRole('textbox', { name }));
    expect(await screen.findByText('Enter protein, carbs and fat to see the split.')).toBeInTheDocument();
    expect(within(screen.getByTestId('goals-macros')).queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('GoalsForm — localisation and store sync (roadmap #032)', () => {
  it('renders labels, hints and errors in the page locale', async () => {
    renderGoals('es');
    await ready();
    expect(screen.getByRole('button', { name: 'Guardar Objetivos' })).toBeInTheDocument();
    const user = userEvent.setup();
    const protein = screen.getByRole('textbox', { name: 'Proteína' });
    expect(protein).toHaveAccessibleDescription('10–400 g por día');
    await user.clear(protein);
    await user.type(protein, '999');
    await user.tab();
    expect(await screen.findByText('Introduce un valor entre 10 y 400 g.')).toBeInTheDocument();
  });

  it('follows goals changed elsewhere (another tab) while the form is pristine', async () => {
    renderGoals();
    await ready();
    act(() => $goals.set({ ...DEFAULT_GOALS, calories: 2750 }));
    await waitFor(() => expect(numberValue(inputs()[0]!)).toBe(2750));
  });
});
