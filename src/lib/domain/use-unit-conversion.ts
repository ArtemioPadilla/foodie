/**
 * `useUnitConversion` (roadmap Issue 014, port of legacy
 * `hooks/useUnitConversion.ts`). Reads the unit-system preference from
 * `$preferences` (nanostores) instead of `useAuth()`, so any island can use it
 * without a shared React Context.
 *
 * `auto` is resolved from `navigator.language` through the template's
 * `useClientPreference` (a `useSyncExternalStore` with a server snapshot), so
 * SSR and the hydration render see `metric` and the browser value only lands
 * after hydration — no `navigator` read during render, no mismatch.
 */
import { useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { useClientPreference } from '@/lib/use-client-preference';
import { $unitSystem } from '@/stores/preferences';
import type { UnitSystem } from '@/schemas';
import {
  detectUnitSystemFromLocale,
  resolveUnitSystem,
  toPreferredUnit,
  type ResolvedUnitSystem,
  type UnitConversionResult,
} from './units';

export type UseUnitConversionReturn = {
  /** Express `quantity unit` in the preferred system, with a display string. */
  convert: (quantity: number, unit: string) => UnitConversionResult;
  /** The system actually in use (`auto` resolved). */
  preferredSystem: ResolvedUnitSystem;
  /** What the user chose (`metric` | `imperial` | `auto`). */
  unitSystemPreference: UnitSystem;
  /** The system implied by the browser locale (`metric` until hydrated). */
  detectedSystem: ResolvedUnitSystem;
};

// Defined at module level: `useClientPreference` needs a stable snapshot reader.
const readNavigatorLanguage = (): string | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.language;

/**
 * @param overrideSystem Per-view override (e.g. a recipe page's metric/imperial
 *   toggle); wins over the stored preference.
 */
export function useUnitConversion(overrideSystem?: ResolvedUnitSystem): UseUnitConversionReturn {
  const unitSystemPreference = useStore($unitSystem);
  const languageTag = useClientPreference(readNavigatorLanguage, undefined);
  const detectedSystem = detectUnitSystemFromLocale(languageTag);
  const preferredSystem = resolveUnitSystem(unitSystemPreference, detectedSystem, overrideSystem);

  const convert = useCallback(
    (quantity: number, unit: string) => toPreferredUnit(quantity, unit, preferredSystem),
    [preferredSystem],
  );

  return { convert, preferredSystem, unitSystemPreference, detectedSystem };
}
