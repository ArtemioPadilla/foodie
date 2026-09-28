import { CustomPricesSchema, type CustomPrices } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';

/**
 * The user's own ingredient prices (roadmap Issue 041, port of PR #28's
 * `IngredientContext` custom prices, which used `customIngredientPrices`).
 *
 * `{ [ingredientId]: { price, currency } }` — price per the ingredient's
 * recipe unit, in the currency it was typed in, so switching
 * `$preferences.currency` never silently re-labels a number
 * (`lib/domain/cost.ts` only uses prices in the current currency). New key,
 * device-level like the rest of the guest data (ADR 0002 "New keys").
 */
export const CUSTOM_PRICES_KEY = 'foodie:custom-prices';

export const $customPrices = persistentAtom<CustomPrices>(CUSTOM_PRICES_KEY, CustomPricesSchema, {}, {
  onQuotaExceeded: notifyQuotaExceeded,
});

/**
 * Set a custom price. Returns `false` (and changes nothing) for anything but a
 * positive finite number — PR #28's `setIngredientPrice` validation.
 */
export function setCustomPrice(ingredientId: string, price: number, currency: string): boolean {
  if (!ingredientId || !Number.isFinite(price) || price <= 0) return false;
  $customPrices.set({ ...$customPrices.get(), [ingredientId]: { price, currency } });
  return true;
}

/** Back to the catalog price for one ingredient. */
export function resetCustomPrice(ingredientId: string): void {
  const current = $customPrices.get();
  if (!(ingredientId in current)) return;
  const { [ingredientId]: _removed, ...rest } = current;
  $customPrices.set(rest);
}

/** Back to the catalog price for every ingredient. */
export function resetAllCustomPrices(): void {
  $customPrices.set({});
}
