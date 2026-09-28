// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, type MealPlan } from '@/schemas';
import { $currentPlan } from '@/stores/planner';
import { resetPreferences, setCurrency, setUnitSystem } from '@/stores/preferences';
import { resetAllCustomPrices, setCustomPrice } from '@/stores/prices';
import { $shopping, SHOPPING_KEY } from '@/stores/shopping';
import { makeIngredient, makePlan, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { ShoppingListView } from './ShoppingList';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';

closeToastsAfterEach();

/**
 * jsdom tests of the `/shopping/` island (roadmap Issue 026): hydration
 * parity, generate from the plan (consolidated, grouped, in the user's unit
 * system), check / quantity / notes / remove, the confirmed destructive
 * actions, search / hide checked / sort, the custom-item form and the
 * exports — all through `$shopping`.
 *
 * Also the jsdom port of legacy `tests/e2e/shopping-list.spec.ts`'s three live
 * assertions (page heading lives in the Astro page; "checks off items" and
 * "groups items by category" are covered here and in the e2e journeys).
 */

const eggs = makeRecipe(); // rec_001, 2 servings: 4 piece ing_001 + 30 ml ing_002
const oil = makeIngredient({ id: 'ing_002', name: { en: 'Olive Oil', es: 'Aceite de Oliva', fr: "Huile d'Olive" }, category: 'pantry', unit: 'ml' });

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs] },
  [CATALOG_FILES.ingredients]: { ingredients: [makeIngredient({ id: 'ing_001' }), oil] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: CategoriesFileSchema.parse({
    mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
    cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
    dietaryTags: [{ id: 'vegetarian', name: { en: 'Vegetarian', es: 'Vegetariano', fr: 'Végétarien' } }],
    ingredientCategories: mockIngredientCategories,
  }),
  // Store price sheet (Issue 041): olive oil at $5 a litre → $0.005 per ml.
  [CATALOG_FILES.prices]: { ing_002: { price: 5, unit: 'l', currency: 'USD', legacyKey: 'olive_oil' } },
};

function installFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const path = String(input).replace(withBase('/'), '/');
      const ok = path in payloads;
      return { ok, status: ok ? 200 : 404, statusText: ok ? 'OK' : 'Not Found', json: async () => payloads[path] } as unknown as Response;
    }),
  );
}

function renderList(lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <ShoppingListView lang={lang} />
    </QueryClientProvider>,
  );
}

function planWithEggs(): MealPlan {
  const plan = makePlan();
  plan.days[0]!.meals.breakfast = { recipeId: 'rec_001', servings: 2 };
  return plan;
}

const rows = () => screen.queryAllByTestId('shopping-item');
const row = (name: string) => rows().find((r) => within(r).getByTestId('shopping-item-name').textContent === name)!;
const list = () => $shopping.get();

async function generate() {
  const button = await screen.findByTestId('generate-from-plan');
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  await waitFor(() => expect(rows().length).toBeGreaterThan(0));
}

