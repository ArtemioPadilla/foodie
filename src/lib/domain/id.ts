/**
 * Client-side ids for persisted records (`pantry_…`, `tracking_…`, `plan_…`).
 * Same shape the legacy contexts wrote, so old and new records sort together.
 */
export function generateId(prefix: string, now: number = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${now}_${random}`;
}
