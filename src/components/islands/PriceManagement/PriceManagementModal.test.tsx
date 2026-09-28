// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import type { IngredientPrice } from '@/schemas';
import { $currency, resetPreferences, setCurrency } from '@/stores/preferences';
import { $customPrices, CUSTOM_PRICES_KEY, resetAllCustomPrices, setCustomPrice } from '@/stores/prices';
import { makeIngredient, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { parsePriceInput, PriceManagementModal } from './PriceManagementModal';

/**
 * Roadmap Issue 041 — PR #28's `PriceManagementModal` rebuilt as `Dialog` +
 * `DataTable` with `Editable` cells: custom price per ingredient persisted in
 * `foodie:custom-prices`, reset one / reset all, `$preferences.currency`.
 */

closeToastsAfterEach();

const WAIT = { timeout: 8000 };
const SLOW = 15000;

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  // jsdom has no layout: give the virtualized table a viewport.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(900);
  localStorage.clear();
  resetAllCustomPrices();
  resetPreferences();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const eggs = makeIngredient({
  id: 'ing_001',
  name: { en: 'Egg', es: 'Huevo', fr: 'Œuf' },
  category: 'dairy',
  unit: 'piece',
  avgPrice: 0.5,
});
const oil = makeIngredient({
  id: 'ing_003',
  name: { en: 'Olive oil', es: 'Aceite de oliva', fr: "Huile d'olive" },
  category: 'oils',
  unit: 'tbsp',
  avgPrice: 0.3,
});
const prices: IngredientPrice[] = [{ id: 'ing_001', price: 4.29, unit: 'dozen', currency: 'USD', legacyKey: 'eggs' }];

function renderModal(lang: 'en' | 'es' | 'fr' = 'en') {
  const user = userEvent.setup();
  render(
    <>
      <PriceManagementModal lang={lang} ingredients={[eggs, oil]} categories={mockIngredientCategories} prices={prices} />
      <Toaster />
    </>,
  );
  return user;
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('manage-prices-button'));
  return screen.findByTestId('price-dialog');
}

describe('parsePriceInput', () => {
  it('accepts dot or comma decimals and rejects everything else', () => {
    expect(parsePriceInput('1.50')).toBe(1.5);
    expect(parsePriceInput(' 2,25 ')).toBe(2.25);
    expect(parsePriceInput('.5')).toBe(0.5);
    expect(parsePriceInput('3.')).toBe(3);
    expect(parsePriceInput('abc')).toBeNaN();
    expect(parsePriceInput('1e3')).toBeNaN();
    expect(parsePriceInput('-1')).toBeNaN();
  });
});

describe('PriceManagementModal', () => {
  it('lists every ingredient with its catalog price (store quote per recipe unit, else avgPrice)', async () => {
    const user = renderModal();
    const dialog = await open(user);
    expect(within(dialog).getByRole('heading', { name: 'Ingredient prices' })).toBeInTheDocument();
    const egg = within(dialog).getByTestId('catalog-price-ing_001');
    expect(egg).toHaveTextContent('$0.36');
    expect(egg).toHaveTextContent('Store: $4.29 / dozen');
    expect(within(dialog).getByTestId('catalog-price-ing_003')).toHaveTextContent('$0.30');
    expect(within(dialog).getByTestId('price-custom-count')).toHaveTextContent('0 custom prices');
  });

  it('saves a custom price to foodie:custom-prices in the current currency', async () => {
    const user = renderModal();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Edit the price of Olive oil' }));
    const input = within(dialog).getByRole('textbox', { name: /Your price for Olive oil, per tbsp, in USD/ });
    // Text and Enter in two calls: the zag machine commits asynchronously (see editable.behavior.test).
    await user.type(input, '0,45');
    await waitFor(() => expect(input).toHaveValue('0,45'), WAIT);
    await user.type(input, '{Enter}');
    await waitFor(() => expect($customPrices.get()).toEqual({ ing_003: { price: 0.45, currency: 'USD' } }), WAIT);
    expect(JSON.parse(localStorage.getItem(CUSTOM_PRICES_KEY) ?? '{}')).toEqual({ ing_003: { price: 0.45, currency: 'USD' } });
    expect(within(dialog).getByTestId('custom-price-ing_003')).toHaveAttribute('data-custom', 'true');
    expect(within(dialog).getByTestId('price-custom-count')).toHaveTextContent('1 custom price');
    expect(await screen.findByText('Price of Olive oil saved', {}, WAIT)).toBeInTheDocument();
  }, SLOW);

  it('rejects an invalid price with a toast and keeps nothing', async () => {
    const user = renderModal();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Edit the price of Egg' }));
    const input = within(dialog).getByRole('textbox', { name: /Your price for Egg/ });
    await user.type(input, '0');
    await waitFor(() => expect(input).toHaveValue('0'), WAIT);
    await user.type(input, '{Enter}');
    expect(await screen.findByText('Enter a price greater than 0', {}, WAIT)).toBeInTheDocument();
    expect($customPrices.get()).toEqual({});
  }, SLOW);

  it('resets one price, then all of them after an inline confirmation', async () => {
    setCustomPrice('ing_001', 0.4, 'USD');
    setCustomPrice('ing_003', 0.2, 'USD');
    const user = renderModal();
    const dialog = await open(user);
    await user.click(within(dialog).getByRole('button', { name: 'Reset Egg to the catalogue price' }));
    expect($customPrices.get()).toEqual({ ing_003: { price: 0.2, currency: 'USD' } });

    await user.click(within(dialog).getByTestId('price-reset-all'));
    const confirm = within(dialog).getByTestId('price-reset-confirm');
    expect(confirm).toHaveTextContent('Your 1 custom price will be removed');
    await user.click(within(confirm).getByTestId('price-reset-all-confirm'));
    expect($customPrices.get()).toEqual({});
    expect(within(dialog).queryByTestId('price-reset-all')).not.toBeInTheDocument();
  });

  it('filters to custom prices only and searches with the table filter', async () => {
    setCustomPrice('ing_003', 0.2, 'USD');
    const user = renderModal();
    const dialog = await open(user);
    await user.click(within(dialog).getByTestId('price-custom-only'));
    expect(within(dialog).queryByTestId('catalog-price-ing_001')).not.toBeInTheDocument();
    expect(within(dialog).getByTestId('catalog-price-ing_003')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('price-custom-only'));
    await user.type(within(dialog).getByRole('textbox', { name: 'Search ingredients' }), 'egg');
    await waitFor(() => expect(within(dialog).queryByTestId('catalog-price-ing_003')).not.toBeInTheDocument());
    expect(within(dialog).getByTestId('catalog-price-ing_001')).toBeInTheDocument();
  });

  it('switching currency keeps prices in their own currency and marks them unused', async () => {
    setCustomPrice('ing_003', 0.2, 'USD');
    setCurrency('EUR');
    const user = renderModal();
    const dialog = await open(user);
    expect($currency.get()).toBe('EUR');
    expect(within(dialog).getByTestId('catalog-price-ing_001')).toHaveTextContent('In USD, not used');
    expect(within(dialog).getByTestId('custom-price-ing_003')).toHaveTextContent('In USD, not used');
    expect(within(dialog).getByTestId('price-currency')).toHaveTextContent('EUR');
  });

  it('is fully translated (es)', async () => {
    const user = renderModal('es');
    const dialog = await open(user);
    expect(within(dialog).getByRole('heading', { name: 'Precios de ingredientes' })).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Buscar ingredientes' })).toBeInTheDocument();
    expect(within(dialog).getByTestId('catalog-price-ing_001')).toHaveTextContent('Tienda:');
  });
});
