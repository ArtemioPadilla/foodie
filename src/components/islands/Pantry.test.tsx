// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { addDaysToKey, todayKey } from '@/lib/format-date';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, type PantryItem } from '@/schemas';
import { $pantry, PANTRY_KEY } from '@/stores/pantry';
import { resetPreferences, setUnitSystem } from '@/stores/preferences';
import { $shopping } from '@/stores/shopping';
import { makeIngredient, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { PantryView } from './Pantry';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';

closeToastsAfterEach();

/**
 * jsdom tests of the `/pantry/` island (roadmap Issue 027): hydration parity,
 * CRUD through the rhf + zod dialog (catalog and custom items, date picker,
 * localised validation), the "Expiring soon" / "Expired" / "Low stock" blocks
 * with "add to shopping list", search / category / status / sort, the
 * confirmed "clear pantry" and "What can I cook" — all through `$pantry`.
 */

// The island + dialog + lazy date picker are heavy to import under the full
// parallel suite; give each test room (same approach as the kit's form-item tests).
vi.setConfig({ testTimeout: 20_000 });
const LAZY = { timeout: 10_000 };

const eggs = makeRecipe(); // rec_001: 4 piece ing_001 + 30 ml ing_002
const pilaf = makeRecipe({
  id: 'rec_002',
  name: { en: 'Rice Pilaf', es: 'Arroz Pilaf', fr: 'Riz Pilaf' },
  ingredients: [
    { ingredientId: 'ing_003', quantity: 1, unit: 'cup', optional: false },
    { ingredientId: 'ing_002', quantity: 15, unit: 'ml', optional: false },
  ],
});
const chicken = makeIngredient();
const oil = makeIngredient({ id: 'ing_002', name: { en: 'Olive Oil', es: 'Aceite de Oliva', fr: "Huile d'Olive" }, category: 'pantry', unit: 'ml' });
const rice = makeIngredient({ id: 'ing_003', name: { en: 'Rice', es: 'Arroz', fr: 'Riz' }, category: 'grains', unit: 'cup' });

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, pilaf] },
  [CATALOG_FILES.ingredients]: { ingredients: [chicken, oil, rice] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: CategoriesFileSchema.parse({
    mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
    cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
    dietaryTags: [{ id: 'vegetarian', name: { en: 'Vegetarian', es: 'Vegetariano', fr: 'Végétarien' } }],
    ingredientCategories: mockIngredientCategories,
  }),
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

function renderPantry(lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <PantryView lang={lang} />
    </QueryClientProvider>,
  );
}

const day = (offset: number) => addDaysToKey(todayKey(), offset);
function item(overrides: Partial<PantryItem>): PantryItem {
  return { id: `pantry_${overrides.ingredientId}`, ingredientId: 'ing_001', quantity: 4, unit: 'piece', addedAt: '2026-09-01T10:00:00.000Z', ...overrides };
}

const rows = () => screen.queryAllByTestId('pantry-item');
const row = (name: string) => rows().find((r) => within(r).getByTestId('pantry-item-name').textContent === name)!;
const stock = () => $pantry.get();

async function ready() {
  await waitFor(() => expect(screen.getByTestId('pantry-board')).toHaveAttribute('data-catalog', 'success'));
}

async function openAddDialog() {
  await userEvent.click(screen.getByTestId('add-pantry-item'));
  return screen.findByTestId('pantry-item-dialog');
}

async function pick(trigger: HTMLElement, option: string) {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

beforeEach(() => {
  localStorage.clear();
  $pantry.set([]);
  $shopping.set([]);
  resetPreferences();
  setUnitSystem('metric');
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Pantry — hydration and empty state', () => {
  it('server-renders a skeleton (no localStorage read), then hydrates', () => {
    $pantry.set([item({ ingredientId: 'ing_001' })]);
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <PantryView lang="en" />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).not.toContain('pantry-item');
  });

  it('shows the localised empty state with an "add first item" action', async () => {
    renderPantry('es');
    await waitFor(() => expect(screen.getByTestId('pantry')).toHaveAttribute('data-status', 'empty'));
    expect(screen.getByTestId('pantry-empty')).toHaveTextContent('Despensa Vacía');
    await userEvent.click(screen.getByTestId('add-first-pantry-item'));
    expect(await screen.findByTestId('pantry-item-dialog')).toHaveTextContent('Agregar a Despensa');
  });
});

