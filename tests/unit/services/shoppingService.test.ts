import { describe, it, expect } from 'vitest';
import {
  getIngredientCategory,
  convertToBaseUnit,
  consolidateIngredients,
  groupByCategory,
  exportAsText,
  exportAsCSV,
  exportForWhatsApp,
} from '@services/shoppingService';
import { mockShoppingListItem } from '../../mocks/mockData';
import type { ShoppingListItem } from '@types';

describe('shoppingService', () => {
  describe('getIngredientCategory', () => {
    it('categorizes chicken as meat-poultry', () => {
      expect(getIngredientCategory('chicken_breast')).toBe('meat-poultry');
      expect(getIngredientCategory('chicken_thigh')).toBe('meat-poultry');
      expect(getIngredientCategory('chicken')).toBe('meat-poultry');
    });

    it('categorizes fish as seafood', () => {
      expect(getIngredientCategory('salmon')).toBe('seafood');
      expect(getIngredientCategory('shrimp')).toBe('seafood');
    });

    it('categorizes dairy items correctly', () => {
      expect(getIngredientCategory('milk')).toBe('dairy-eggs');
      expect(getIngredientCategory('cheddar_cheese')).toBe('dairy-eggs');
      expect(getIngredientCategory('eggs')).toBe('dairy-eggs');
    });

    it('categorizes produce correctly', () => {
      expect(getIngredientCategory('tomato')).toBe('produce');
      expect(getIngredientCategory('onion')).toBe('produce');
      expect(getIngredientCategory('garlic')).toBe('produce');
    });

    it('categorizes grains and bakery correctly', () => {
      expect(getIngredientCategory('bread')).toBe('bakery');
      expect(getIngredientCategory('rice')).toBe('grains-pasta');
      expect(getIngredientCategory('penne')).toBe('grains-pasta');
    });

    it('categorizes pantry items correctly', () => {
      expect(getIngredientCategory('olive_oil')).toBe('oils-condiments');
      expect(getIngredientCategory('soy_sauce')).toBe('oils-condiments');
      expect(getIngredientCategory('black_pepper')).toBe('spices');
    });

    it('returns other for unknown ingredients', () => {
      expect(getIngredientCategory('unknown_ingredient')).toBe('other');
      expect(getIngredientCategory('xyz_123')).toBe('other');
    });

    it('performs exact case-sensitive lookup', () => {
      expect(getIngredientCategory('chicken')).toBe('meat-poultry');
      expect(getIngredientCategory('CHICKEN')).toBe('other'); // Not in map, returns 'other'
    });
  });

  describe('convertToBaseUnit', () => {
    it('converts teaspoons to tablespoons', () => {
      const result = convertToBaseUnit(3, 'tsp');
      expect(result.quantity).toBeCloseTo(1, 2);
      expect(result.unit).toBe('tbsp');
    });

    it('converts ml to cups', () => {
      const result = convertToBaseUnit(240, 'ml');
      expect(result.quantity).toBeCloseTo(1, 1);
      expect(result.unit).toBe('cup');
    });

    it('converts ounces to pounds', () => {
      const result = convertToBaseUnit(16, 'oz');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('lb');
    });

    it('converts grams to kilograms', () => {
      const result = convertToBaseUnit(1000, 'g');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('kg');
    });

    it('converts to base units correctly', () => {
      // tbsp converts to cup (16 tbsp = 1 cup)
      expect(convertToBaseUnit(1, 'tbsp')).toEqual({ quantity: 1/16, unit: 'cup' });
      // cup is already a base unit
      expect(convertToBaseUnit(2, 'cup')).toEqual({ quantity: 2, unit: 'cup' });
      // lb is a base unit
      expect(convertToBaseUnit(1, 'lb')).toEqual({ quantity: 1, unit: 'lb' });
    });

    it('handles unknown units gracefully', () => {
      const result = convertToBaseUnit(5, 'unknown-unit');
      expect(result.quantity).toBe(5);
      expect(result.unit).toBe('unknown-unit');
    });

    it('is case insensitive', () => {
      const result = convertToBaseUnit(1, 'TSP');
      expect(result.unit).toBe('tbsp');
    });

    it('handles zero quantities', () => {
      const result = convertToBaseUnit(0, 'tsp');
      expect(result.quantity).toBe(0);
    });
  });

  describe('consolidateIngredients', () => {
    it('consolidates same ingredient with same unit', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 2, unit: 'cup', usedIn: ['Recipe A'] },
        { ingredientId: 'ing-1', quantity: 3, unit: 'cup', usedIn: ['Recipe B'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
      expect(result[0].usedIn).toContain('Recipe A');
      expect(result[0].usedIn).toContain('Recipe B');
    });

    it('consolidates ingredients with compatible units', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A'] },
        { ingredientId: 'ing-1', quantity: 16, unit: 'tbsp', usedIn: ['Recipe B'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBeCloseTo(2, 1); // 1 cup + 1 cup (16 tbsp)
    });

    it('keeps separate entries for different ingredients', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 2, unit: 'cup', usedIn: ['Recipe A'] },
        { ingredientId: 'ing-2', quantity: 3, unit: 'cup', usedIn: ['Recipe B'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result).toHaveLength(2);
    });

    it('keeps separate entries for incompatible units', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A'] },
        { ingredientId: 'ing-1', quantity: 1, unit: 'lb', usedIn: ['Recipe B'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result).toHaveLength(2);
    });

    it('rounds quantities to 2 decimal places', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 1.333333, unit: 'cup', usedIn: ['Recipe A'] },
        { ingredientId: 'ing-1', quantity: 2.666666, unit: 'cup', usedIn: ['Recipe B'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result[0].quantity).toBe(4);
    });

    it('merges usedIn arrays without duplicates', () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A', 'Recipe B'] },
        { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe B', 'Recipe C'] },
      ];

      const result = consolidateIngredients(ingredients);
      expect(result[0].usedIn).toHaveLength(3);
      expect(result[0].usedIn).toContain('Recipe A');
      expect(result[0].usedIn).toContain('Recipe B');
      expect(result[0].usedIn).toContain('Recipe C');
    });

    it('handles empty array', () => {
      const result = consolidateIngredients([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('groupByCategory', () => {
    it('groups items by category', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, ingredientId: 'chicken', category: 'Meat & Poultry' },
        { ...mockShoppingListItem, ingredientId: 'beef', category: 'Meat & Poultry' },
        { ...mockShoppingListItem, ingredientId: 'tomato', category: 'Produce' },
      ];

      const result = groupByCategory(items);
      expect(result['Meat & Poultry']).toHaveLength(2);
      expect(result['Produce']).toHaveLength(1);
    });

    it('sorts items within each category', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, ingredientId: 'zucchini', category: 'Produce' },
        { ...mockShoppingListItem, ingredientId: 'apple', category: 'Produce' },
        { ...mockShoppingListItem, ingredientId: 'banana', category: 'Produce' },
      ];

      const result = groupByCategory(items);
      expect(result['Produce'][0].ingredientId).toBe('apple');
      expect(result['Produce'][1].ingredientId).toBe('banana');
      expect(result['Produce'][2].ingredientId).toBe('zucchini');
    });

    it('uses Other for items without category', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, category: undefined },
      ];

      const result = groupByCategory(items);
      expect(result['Other']).toBeDefined();
      expect(result['Other']).toHaveLength(1);
    });

    it('handles empty array', () => {
      const result = groupByCategory([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('exportAsText', () => {
    it('exports shopping list as formatted text', () => {
      const items: ShoppingListItem[] = [
        {
          ...mockShoppingListItem,
          ingredientId: 'chicken-breast',
          quantity: 2,
          unit: 'lb',
          category: 'Meat & Poultry',
          checked: false,
          usedIn: ['Grilled Chicken'],
        },
      ];

      const result = exportAsText(items);
      expect(result).toContain('Shopping List');
      expect(result).toContain('MEAT & POULTRY');
      expect(result).toContain('2 lb chicken-breast');
      expect(result).toContain('Used in: Grilled Chicken');
    });

    it('shows checkboxes correctly', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, checked: true },
        { ...mockShoppingListItem, checked: false, ingredientId: 'ing-2' },
      ];

      const result = exportAsText(items);
      expect(result).toContain('✓');
      expect(result).toContain('☐');
    });

    it('includes notes when present', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, notes: 'Get organic' },
      ];

      const result = exportAsText(items);
      expect(result).toContain('Note: Get organic');
    });
  });

  describe('exportAsCSV', () => {
    it('exports shopping list as CSV', () => {
      const items: ShoppingListItem[] = [
        {
          ...mockShoppingListItem,
          ingredientId: 'chicken-breast',
          quantity: 2,
          unit: 'lb',
          category: 'Meat & Poultry',
          checked: false,
          usedIn: ['Grilled Chicken'],
          notes: 'Fresh',
        },
      ];

      const result = exportAsCSV(items);
      expect(result).toContain('Category,Ingredient,Quantity,Unit,Checked,Used In,Notes');
      expect(result).toContain('"Meat & Poultry","chicken-breast",2,"lb","No","Grilled Chicken","Fresh"');
    });

    it('handles items with no notes', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, notes: undefined },
      ];

      const result = exportAsCSV(items);
      expect(result).toContain('""'); // Empty notes
    });

    it('handles checked items', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, checked: true },
      ];

      const result = exportAsCSV(items);
      expect(result).toContain('"Yes"');
    });

    it('handles multiple recipes in usedIn', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, usedIn: ['Recipe A', 'Recipe B', 'Recipe C'] },
      ];

      const result = exportAsCSV(items);
      expect(result).toContain('Recipe A; Recipe B; Recipe C');
    });
  });

  describe('exportForWhatsApp', () => {
    it('exports shopping list for WhatsApp', () => {
      const items: ShoppingListItem[] = [
        {
          ...mockShoppingListItem,
          ingredientId: 'chicken-breast',
          quantity: 2,
          unit: 'lb',
          category: 'Meat & Poultry',
          checked: false,
        },
      ];

      const result = exportForWhatsApp(items);
      expect(result).toContain('🛒 *Shopping List*');
      expect(result).toContain('*Meat & Poultry*');
      expect(result).toContain('2 lb chicken-breast');
      expect(result).toContain('_Total items: 1_');
    });

    it('uses appropriate emoji for checked items', () => {
      const items: ShoppingListItem[] = [
        { ...mockShoppingListItem, checked: true },
        { ...mockShoppingListItem, ingredientId: 'ing-2', checked: false },
      ];

      const result = exportForWhatsApp(items);
      expect(result).toContain('✅');
      expect(result).toContain('☑️');
    });

    it('counts total items correctly', () => {
      const items: ShoppingListItem[] = [
        mockShoppingListItem,
        { ...mockShoppingListItem, ingredientId: 'ing-2' },
        { ...mockShoppingListItem, ingredientId: 'ing-3' },
      ];

      const result = exportForWhatsApp(items);
      expect(result).toContain('_Total items: 3_');
    });
  });
});