beforeEach(() => {
  localStorage.clear();
  $shopping.set([]);
  $currentPlan.set(null);
  resetPreferences();
  resetAllCustomPrices();
  setUnitSystem('metric');
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ShoppingList — hydration and empty states', () => {
  it('server-renders a skeleton (no localStorage read), then hydrates', () => {
    $shopping.set([{ ingredientId: 'ing_001', quantity: 1, unit: 'piece', checked: false, usedIn: [] }]);
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <ShoppingListView lang="en" />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).not.toContain('shopping-item');
  });

  it('empty list without a plan: generate is disabled and the hint links the localised planner', async () => {
    renderList('es');
    await waitFor(() => expect(screen.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty'));
    expect(screen.getByTestId('generate-from-plan')).toBeDisabled();
    expect(screen.getByTestId('export-menu')).toBeDisabled();
    const hint = screen.getByTestId('generate-hint');
    expect(hint).toHaveTextContent('Tu plan de comidas aún no tiene comidas');
    expect(within(hint).getByRole('link')).toHaveAttribute('href', withBase('/es/planner/'));
    expect(screen.getByTestId('shopping-empty')).toHaveTextContent('Lista de Compras Vacía');
  });
});

describe('ShoppingList — generate, group, check (legacy shopping-list.spec assertions)', () => {
  it('generates from the plan, grouped by category with localised names and metric units', async () => {
    $currentPlan.set(planWithEggs());
    renderList();
    await generate();

    expect(screen.getByTestId('shopping-list')).toHaveAttribute('data-status', 'ready');
    const groups = screen.getAllByTestId('category-group');
    expect(groups.map((g) => g.getAttribute('data-category'))).toEqual(['protein', 'pantry']);
    expect(groups[0]).toHaveTextContent('Proteins');
    expect(groups[1]).toHaveTextContent('Pantry');
    expect(within(row('Chicken Breast')).getByTestId('shopping-item-quantity')).toHaveTextContent('4 piece');
    // 30 ml was consolidated to 0.125 cup (convertToBaseUnit) and shown back in ml.
    expect(within(row('Olive Oil')).getByTestId('shopping-item-quantity')).toHaveTextContent('30 ml');
    expect(within(row('Olive Oil')).getByTestId('shopping-item-used-in')).toHaveTextContent('Used in: Scrambled Eggs');
    expect(list().find((i) => i.ingredientId === 'ing_002')).toMatchObject({ quantity: 0.125, unit: 'cup' });
    expect(screen.getByTestId('unit-system')).toHaveAttribute('data-system', 'metric');
  });

  it('follows $preferences.unitSystem (imperial: 0.125 cup → 2 tbsp)', async () => {
    setUnitSystem('imperial');
    $currentPlan.set(planWithEggs());
    renderList();
    await generate();
    expect(within(row('Olive Oil')).getByTestId('shopping-item-quantity')).toHaveTextContent('2 tbsp');
    expect(screen.getByTestId('unit-system')).toHaveTextContent('Imperial units');
  });

  it('checks off an item: store, row state, group count and progress follow', async () => {
    $currentPlan.set(planWithEggs());
    renderList();
    await generate();
    const chicken = row('Chicken Breast');
    const checkbox = within(chicken).getByRole('checkbox', { name: 'Mark Chicken Breast as purchased' });
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(chicken).toHaveAttribute('data-checked', 'true');
    expect(chicken).toHaveClass('checked');
    expect(list().find((i) => i.ingredientId === 'ing_001')?.checked).toBe(true);
    expect(within(screen.getAllByTestId('category-group')[0]!).getByTestId('category-count')).toHaveTextContent('1/1');
    expect(screen.getByTestId('shopping-progress-text')).toHaveTextContent('1 of 2 purchased (50%)');
    const stored = JSON.parse(localStorage.getItem(SHOPPING_KEY)!) as Array<{ ingredientId: string; checked: boolean }>;
    expect(stored.find((i) => i.ingredientId === 'ing_001')?.checked).toBe(true);
  });

  it('regenerating over recipe lines asks first, then keeps checks and custom items', async () => {
    $currentPlan.set(planWithEggs());
    renderList();
    await generate();
    await userEvent.click(within(row('Chicken Breast')).getByRole('checkbox'));
    $shopping.set([...list(), { ingredientId: 'custom-x-bread', name: 'Bread', quantity: 1, unit: 'piece', category: 'grains', checked: false, usedIn: [] }]);

    await userEvent.click(screen.getByTestId('generate-from-plan'));
    const dialog = await screen.findByTestId('shopping-confirm-dialog');
    expect(dialog).toHaveAttribute('data-kind', 'generate');
    await userEvent.click(within(dialog).getByTestId('confirm-shopping-action'));
    await waitFor(() => expect(screen.queryByTestId('shopping-confirm-dialog')).toBeNull());

    // Store order: generated lines (sorted by category id), then the manual ones.
    expect(list().map((i) => [i.name ?? i.ingredientId, i.checked])).toEqual([
      ['ing_002', false],
      ['ing_001', true],
      ['Bread', false],
    ]);
    expect(row('Bread')).toBeDefined();
    expect(within(row('Bread')).getByTestId('shopping-item-custom')).toHaveTextContent('Your item');
  });
});

describe('ShoppingList — line edits', () => {
  beforeEach(() => {
    $currentPlan.set(planWithEggs());
  });

  it('edits the quantity in the displayed unit and stores it back in the line unit', async () => {
    renderList();
    await generate();
    await userEvent.click(within(row('Olive Oil')).getByTestId('shopping-item-quantity'));
    const input = within(row('Olive Oil')).getByTestId('shopping-item-quantity-input');
    expect(input).toHaveAccessibleName('Quantity of Olive Oil in ml');
    await userEvent.clear(input);
    await userEvent.type(input, '60{Enter}');
    expect(list().find((i) => i.ingredientId === 'ing_002')).toMatchObject({ quantity: 0.25, unit: 'cup' });
    expect(within(row('Olive Oil')).getByTestId('shopping-item-quantity')).toHaveTextContent('60 ml');
  });

  it('Escape cancels a quantity edit; notes are added and edited', async () => {
    renderList();
    await generate();
    await userEvent.click(within(row('Chicken Breast')).getByTestId('shopping-item-quantity'));
    await userEvent.type(within(row('Chicken Breast')).getByTestId('shopping-item-quantity-input'), '9{Escape}');
    expect(list().find((i) => i.ingredientId === 'ing_001')?.quantity).toBe(4);

    await userEvent.click(within(row('Chicken Breast')).getByTestId('shopping-item-add-note'));
    await userEvent.type(within(row('Chicken Breast')).getByTestId('shopping-item-notes-input'), 'free range{Enter}');
    expect(list().find((i) => i.ingredientId === 'ing_001')?.notes).toBe('free range');
    expect(within(row('Chicken Breast')).getByTestId('shopping-item-notes')).toHaveTextContent('free range');
  });

  it('removes one line', async () => {
    renderList();
    await generate();
    await userEvent.click(within(row('Olive Oil')).getByRole('button', { name: 'Remove Olive Oil' }));
    expect(list().map((i) => i.ingredientId)).toEqual(['ing_001']);
    expect(screen.getAllByTestId('category-group')).toHaveLength(1);
  });

  it('clear checked and clear all confirm in an alert dialog', async () => {
    renderList();
    await generate();
    expect(screen.getByTestId('clear-completed')).toBeDisabled();
    await userEvent.click(within(row('Chicken Breast')).getByRole('checkbox'));

    await userEvent.click(screen.getByTestId('clear-completed'));
    let dialog = await screen.findByTestId('shopping-confirm-dialog');
    expect(dialog).toHaveTextContent('Remove 1 checked items?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('shopping-confirm-dialog')).toBeNull());
    expect(list()).toHaveLength(2);

    await userEvent.click(screen.getByTestId('clear-completed'));
    await userEvent.click(within(await screen.findByTestId('shopping-confirm-dialog')).getByTestId('confirm-shopping-action'));
    await waitFor(() => expect(list().map((i) => i.ingredientId)).toEqual(['ing_002']));

    await userEvent.click(screen.getByTestId('clear-list'));
    dialog = await screen.findByTestId('shopping-confirm-dialog');
    expect(dialog).toHaveAttribute('data-kind', 'clearAll');
    await userEvent.click(within(dialog).getByTestId('confirm-shopping-action'));
    await waitFor(() => expect(screen.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty'));
    expect(localStorage.getItem(SHOPPING_KEY)).toBe('[]');
  });
});

describe('ShoppingList — search, hide checked, sort', () => {
  it('filters by name, hides checked lines and sorts into a flat list', async () => {
    $currentPlan.set(planWithEggs());
    renderList();
    await generate();

    await userEvent.type(screen.getByTestId('shopping-search'), 'olive');
    expect(rows().map((r) => within(r).getByTestId('shopping-item-name').textContent)).toEqual(['Olive Oil']);
    await userEvent.clear(screen.getByTestId('shopping-search'));
    await userEvent.type(screen.getByTestId('shopping-search'), 'zzz');
    expect(screen.getByTestId('shopping-no-results')).toHaveTextContent('No items found');
    await userEvent.clear(screen.getByTestId('shopping-search'));

    await userEvent.click(within(row('Olive Oil')).getByRole('checkbox'));
    await userEvent.click(screen.getByTestId('toggle-checked'));
    expect(rows()).toHaveLength(1);
    expect(screen.getByTestId('toggle-checked')).toHaveTextContent('Show Checked');
    await userEvent.click(screen.getByTestId('toggle-checked'));
    expect(rows()).toHaveLength(2);

    await userEvent.click(screen.getByTestId('shopping-sort'));
    await userEvent.click(await screen.findByRole('option', { name: 'By Status' }));
    const flat = await screen.findByTestId('shopping-flat-list');
    expect(within(flat).getAllByTestId('shopping-item-name').map((n) => n.textContent)).toEqual(['Chicken Breast', 'Olive Oil']);
    expect(screen.queryByTestId('category-group')).toBeNull();
  });
});

describe('ShoppingList — AddItemModal (custom items)', () => {
  it('validates with localised messages and adds a custom-* line in the chosen category', async () => {
    renderList('es');
    await waitFor(() => expect(screen.getByTestId('shopping-list')).toHaveAttribute('data-status', 'empty'));
    await userEvent.click(screen.getByTestId('add-item-button'));
    const dialog = await screen.findByTestId('add-item-dialog');
    expect(dialog).toHaveTextContent('Agrega tu propio artículo');

    await userEvent.clear(within(dialog).getByTestId('item-quantity-input'));
    await userEvent.click(within(dialog).getByTestId('submit-add-item'));
    expect(await within(dialog).findByText('Ponle un nombre al artículo.')).toBeInTheDocument();
    expect(within(dialog).getByText('Escribe una cantidad mayor que 0 y hasta 10000.')).toBeInTheDocument();
    expect(list()).toHaveLength(0);

    await userEvent.type(within(dialog).getByTestId('item-name-input'), 'Leche de avena');
    await userEvent.type(within(dialog).getByTestId('item-quantity-input'), '2');
    await userEvent.click(within(dialog).getByTestId('item-unit-select'));
    await userEvent.click(await screen.findByRole('option', { name: 'L' }));
    await userEvent.click(within(dialog).getByTestId('item-category-select'));
    await userEvent.click(await screen.findByRole('option', { name: 'Lácteos' }));
    await userEvent.type(within(dialog).getByTestId('item-notes-input'), 'barista');
    await userEvent.click(within(dialog).getByTestId('submit-add-item'));

    await waitFor(() => expect(screen.queryByTestId('add-item-dialog')).toBeNull());
    expect(list()).toHaveLength(1);
    expect(list()[0]).toMatchObject({ name: 'Leche de avena', quantity: 2, unit: 'l', category: 'dairy', notes: 'barista', usedIn: [] });
    expect(list()[0]!.ingredientId).toMatch(/^custom-[0-9a-f-]{36}-leche-de-avena$/);
    const line = row('Leche de avena');
    expect(within(line).getByTestId('shopping-item-quantity')).toHaveTextContent('2 L');
    expect(screen.getByTestId('category-group')).toHaveAttribute('data-category', 'dairy');
    expect(screen.getByTestId('category-group')).toHaveTextContent('Lácteos');
  });
});

describe('ShoppingList — exports', () => {
  it('offers text / CSV downloads, a wa.me link, print and copy, in the page locale and unit system', async () => {
    $currentPlan.set(planWithEggs());
    renderList('fr');
    await generate();

    await userEvent.click(screen.getByTestId('export-menu'));
    const dialog = await screen.findByTestId('export-dialog');

    const whatsapp = within(dialog).getByTestId('whatsapp-share');
    const href = whatsapp.getAttribute('href')!;
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(href.slice('https://wa.me/?text='.length));
    expect(text).toContain('🛒 *Liste de Courses*');
    expect(text).toContain("30 ml Huile d'Olive");
    expect(text).toContain('*Protéines*');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');

    // CSV through DownloadTrigger: capture the Blob handed to createObjectURL.
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:shopping';
    });
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await userEvent.click(within(dialog).getByTestId('export-csv'));
    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await blobs[0]!.text();
    expect(csv.replace(/^\uFEFF/, '').split('\n')[0]).toBe('Catégorie,Ingrédient,Quantité,Unité,Acheté,Utilisé dans,Notes');
    expect(csv).toContain('"Garde-Manger","Huile d\'Olive",30,"ml","Non","Œufs Brouillés",""');
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('liste-de-courses.csv');

    await userEvent.click(within(dialog).getByTestId('export-text'));
    await waitFor(() => expect(blobs).toHaveLength(2));
    expect(await blobs[1]!.text()).toContain('Liste de Courses');
    click.mockRestore();

    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(within(dialog).getByTestId('copy-list'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).toContain('4 pièce');

    const print = vi.fn();
    vi.stubGlobal('print', print);
    await userEvent.click(within(dialog).getByTestId('print-list'));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });
});

describe('ShoppingList — estimated cost (roadmap #041)', () => {
  const items = () => [
    { ingredientId: 'ing_001', quantity: 2, unit: 'piece', checked: false, usedIn: [] },
    { ingredientId: 'ing_002', quantity: 500, unit: 'ml', checked: true, usedIn: [] },
    { ingredientId: 'custom-11111111-1111-4111-8111-111111111111-milk', quantity: 1, unit: 'piece', checked: false, usedIn: [], name: 'Milk' },
  ];

  it('prices each item in its own unit (store quote / avgPrice), with what is left to buy and the coverage', async () => {
    $shopping.set(items());
    renderList();
    const cost = await screen.findByTestId('shopping-cost');
    // 2 × $3 (avgPrice) + 500 ml × $0.005 (store quote per litre) = $8.50; the oil is already checked.
    await waitFor(() => expect(cost).toHaveTextContent('Estimated Cost: $8.50'));
    expect(screen.getByTestId('shopping-cost-remaining')).toHaveTextContent('$6.00 left to buy');
    expect(screen.getByTestId('shopping-cost-coverage')).toHaveTextContent('2 of 3 items priced');
    expect(screen.getByTestId('manage-prices-button')).toBeInTheDocument();
  });

  it('a custom price beats the catalog and updates the total live', async () => {
    $shopping.set(items());
    renderList();
    const cost = await screen.findByTestId('shopping-cost');
    await waitFor(() => expect(cost).toHaveAttribute('data-cost', '8.5'));
    act(() => {
      setCustomPrice('ing_001', 1, 'USD');
    });
    await waitFor(() => expect(cost).toHaveTextContent('$4.50'));
  });

  it('says so when nothing is priced in the chosen currency', async () => {
    setCurrency('MXN');
    $shopping.set(items());
    renderList('es');
    const cost = await screen.findByTestId('shopping-cost');
    expect(cost).toHaveTextContent('Aún no hay precios en MXN');
    expect(cost).not.toHaveAttribute('data-cost');
  });
});