describe('Pantry — add, edit, remove (rhf + zod dialog)', () => {
  it('validates with localised messages', async () => {
    renderPantry('fr');
    await ready();
    const dialog = await openAddDialog();
    await userEvent.clear(within(dialog).getByTestId('pantry-quantity-input'));
    await userEvent.click(within(dialog).getByTestId('submit-pantry-item'));
    expect(await within(dialog).findByText("Le nom de l'ingrédient est requis")).toBeInTheDocument();
    expect(within(dialog).getByText("Saisissez une quantité supérieure à 0 et jusqu'à 10000.")).toBeInTheDocument();
    expect(stock()).toHaveLength(0);
  });

  it('adds a catalog ingredient by its localised name: catalog id and unit, chosen location', async () => {
    renderPantry('es');
    await ready();
    const dialog = await openAddDialog();
    await userEvent.type(within(dialog).getByTestId('pantry-name-input'), 'aceite de oliva');
    // The catalog match brings its unit and hides the custom-category field.
    await waitFor(() => expect(within(dialog).getByTestId('pantry-unit-select')).toHaveTextContent('ml'));
    expect(within(dialog).queryByTestId('pantry-category-select')).toBeNull();
    await userEvent.clear(within(dialog).getByTestId('pantry-quantity-input'));
    await userEvent.type(within(dialog).getByTestId('pantry-quantity-input'), '500');
    await pick(within(dialog).getByTestId('pantry-location-select'), 'Gabinete');
    await userEvent.click(within(dialog).getByTestId('submit-pantry-item'));

    await waitFor(() => expect(screen.queryByTestId('pantry-item-dialog')).toBeNull());
    expect(stock()).toHaveLength(1);
    expect(stock()[0]).toMatchObject({ ingredientId: 'ing_002', quantity: 500, unit: 'ml', location: 'Cabinet' });
    expect(stock()[0]!.name).toBeUndefined();
    expect(stock()[0]!.id).toMatch(/^pantry_/);
    const oilRow = row('Aceite de Oliva');
    expect(within(oilRow).getByTestId('pantry-item-quantity')).toHaveTextContent('500 ml');
    expect(within(oilRow).getByTestId('pantry-item-location')).toHaveTextContent('Gabinete');
    expect(within(oilRow).getByTestId('pantry-item-expiration')).toHaveTextContent('Sin fecha de vencimiento');
    expect(JSON.parse(localStorage.getItem(PANTRY_KEY)!)).toHaveLength(1);
  });

  it('adds a custom item with a category and an expiration date from the date picker', async () => {
    renderPantry();
    await ready();
    const dialog = await openAddDialog();
    await userEvent.type(within(dialog).getByTestId('pantry-name-input'), 'Oat milk');
    await pick(within(dialog).getByTestId('pantry-unit-select'), 'L');
    await pick(within(dialog).getByTestId('pantry-category-select'), 'Dairy');

    await userEvent.click(await within(dialog).findByTestId('pantry-expiry-trigger', {}, LAZY));
    const tomorrow = day(1);
    const cell = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(`[data-day="${tomorrow}"] button`);
      expect(found).not.toBeNull();
      return found!;
    });
    await userEvent.click(cell);
    await waitFor(() => expect(within(dialog).getByTestId('pantry-expiry-trigger')).not.toHaveTextContent('Pick a date'));
    await userEvent.click(within(dialog).getByTestId('submit-pantry-item'));

    await waitFor(() => expect(screen.queryByTestId('pantry-item-dialog')).toBeNull());
    expect(stock()[0]).toMatchObject({ name: 'Oat milk', unit: 'l', quantity: 1, category: 'dairy', expirationDate: tomorrow });
    expect(stock()[0]!.ingredientId).toMatch(/^custom-[0-9a-f-]{36}-oat-milk$/);
    const milk = row('Oat milk');
    expect(within(milk).getByTestId('badge-custom')).toHaveTextContent('Your item');
    expect(within(milk).getByTestId('badge-expiring')).toBeInTheDocument();
    expect(within(milk).getByTestId('pantry-item-expiration')).toHaveTextContent('Expires tomorrow');
    expect(within(milk).getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByTestId('pantry-expiring')).toHaveTextContent('Oat milk');
  });

  it('edits an item (prefilled), clears its date, and removes another', async () => {
    $pantry.set([
      item({ id: 'p-chicken', ingredientId: 'ing_001', quantity: 4, expirationDate: day(20), location: 'Fridge' }),
      item({ id: 'p-rice', ingredientId: 'ing_003', quantity: 2, unit: 'cup' }),
    ]);
    renderPantry();
    await ready();
    await userEvent.click(within(row('Chicken Breast')).getByRole('button', { name: 'Edit Chicken Breast' }));
    const dialog = await screen.findByTestId('pantry-item-dialog');
    expect(dialog).toHaveAttribute('data-mode', 'edit');
    expect(within(dialog).getByTestId('pantry-name-input')).toHaveValue('Chicken Breast');
    expect(within(dialog).getByTestId('pantry-quantity-input')).toHaveValue(4);
    expect(within(dialog).getByTestId('pantry-location-select')).toHaveTextContent('Fridge');
    await userEvent.clear(within(dialog).getByTestId('pantry-quantity-input'));
    await userEvent.type(within(dialog).getByTestId('pantry-quantity-input'), '6');
    await within(dialog).findByTestId('pantry-expiry-trigger', {}, LAZY);
    await userEvent.click(within(dialog).getByTestId('pantry-clear-expiry'));
    await userEvent.click(within(dialog).getByTestId('submit-pantry-item'));
    await waitFor(() => expect(screen.queryByTestId('pantry-item-dialog')).toBeNull());

    const updated = stock().find((i) => i.id === 'p-chicken')!;
    expect(updated).toMatchObject({ ingredientId: 'ing_001', quantity: 6, unit: 'piece', location: 'Fridge' });
    expect(updated.expirationDate).toBeUndefined();
    expect(within(row('Chicken Breast')).getByTestId('pantry-item-quantity')).toHaveTextContent('6 piece');

    await userEvent.click(within(row('Rice')).getByRole('button', { name: 'Remove Rice' }));
    expect(stock().map((i) => i.id)).toEqual(['p-chicken']);
    expect(await screen.findByText('Rice removed from your pantry')).toBeInTheDocument();
  });
});

