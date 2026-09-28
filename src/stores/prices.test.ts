// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { $customPrices, CUSTOM_PRICES_KEY, resetAllCustomPrices, resetCustomPrice, setCustomPrice } from './prices';

beforeEach(() => {
  localStorage.clear();
  resetAllCustomPrices();
});

describe('$customPrices (foodie:custom-prices)', () => {
  it('starts empty', () => {
    expect($customPrices.get()).toEqual({});
  });

  it('persists a custom price with its currency', () => {
    expect(setCustomPrice('ing_001', 0.42, 'USD')).toBe(true);
    expect($customPrices.get()).toEqual({ ing_001: { price: 0.42, currency: 'USD' } });
    expect(JSON.parse(localStorage.getItem(CUSTOM_PRICES_KEY) ?? '{}')).toEqual({
      ing_001: { price: 0.42, currency: 'USD' },
    });
  });

  it('rejects zero, negative, NaN and infinite prices (PR #28 validation)', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(setCustomPrice('ing_001', bad, 'USD')).toBe(false);
    }
    expect(setCustomPrice('', 1, 'USD')).toBe(false);
    expect($customPrices.get()).toEqual({});
  });

  it('resets one price or all of them', () => {
    setCustomPrice('ing_001', 1, 'USD');
    setCustomPrice('ing_002', 2, 'EUR');
    resetCustomPrice('ing_001');
    resetCustomPrice('missing');
    expect($customPrices.get()).toEqual({ ing_002: { price: 2, currency: 'EUR' } });
    resetAllCustomPrices();
    expect($customPrices.get()).toEqual({});
  });

  it('loads stored prices and drops a corrupt value', async () => {
    localStorage.setItem(CUSTOM_PRICES_KEY, JSON.stringify({ ing_009: { price: 3, currency: 'MXN' } }));
    vi.resetModules();
    const fresh = await import('./prices');
    expect(fresh.$customPrices.get()).toEqual({ ing_009: { price: 3, currency: 'MXN' } });

    localStorage.setItem(CUSTOM_PRICES_KEY, JSON.stringify({ ing_009: 3 }));
    vi.resetModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corrupt = await import('./prices');
    expect(corrupt.$customPrices.get()).toEqual({});
    warn.mockRestore();
  });
});
