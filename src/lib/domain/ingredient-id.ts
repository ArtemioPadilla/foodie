/**
 * Ingredient-id helpers for custom shopping items (roadmap Issue 026, port of
 * `utils/ingredientUtils.ts` from PR #28 on `feat/tracking`).
 *
 * A custom item — typed by the user in the shopping list's "Add item" dialog —
 * has no catalog id, so it gets `custom-<uuid>-<slug>`: the `custom-` prefix
 * marks it (never collides with catalog ids, which are `ing_NNN`), the UUID
 * keeps two "milk" lines apart, and the slug keeps the id readable in exports
 * and as a last-resort label. PR #28 wrote `custom_<uuid>_<name>`; both shapes
 * are recognised so any list saved from that branch still reads well.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** `custom-<uuid>-` (Issue 026) or PR #28's `custom_<uuid or timestamp_random>_`. */
const CUSTOM_PREFIX = new RegExp(`^custom-${UUID}-|^custom_(?:${UUID}|\\d+_[a-z0-9]+|[a-f0-9-]+)_`, 'i');

export const CUSTOM_ID_PREFIX = 'custom-';

/** `"Oat milk"` → `"oat-milk"`; accents dropped, anything else non-alphanumeric → `-`. */
export function slugifyItemName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // `crypto.randomUUID` needs a secure context (https / localhost); a plain
  // http origin still has `crypto.getRandomValues`, so build the RFC 4122 v4
  // UUID from 16 CSPRNG bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A fresh id for a custom item: `custom-<uuid>-<slug of name>`. */
export function makeCustomIngredientId(name: string, uuid: string = randomUuid()): string {
  return `${CUSTOM_ID_PREFIX}${uuid}-${slugifyItemName(name)}`;
}

/** True for ids minted by `makeCustomIngredientId` or by PR #28 (`custom_…`). */
export function isCustomIngredient(ingredientId: string): boolean {
  return /^custom[-_]/i.test(ingredientId);
}

/**
 * Strip the custom prefix + unique part, leaving the name slug
 * (`custom-<uuid>-oat-milk` → `oat-milk`, `custom_<uuid>_milk` → `milk`).
 * Any other id comes back unchanged.
 */
export function cleanIngredientId(ingredientId: string): string {
  return ingredientId.replace(CUSTOM_PREFIX, '');
}