describe('Pantry — expiring, expired and low stock', () => {
  beforeEach(() => {
    $pantry.set([
      item({ id: 'p-chicken', ingredientId: 'ing_001', quantity: 1, expirationDate: day(2) }),
      item({ id: 'p-oil', ingredientId: 'ing_002', quantity: 750, unit: 'ml', expirationDate: day(-3) }),
      item({ id: 'p-rice', ingredientId: 'ing_003', quantity: 3, unit: 'cup', expirationDate: day(40) }),
    ]);
  });

  it('lists what expires soon (warning callout), what expired, and what runs low', async () => {
    renderPantry();
    await ready();
    const expiring = screen.getByTestId('pantry-expiring');
    expect(expiring).toHaveAttribute('data-count', '1');
    expect(within(expiring).getByTestId('expiring-entry')).toHaveTextContent('Chicken BreastExpires in 2 days');
    expect(screen.getByTestId('pantry-expired')).toHaveTextContent('Olive Oil');
    expect(within(row('Olive Oil')).getByTestId('badge-expired')).toHaveTextContent('Expired');
    expect(within(row('Olive Oil')).getByTestId('pantry-item-expiration')).toHaveTextContent(/^Expired on /);
    const low = screen.getByTestId('pantry-low-stock');
    expect(low).toHaveAttribute('data-count', '1');
    expect(within(low).getByTestId('low-stock-entry')).toHaveTextContent('Chicken Breast · 1 piece');
  });

  it('adds a low-stock item to the shopping list', async () => {
    renderPantry();
    await ready();
    await userEvent.click(within(screen.getByTestId('pantry-low-stock')).getByRole('button', { name: /Add to shopping list: Chicken Breast/ }));
    expect($shopping.get()).toEqual([{ ingredientId: 'ing_001', quantity: 1, unit: 'piece', usedIn: [], category: 'protein', checked: false }]);
    expect(await screen.findByText('Chicken Breast added to your shopping list')).toBeInTheDocument();
  });

  it('says so when nothing expires soon', async () => {
    $pantry.set([item({ ingredientId: 'ing_003', unit: 'cup', quantity: 3 })]);
    renderPantry('es');
    await ready();
    expect(screen.getByTestId('pantry-expiring')).toHaveTextContent('¡Todo Bien!');
    expect(screen.getByTestId('pantry-low-stock')).toHaveTextContent('No se está acabando nada.');
  });
});

