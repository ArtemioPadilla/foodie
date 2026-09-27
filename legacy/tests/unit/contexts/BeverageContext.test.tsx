import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { BeverageProvider, useBeverages } from '@contexts/BeverageContext';
import { LanguageProvider } from '@contexts/LanguageContext';
import { mockBeverages } from '../../mocks/mockData';
import type { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>
    <BeverageProvider>{children}</BeverageProvider>
  </LanguageProvider>
);

describe('BeverageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with loading state true', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useBeverages(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.beverages).toEqual([]);
    });

    it('loads beverages from JSON file', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.beverages).toHaveLength(mockBeverages.length);
      expect(result.current.beverages[0].id).toBe(mockBeverages[0].id);
    });

    it('fetches from correct URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/foodie/data/beverages.json');
      });
    });

    it('sets loading to false after successful load', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.beverages).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading beverages:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles non-ok response', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.beverages).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles JSON parse errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.beverages).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getBeverageById', () => {
    it('returns beverage with matching ID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const beverage = result.current.getBeverageById('bev_water');
      expect(beverage).toBeDefined();
      expect(beverage?.id).toBe('bev_water');
    });

    it('returns undefined for non-existent ID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const beverage = result.current.getBeverageById('non-existent');
      expect(beverage).toBeUndefined();
    });

    it('handles empty beverage list', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const beverage = result.current.getBeverageById('bev_water');
      expect(beverage).toBeUndefined();
    });
  });

  describe('getBeveragesByCategory', () => {
    it('returns beverages with matching category', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const waterBeverages = result.current.getBeveragesByCategory('water');
      expect(waterBeverages).toHaveLength(1);
      expect(waterBeverages[0].category).toBe('water');
    });

    it('returns empty array for non-existent category', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const beverages = result.current.getBeveragesByCategory('non-existent');
      expect(beverages).toEqual([]);
    });

    it('returns multiple beverages for same category', async () => {
      const multipleCoffeeBeverages = [
        ...mockBeverages,
        {
          ...mockBeverages[1],
          id: 'bev_espresso',
          name: { en: 'Espresso', es: 'Espresso', fr: 'Espresso' },
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => multipleCoffeeBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const coffeeBeverages = result.current.getBeveragesByCategory('coffee');
      expect(coffeeBeverages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('searchBeverages', () => {
    it('returns all beverages for empty query', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('');
      expect(results).toHaveLength(mockBeverages.length);
    });

    it('returns all beverages for whitespace-only query', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('   ');
      expect(results).toHaveLength(mockBeverages.length);
    });

    it('filters beverages by name (case-insensitive)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('water');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(bev =>
        bev.name.en.toLowerCase().includes('water')
      )).toBe(true);
    });

    it('handles uppercase search terms', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('WATER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('handles partial matches', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('wat');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array for no matches', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results = result.current.searchBeverages('nonexistent');
      expect(results).toEqual([]);
    });

    it('trims whitespace from search query', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const results1 = result.current.searchBeverages('water');
      const results2 = result.current.searchBeverages('  water  ');

      expect(results1).toEqual(results2);
    });

    it('uses translated names for search', async () => {
      // This test verifies that searchBeverages uses getTranslated
      // The actual translation is handled by LanguageContext
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Search should work with the current language's text
      const results = result.current.searchBeverages('water');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('useBeverages hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useBeverages());
      }).toThrow('useBeverages must be used within BeverageProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('memoization', () => {
    it('getBeverageById returns same function reference', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result, rerender } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstRef = result.current.getBeverageById;
      rerender();
      const secondRef = result.current.getBeverageById;

      expect(firstRef).toBe(secondRef);
    });

    it('getBeveragesByCategory returns same function reference', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result, rerender } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstRef = result.current.getBeveragesByCategory;
      rerender();
      const secondRef = result.current.getBeveragesByCategory;

      expect(firstRef).toBe(secondRef);
    });

    it('searchBeverages works correctly after rerender', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBeverages,
      });

      const { result, rerender } = renderHook(() => useBeverages(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstResults = result.current.searchBeverages('water');
      rerender();
      const secondResults = result.current.searchBeverages('water');

      // Function should work correctly even if reference changes
      expect(firstResults).toEqual(secondResults);
    });
  });
});
