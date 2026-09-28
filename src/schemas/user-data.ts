/**
 * "Export my data" file (roadmap Issue 036, ADR 0002 §4) — the one JSON a
 * user can download from `/profile`: every Foodie store's current value,
 * keyed by its `localStorage` key, plus the other Foodie keys found on this
 * device (guest and per-account variants). It crosses a boundary (a file the
 * user keeps and may re-import some day), hence a Zod schema.
 */
import { z } from 'zod';

export const USER_DATA_EXPORT_FORMAT = 'foodie-user-data';

export const UserDataExportSchema = z.object({
  format: z.literal(USER_DATA_EXPORT_FORMAT),
  version: z.literal(1),
  /** ISO datetime of the export. */
  exportedAt: z.string(),
  /** The signed-in identity the export was made under, or `null` for a guest. */
  account: z
    .object({
      uid: z.string().min(1),
      email: z.string().nullable(),
      displayName: z.string().nullable(),
    })
    .nullable(),
  /** `localStorage` key → parsed value (raw string when the value is not JSON). */
  data: z.record(z.string(), z.unknown()),
});
export type UserDataExport = z.infer<typeof UserDataExportSchema>;