describe('Pantry — search, filters, sort, clear', () => {
  beforeEach(() => {
    $pantry.set([
      item({ id: 'p-chicken', ingredientId: 'ing_001', quantity: 1, expirationDate: day(2), location: 'Fridge', addedAt: '2026-09-02T00:00:00.000Z' }),
      item({ id: 'p-oil', ingredientId: 'ing_002', quantity: 750, unit: 'ml', addedAt: '2026-09-03T00:00:00.000Z' }),
      item({ id: 'p-rice', ingredientId: 'ing_003', quantity: 3, unit: 'cup', expirationDate: day(-1), addedAt: '2026-09-01T00:00:00.000Z' }),
    ]);
  });
  const names = () => rows().map((r) => within(r).getByTestId('pantry-item-name').textContent);

  it('sorts by expiration by default, and by name / quantity / date added on demand', async () => {
    renderPantry();
    await ready();
    expect(names()).toEqual(['Rice', 'Chicken Breast', 'Olive Oil']);
    await pick(screen.getByTestId('pantry-sort'), 'By name');
    expect(names()).toEqual(['Chicken Breast', 'Olive Oil', 'Rice']);
    await pick(screen.getByTestId('pantry-sort'), 'By quantity');
    expect(names()).toEqual(['Chicken Breast', 'Rice', 'Olive Oil']);
    await pick(screen.getByTestId('pantry-sort'), 'Recently added');
    expect(names()).toEqual(['Olive Oil', 'Chicken Breast', 'Rice']);
  });

  it('searches by name or location and filters by category and status', async () => {
    renderPantry();
    await ready();
    await userEvent.type(screen.getByTestId('pantry-search'), 'fridge');
    expect(names()).toEqual(['Chicken Breast']);
    await userEvent.clear(screen.getByTestId('pantry-search'));
    await userEvent.type(screen.getByTestId('pantry-search'), 'zzz');
    expect(screen.getByTestId('pantry-no-results')).toBeInTheDocument();
    await userEvent.clear(screen.getByTestId('pantry-search'));

    await pick(screen.getByTestId('pantry-category-filter'), 'Grains');
    expect(names()).toEqual(['Rice']);
    await pick(screen.getByTestId('pantry-category-filter'), 'All categories');
    await pick(screen.getByTestId('pantry-status-filter'), 'Low stock');
    expect(names()).toEqual(['Chicken Breast']);
    await pick(screen.getByTestId('pantry-status-filter'), 'Expired');
    expect(names()).toEqual(['Rice']);
  });

  it('clears the pantry only after confirming', async () => {
    renderPantry();
    await ready();
    await userEvent.click(screen.getByTestId('clear-pantry'));
    const dialog = await screen.findByTestId('pantry-confirm-dialog');
    expect(dialog).toHaveTextContent('This removes all 3 items from your pantry.');
    await userEvent.click(within(dialog).getByTestId('confirm-clear-pantry'));
    await waitFor(() => expect(screen.getByTestId('pantry')).toHaveAttribute('data-status', 'empty'));
    expect(stock()).toEqual([]);
  });
});

describe('Pantry — what can I cook', () => {
  it('ranks recipes by the share of ingredients in stock and adds what is missing to the list', async () => {
    $pantry.set([item({ ingredientId: 'ing_001', quantity: 6 }), item({ ingredientId: 'ing_003', quantity: 2, unit: 'cup' })]);
    renderPantry();
    await ready();
    const suggestions = screen.getAllByTestId('pantry-suggestion');
    expect(suggestions.map((s) => [s.getAttribute('data-recipe-id'), s.getAttribute('data-percent')])).toEqual([
      ['rec_001', '50'],
      ['rec_002', '50'],
    ]);
    const first = suggestions[0]!;
    expect(within(first).getByRole('link', { name: 'Scrambled Eggs' })).toHaveAttribute('href', withBase('/recipes/rec_001/'));
    expect(within(first).getByTestId('suggestion-have')).toHaveTextContent('You have 1 of 2 ingredients');
    expect(within(first).getByTestId('suggestion-missing')).toHaveTextContent('Olive Oil');

    await userEvent.click(within(first).getByTestId('add-missing-to-shopping'));
    expect($shopping.get()).toEqual([
      { ingredientId: 'ing_002', quantity: 30, unit: 'ml', usedIn: ['rec_001'], category: 'pantry', checked: false },
    ]);

    await pick(screen.getByTestId('pantry-min-match'), 'Ready to cook');
    expect(screen.getByTestId('pantry-suggestions-empty')).toBeInTheDocument();
  });

  it('puts complete recipes first, prefers expiring ingredients, and ignores expired stock', async () => {
    $pantry.set([
      item({ ingredientId: 'ing_001', quantity: 6 }),
      item({ ingredientId: 'ing_002', quantity: 500, unit: 'ml' }),
      item({ ingredientId: 'ing_003', quantity: 2, unit: 'cup', expirationDate: day(1) }),
    ]);
    renderPantry('es');
    await ready();
    const [top, second] = screen.getAllByTestId('pantry-suggestion');
    expect(top).toHaveAttribute('data-recipe-id', 'rec_002');
    expect(within(top!).getByTestId('suggestion-expiring')).toHaveTextContent('Usa 1 ingrediente que vence pronto');
    expect(within(top!).getByTestId('suggestion-ready')).toHaveTextContent('Tienes todo');
    expect(second).toHaveAttribute('data-recipe-id', 'rec_001');
    expect(within(top!).getByRole('link')).toHaveAttribute('href', withBase('/es/recipes/rec_002/'));

    $pantry.set(stock().map((i) => (i.ingredientId === 'ing_002' ? { ...i, expirationDate: day(-1) } : i)));
    await waitFor(() => expect(screen.getAllByTestId('pantry-suggestion').map((s) => s.getAttribute('data-percent'))).toEqual(['50', '50']));
  });
});
