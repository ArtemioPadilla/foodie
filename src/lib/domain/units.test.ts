import { describe, expect, it, vi } from 'vitest';
import {
  convertUnit,
  detectUnitSystemFromLocale,
  formatQuantity,
  resolveUnitSystem,
  roundToUsefulFraction,
  toPreferredUnit,
  unitConversions,
} from './units';

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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(convertUnit(5, 'cup', 'invalid')).toBe(5);
    expect(warn).toHaveBeenCalledWith('Conversion from cup to invalid not available');
    warn.mockRestore();
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
    expect(roundToUsefulFraction(1.65)).toBeCloseTo(1.66, 2);
    expect(roundToUsefulFraction(2.67)).toBeCloseTo(2.66, 2);
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
    expect(roundToUsefulFraction(1.45)).toBe(1.5); // within the 0.08 tolerance of ½
    expect(roundToUsefulFraction(2.87)).toBe(2.87); // not close to any common fraction
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
    expect(formatQuantity(1.33)).toBe('1.33'); // 1.33 - 1 ≠ 0.33 in floating point → decimal
  });

  it('formats half fractions with Unicode symbols', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.5)).toBe('1 ½');
    expect(formatQuantity(10.5)).toBe('10 ½');
  });

  it('formats two-thirds with Unicode symbols', () => {
    expect(formatQuantity(0.66)).toBe('⅔');
    expect(formatQuantity(2.66)).toBe('2.66');
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
    expect(formatQuantity(1.45)).toBe('1 ½');
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
    expect(unitConversions.cup!.ml).toBe(240);
    expect(unitConversions.cup!.tbsp).toBe(16);
    expect(unitConversions.cup!.tsp).toBe(48);
  });

  it('has correct kilogram conversions', () => {
    expect(unitConversions.kg!.g).toBe(1000);
    expect(unitConversions.kg!.lb).toBeCloseTo(2.20462, 4);
  });
});

// ── Unit systems (pure half of the legacy hook) ───────────────────────────────

describe('detectUnitSystemFromLocale', () => {
  it('is imperial only for en-US / en-LR / en-MM', () => {
    expect(detectUnitSystemFromLocale('en-US')).toBe('imperial');
    expect(detectUnitSystemFromLocale('en-LR')).toBe('imperial');
    expect(detectUnitSystemFromLocale('en-GB')).toBe('metric');
    expect(detectUnitSystemFromLocale('es-MX')).toBe('metric');
    expect(detectUnitSystemFromLocale('fr')).toBe('metric');
  });

  it('defaults to metric when the tag is unknown (SSR)', () => {
    expect(detectUnitSystemFromLocale(undefined)).toBe('metric');
  });
});

describe('resolveUnitSystem', () => {
  it('uses the explicit preference, resolves auto from the detected system, and lets an override win', () => {
    expect(resolveUnitSystem('imperial', 'metric')).toBe('imperial');
    expect(resolveUnitSystem('auto', 'imperial')).toBe('imperial');
    expect(resolveUnitSystem('auto')).toBe('metric');
    expect(resolveUnitSystem('auto', 'imperial', 'metric')).toBe('metric');
  });
});

describe('toPreferredUnit', () => {
  it('converts imperial measures to metric with a formatted string', () => {
    expect(toPreferredUnit(1, 'lb', 'metric')).toEqual({
      quantity: 0.453592,
      unit: 'kg',
      formatted: '½',
    });
    expect(toPreferredUnit(1, 'cup', 'metric').unit).toBe('ml');
  });

  it('converts metric measures to imperial', () => {
    const r = toPreferredUnit(500, 'g', 'imperial');
    expect(r.unit).toBe('oz');
    expect(r.quantity).toBeCloseTo(17.637, 2);
  });

  it('passes through units already in the system or without a counterpart', () => {
    expect(toPreferredUnit(2, 'kg', 'metric')).toEqual({ quantity: 2, unit: 'kg', formatted: '2' });
    expect(toPreferredUnit(3, 'piece', 'imperial')).toEqual({
      quantity: 3,
      unit: 'piece',
      formatted: '3',
    });
  });
});
