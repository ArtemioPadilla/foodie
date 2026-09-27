// Unit conversion utilities for recipe scaling

interface UnitConversionMap {
  [unit: string]: {
    [targetUnit: string]: number;
  };
}

export const unitConversions: UnitConversionMap = {
  // Volume conversions
  cup: {
    ml: 240,
    l: 0.24,
    tbsp: 16,
    tsp: 48,
    'fl oz': 8,
  },
  tbsp: {
    ml: 15,
    tsp: 3,
    cup: 1 / 16,
  },
  tsp: {
    ml: 5,
    tbsp: 1 / 3,
    cup: 1 / 48,
  },
  ml: {
    l: 0.001,
    cup: 1 / 240,
    tbsp: 1 / 15,
    tsp: 1 / 5,
  },
  l: {
    ml: 1000,
    cup: 4.167,
  },

  // Weight conversions
  kg: {
    g: 1000,
    lb: 2.20462,
    oz: 35.274,
  },
  g: {
    kg: 0.001,
    oz: 0.035274,
    lb: 0.00220462,
  },
  lb: {
    kg: 0.453592,
    g: 453.592,
    oz: 16,
  },
  oz: {
    g: 28.3495,
    lb: 1 / 16,
    kg: 0.0283495,
  },
};

export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) {
    return quantity;
  }

  const conversion = unitConversions[fromUnit]?.[toUnit];
  if (conversion === undefined) {
    console.warn(`Conversion from ${fromUnit} to ${toUnit} not available`);
    return quantity;
  }

  return quantity * conversion;
}

export function roundToUsefulFraction(value: number): number {
  // Round to common fractions for better recipe readability
  const fractions = [0.25, 0.33, 0.5, 0.66, 0.75];
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;

  if (decimalPart < 0.05) {
    return integerPart;
  }

  const closestFraction = fractions.reduce((prev, curr) =>
    Math.abs(curr - decimalPart) < Math.abs(prev - decimalPart) ? curr : prev
  );

  if (Math.abs(closestFraction - decimalPart) < 0.08) {
    return integerPart + closestFraction;
  }

  return Math.round(value * 100) / 100;
}

export function formatQuantity(quantity: number): string {
  const rounded = roundToUsefulFraction(quantity);

  // Convert decimals to fractions for display
  const fractionMap: { [key: number]: string } = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.66: '⅔',
    0.75: '¾',
  };

  const integerPart = Math.floor(rounded);
  const decimalPart = rounded - integerPart;

  if (decimalPart === 0) {
    return integerPart.toString();
  }

  const fractionString = fractionMap[decimalPart];
  if (fractionString) {
    return integerPart > 0 ? `${integerPart} ${fractionString}` : fractionString;
  }

  return rounded.toString();
}
