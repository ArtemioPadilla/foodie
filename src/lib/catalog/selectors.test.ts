import { describe, expect, it } from 'vitest';
import { mockBeverages } from '@/tests/fixtures/foodie-domain';
import { getBeverageById, getBeveragesByCategory, pickLang, searchBeverages } from './selectors';

/**
 * Port of legacy `tests/unit/contexts/BeverageContext.test.tsx` (25 tests).
 * The 7 loading / fetch / provider-guard tests have no pure equivalent — the
 * fetch moves to `useCatalog()` (Issue 016) where they are re-created against
 * TanStack Query; the 18 selector behaviours are covered here.
 */
describe('getBeverageById', () => {
  it('returns beverage with matching ID', () => {
    expect(getBeverageById(mockBeverages, 'bev_water')?.id).toBe('bev_water');
  });

  it('returns undefined for non-existent ID', () => {
    expect(getBeverageById(mockBeverages, 'non-existent')).toBeUndefined();
  });

  it('handles empty beverage list', () => {
    expect(getBeverageById([], 'bev_water')).toBeUndefined();
  });
});

describe('getBeveragesByCategory', () => {
  it('returns beverages with matching category', () => {
    const water = getBeveragesByCategory(mockBeverages, 'water');
    expect(water).toHaveLength(1);
    expect(water[0]?.category).toBe('water');
  });

  it('returns empty array for non-existent category', () => {
    expect(getBeveragesByCategory(mockBeverages, 'non-existent')).toEqual([]);
  });

  it('returns multiple beverages for same category', () => {
    const more = [...mockBeverages, { ...mockBeverages[1]!, id: 'bev_espresso', name: { en: 'Espresso', es: 'Espresso', fr: 'Espresso' } }];
    expect(getBeveragesByCategory(more, 'coffee').length).toBeGreaterThanOrEqual(2);
  });
});

describe('searchBeverages', () => {
  it('returns all beverages for empty query', () => {
    expect(searchBeverages(mockBeverages, '')).toHaveLength(mockBeverages.length);
  });

  it('returns all beverages for whitespace-only query', () => {
    expect(searchBeverages(mockBeverages, '   ')).toHaveLength(mockBeverages.length);
  });

  it('does not return the same array instance (safe to mutate)', () => {
    expect(searchBeverages(mockBeverages, '')).not.toBe(mockBeverages);
  });

  it('filters beverages by name (case-insensitive)', () => {
    const results = searchBeverages(mockBeverages, 'water');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((b) => b.name.en.toLowerCase().includes('water'))).toBe(true);
  });

  it('handles uppercase search terms', () => {
    expect(searchBeverages(mockBeverages, 'WATER').length).toBeGreaterThan(0);
  });

  it('handles partial matches', () => {
    expect(searchBeverages(mockBeverages, 'wat').length).toBeGreaterThan(0);
  });

  it('returns empty array for no matches', () => {
    expect(searchBeverages(mockBeverages, 'nonexistent')).toEqual([]);
  });

  it('trims whitespace from search query', () => {
    expect(searchBeverages(mockBeverages, '  water  ')).toEqual(searchBeverages(mockBeverages, 'water'));
  });

  it('uses translated names for search', () => {
    expect(searchBeverages(mockBeverages, 'agua', 'es').map((b) => b.id)).toEqual(['bev_water']);
    expect(searchBeverages(mockBeverages, 'eau', 'fr').map((b) => b.id)).toEqual(['bev_water']);
    expect(searchBeverages(mockBeverages, 'agua', 'en')).toEqual([]);
  });
});

describe('pickLang', () => {
  it('returns the requested locale and falls back to English when blank', () => {
    expect(pickLang({ en: 'Water', es: 'Agua', fr: 'Eau' }, 'fr')).toBe('Eau');
    expect(pickLang({ en: 'Water', es: '', fr: 'Eau' }, 'es')).toBe('Water');
  });
});
