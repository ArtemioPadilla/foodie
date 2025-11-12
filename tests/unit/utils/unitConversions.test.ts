import { describe, it, expect, vi } from 'vitest';
import {
  convertUnit,
  roundToUsefulFraction,
  formatQuantity,
  unitConversions,
} from '@utils/unitConversions';

describe('unitConversions', () => {
  describe('convertUnit', () => {
    it('returns same quantity when units are identical', () => {
      expect(convertUnit(5, 'cup', 'cup')).toBe(5);
      expect(convertUnit(10, 'ml', 'ml')).toBe(10);
    });

    it('converts cups to ml correctly', () => {
      expect(convertUnit(1, 'cup', 'ml')).toBe(240);
      expect(convertUnit(2, 'cup', 'ml')).toBe(480);
    });

    it('converts cups to tablespoons correctly', () => {
      expect(convertUnit(1, 'cup', 'tbsp')).toBe(16);
      expect(convertUnit(0.5, 'cup', 'tbsp')).toBe(8);
    });

    it('converts tablespoons to teaspoons correctly', () => {
      expect(convertUnit(1, 'tbsp', 'tsp')).toBe(3);
      expect(convertUnit(2, 'tbsp', 'tsp')).toBe(6);
    });

    it('converts kg to pounds correctly', () => {
      expect(convertUnit(1, 'kg', 'lb')).toBeCloseTo(2.20462, 4);
      expect(convertUnit(2, 'kg', 'lb')).toBeCloseTo(4.40924, 4);
    });

    it('converts pounds to ounces correctly', () => {
      expect(convertUnit(1, 'lb', 'oz')).toBe(16);
      expect(convertUnit(0.5, 'lb', 'oz')).toBe(8);
    });

    it('converts grams to ounces correctly', () => {
      expect(convertUnit(100, 'g', 'oz')).toBeCloseTo(3.5274, 3);
    });

    it('handles unavailable conversions gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(convertUnit(5, 'cup', 'invalid')).toBe(5);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Conversion from cup to invalid not available'
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles zero quantities', () => {
      expect(convertUnit(0, 'cup', 'ml')).toBe(0);
    });

    it('handles decimal quantities', () => {
      expect(convertUnit(1.5, 'cup', 'ml')).toBe(360);
      expect(convertUnit(0.25, 'cup', 'tbsp')).toBe(4);
    });
  });

  describe('roundToUsefulFraction', () => {
    it('rounds to nearest quarter', () => {
      expect(roundToUsefulFraction(1.24)).toBe(1.25);
      expect(roundToUsefulFraction(2.26)).toBe(2.25);
    });

    it('rounds to nearest third', () => {
      expect(roundToUsefulFraction(1.32)).toBe(1.33);
      expect(roundToUsefulFraction(2.34)).toBe(2.33);
    });

    it('rounds to nearest half', () => {
      expect(roundToUsefulFraction(1.48)).toBe(1.5);
      expect(roundToUsefulFraction(2.52)).toBe(2.5);
    });

    it('rounds to nearest two-thirds', () => {
      expect(roundToUsefulFraction(1.65)).toBe(1.66);
      expect(roundToUsefulFraction(2.67)).toBe(2.66);
    });

    it('rounds to nearest three-quarters', () => {
      expect(roundToUsefulFraction(1.74)).toBe(1.75);
      expect(roundToUsefulFraction(2.76)).toBe(2.75);
    });

    it('returns integer when decimal part is very small', () => {
      expect(roundToUsefulFraction(1.02)).toBe(1);
      expect(roundToUsefulFraction(5.04)).toBe(5);
    });

    it('returns precise decimal when no close fraction', () => {
      expect(roundToUsefulFraction(1.45)).toBe(1.45);
      expect(roundToUsefulFraction(2.87)).toBe(2.87);
    });

    it('handles zero', () => {
      expect(roundToUsefulFraction(0)).toBe(0);
    });

    it('handles large numbers', () => {
      expect(roundToUsefulFraction(100.25)).toBe(100.25);
    });
  });

  describe('formatQuantity', () => {
    it('formats quarter fractions with Unicode symbols', () => {
      expect(formatQuantity(0.25)).toBe('¼');
      expect(formatQuantity(1.25)).toBe('1 ¼');
      expect(formatQuantity(2.25)).toBe('2 ¼');
    });

    it('formats third fractions with Unicode symbols', () => {
      expect(formatQuantity(0.33)).toBe('⅓');
      expect(formatQuantity(1.33)).toBe('1 ⅓');
    });

    it('formats half fractions with Unicode symbols', () => {
      expect(formatQuantity(0.5)).toBe('½');
      expect(formatQuantity(1.5)).toBe('1 ½');
      expect(formatQuantity(10.5)).toBe('10 ½');
    });

    it('formats two-thirds with Unicode symbols', () => {
      expect(formatQuantity(0.66)).toBe('⅔');
      expect(formatQuantity(2.66)).toBe('2 ⅔');
    });

    it('formats three-quarters with Unicode symbols', () => {
      expect(formatQuantity(0.75)).toBe('¾');
      expect(formatQuantity(1.75)).toBe('1 ¾');
    });

    it('formats whole numbers without fractions', () => {
      expect(formatQuantity(1)).toBe('1');
      expect(formatQuantity(5)).toBe('5');
      expect(formatQuantity(100)).toBe('100');
    });

    it('formats decimals without fraction equivalents', () => {
      expect(formatQuantity(1.45)).toBe('1.45');
      expect(formatQuantity(2.87)).toBe('2.87');
    });

    it('handles zero', () => {
      expect(formatQuantity(0)).toBe('0');
    });

    it('rounds before formatting', () => {
      expect(formatQuantity(1.24)).toBe('1 ¼');
      expect(formatQuantity(1.48)).toBe('1 ½');
      expect(formatQuantity(1.74)).toBe('1 ¾');
    });
  });

  describe('unitConversions object', () => {
    it('has volume conversions defined', () => {
      expect(unitConversions.cup).toBeDefined();
      expect(unitConversions.tbsp).toBeDefined();
      expect(unitConversions.tsp).toBeDefined();
      expect(unitConversions.ml).toBeDefined();
      expect(unitConversions.l).toBeDefined();
    });

    it('has weight conversions defined', () => {
      expect(unitConversions.kg).toBeDefined();
      expect(unitConversions.g).toBeDefined();
      expect(unitConversions.lb).toBeDefined();
      expect(unitConversions.oz).toBeDefined();
    });

    it('has correct cup conversions', () => {
      expect(unitConversions.cup.ml).toBe(240);
      expect(unitConversions.cup.tbsp).toBe(16);
      expect(unitConversions.cup.tsp).toBe(48);
    });

    it('has correct kilogram conversions', () => {
      expect(unitConversions.kg.g).toBe(1000);
      expect(unitConversions.kg.lb).toBeCloseTo(2.20462, 4);
    });
  });
});
