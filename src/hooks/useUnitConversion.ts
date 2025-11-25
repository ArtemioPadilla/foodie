import { useCallback, useMemo } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { convertUnit, formatQuantity } from '@utils/unitConversions';

export type UnitSystem = 'metric' | 'imperial';

interface ConversionResult {
  quantity: number;
  unit: string;
  formatted: string;
}

interface UseUnitConversionReturn {
  convert: (quantity: number, unit: string) => ConversionResult;
  preferredSystem: UnitSystem;
  detectSystemFromLocale: () => UnitSystem;
}

// Map of units that should be converted for each system
const metricTargets: Record<string, string> = {
  lb: 'kg',
  oz: 'g',
  cup: 'ml',
  tbsp: 'ml',
  tsp: 'ml',
  'fl oz': 'ml',
};

const imperialTargets: Record<string, string> = {
  kg: 'lb',
  g: 'oz',
  ml: 'cup',
  l: 'cup',
};

// Locales that traditionally use imperial units
const imperialLocales = ['en-US', 'en-LR', 'en-MM']; // US, Liberia, Myanmar

/**
 * Hook for converting ingredient units between metric and imperial systems
 *
 * @param overrideSystem - Optional override for the unit system (useful for per-recipe toggle)
 * @returns Conversion function and current preferred system
 *
 * @example
 * const { convert, preferredSystem } = useUnitConversion();
 * const { quantity, unit, formatted } = convert(1, 'lb');
 * // If metric: { quantity: 0.453592, unit: 'kg', formatted: '½' }
 */
export function useUnitConversion(overrideSystem?: UnitSystem): UseUnitConversionReturn {
  const { user } = useAuth();

  // Detect system from browser locale
  const detectSystemFromLocale = useCallback((): UnitSystem => {
    const locale = navigator.language;
    return imperialLocales.some(l => locale.startsWith(l.split('-')[0]) && locale === l)
      ? 'imperial'
      : 'metric';
  }, []);

  // Determine the preferred system
  const preferredSystem = useMemo((): UnitSystem => {
    // Override takes precedence
    if (overrideSystem) {
      return overrideSystem;
    }

    // User preference
    const userPref = user?.preferences?.unitSystem;
    if (userPref && userPref !== 'auto') {
      return userPref;
    }

    // Auto-detect from locale
    return detectSystemFromLocale();
  }, [overrideSystem, user?.preferences?.unitSystem, detectSystemFromLocale]);

  // Convert a quantity/unit to the preferred system
  const convert = useCallback((quantity: number, unit: string): ConversionResult => {
    const targets = preferredSystem === 'metric' ? metricTargets : imperialTargets;
    const targetUnit = targets[unit];

    // No conversion needed - unit is already in preferred system or not convertible
    if (!targetUnit) {
      return {
        quantity,
        unit,
        formatted: formatQuantity(quantity),
      };
    }

    const convertedQuantity = convertUnit(quantity, unit, targetUnit);

    return {
      quantity: convertedQuantity,
      unit: targetUnit,
      formatted: formatQuantity(convertedQuantity),
    };
  }, [preferredSystem]);

  return {
    convert,
    preferredSystem,
    detectSystemFromLocale,
  };
}

export default useUnitConversion;
