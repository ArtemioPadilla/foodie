/**
 * Unit conversion + quantity formatting for recipe scaling (roadmap Issue 014,
 * port of legacy `utils/unitConversions.ts` and the pure half of
 * `hooks/useUnitConversion.ts`). No UI, no storage: the hook in
 * `use-unit-conversion.ts` wires these to `$preferences`.
 */
import type { UnitSystem } from '@/schemas';

export type UnitConversionMap = Record<string, Record<string, number>>;

/** Factor to multiply a quantity in `from` by to get `to` (`unitConversions[from][to]`). */
export const unitConversions: UnitConversionMap = {
  // Volume
  cup: { ml: 240, l: 0.24, tbsp: 16, tsp: 48, 'fl oz': 8 },
  tbsp: { ml: 15, tsp: 3, cup: 1 / 16 },
  tsp: { ml: 5, tbsp: 1 / 3, cup: 1 / 48 },
  ml: { l: 0.001, cup: 1 / 240, tbsp: 1 / 15, tsp: 1 / 5 },
  l: { ml: 1000, cup: 4.167 },
  // Weight
  kg: { g: 1000, lb: 2.20462, oz: 35.274 },
  g: { kg: 0.001, oz: 0.035274, lb: 0.00220462 },
  lb: { kg: 0.453592, g: 453.592, oz: 16 },
  oz: { g: 28.3495, lb: 1 / 16, kg: 0.0283495 },
};

/**
 * Convert `quantity` from one unit to another. Unknown pairs return the input
 * unchanged (and warn, as legacy did) so a recipe never loses a quantity.
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  const factor = unitConversions[fromUnit]?.[toUnit];
  if (factor === undefined) {
    console.warn(`Conversion from ${fromUnit} to ${toUnit} not available`);
    return quantity;
  }
  return quantity * factor;
}

const USEFUL_FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75] as const;

/** Snap to ¼ ⅓ ½ ⅔ ¾ when within 0.08; drop fractions below 0.05; else 2 decimals. */
export function roundToUsefulFraction(value: number): number {
  const integerPart = Math.floor(value);
  const decimalPart = value - integerPart;
  if (decimalPart < 0.05) return integerPart;

  const closest = USEFUL_FRACTIONS.reduce((prev, curr) =>
    Math.abs(curr - decimalPart) < Math.abs(prev - decimalPart) ? curr : prev,
  );
  if (Math.abs(closest - decimalPart) < 0.08) return integerPart + closest;
  return Math.round(value * 100) / 100;
}

const FRACTION_GLYPHS: Record<number, string> = {
  0.25: '¼',
  0.33: '⅓',
  0.5: '½',
  0.66: '⅔',
  0.75: '¾',
};

/** `1.5` → `"1 ½"`, `0.25` → `"¼"`, `2` → `"2"`, `2.87` → `"2.87"`. */
export function formatQuantity(quantity: number): string {
  const rounded = roundToUsefulFraction(quantity);
  const integerPart = Math.floor(rounded);
  const decimalPart = rounded - integerPart;
  if (decimalPart === 0) return integerPart.toString();

  const glyph = FRACTION_GLYPHS[decimalPart];
  if (glyph) return integerPart > 0 ? `${integerPart} ${glyph}` : glyph;
  return rounded.toString();
}

// ── Unit systems (pure half of the legacy `useUnitConversion` hook) ───────────

/** A concrete system — `auto` resolved. */
export type ResolvedUnitSystem = Exclude<UnitSystem, 'auto'>;

const METRIC_TARGETS: Record<string, string> = {
  lb: 'kg',
  oz: 'g',
  cup: 'ml',
  tbsp: 'ml',
  tsp: 'ml',
  'fl oz': 'ml',
};

const IMPERIAL_TARGETS: Record<string, string> = {
  kg: 'lb',
  g: 'oz',
  ml: 'cup',
  l: 'cup',
};

/** Regions that still cook in imperial units (US, Liberia, Myanmar). */
const IMPERIAL_LANGUAGE_TAGS = ['en-US', 'en-LR', 'en-MM'];

/**
 * Map a BCP-47 language tag to the unit system it implies. Pure: callers pass
 * `navigator.language` from an effect (never during render — islands get
 * `lang` as a prop) or a stored preference such as `preferences.language`.
 */
export function detectUnitSystemFromLocale(languageTag: string | undefined): ResolvedUnitSystem {
  if (!languageTag) return 'metric';
  return IMPERIAL_LANGUAGE_TAGS.includes(languageTag) ? 'imperial' : 'metric';
}

/** `auto` falls back to `detected`; an explicit `override` wins over everything. */
export function resolveUnitSystem(
  preference: UnitSystem,
  detected: ResolvedUnitSystem = 'metric',
  override?: ResolvedUnitSystem,
): ResolvedUnitSystem {
  if (override) return override;
  return preference === 'auto' ? detected : preference;
}

export type UnitConversionResult = {
  quantity: number;
  unit: string;
  formatted: string;
};

/**
 * Express `quantity unit` in `system`. Units that are already in the system,
 * or that have no counterpart (`piece`, `pinch`…), pass through unchanged.
 */
export function toPreferredUnit(
  quantity: number,
  unit: string,
  system: ResolvedUnitSystem,
): UnitConversionResult {
  const targets = system === 'metric' ? METRIC_TARGETS : IMPERIAL_TARGETS;
  const targetUnit = targets[unit];
  if (!targetUnit) return { quantity, unit, formatted: formatQuantity(quantity) };
  const converted = convertUnit(quantity, unit, targetUnit);
  return { quantity: converted, unit: targetUnit, formatted: formatQuantity(converted) };
}
