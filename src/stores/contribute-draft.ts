import { computed } from 'nanostores';
import {
  CONTRIBUTE_STEPS,
  ContributeDraftSchema,
  RecipeSubmissionDraftDataSchema,
  type ContributeDraft,
} from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';

/**
 * The contribute wizard's in-progress draft (roadmap Issue 038; ADR 0002
 * "New keys planned by the roadmap" → `foodie:contribute-draft`, category
 * "Draft content"). Only the form's own fields and the step are stored —
 * no contributor name, no credential. "Clear my data" on `/profile` removes
 * it with every other `foodie:*` key; "Start over" in the wizard removes it.
 */
export const CONTRIBUTE_DRAFT_KEY = 'foodie:contribute-draft';

export const $contributeDraft = persistentAtom<ContributeDraft | undefined>(
  CONTRIBUTE_DRAFT_KEY,
  ContributeDraftSchema.optional(),
  undefined,
  { onQuotaExceeded: notifyQuotaExceeded },
);

/**
 * Save the form values and step. Values that do not fit the draft shape
 * (e.g. a `NaN` from a half-typed number) are not written, so the last good
 * draft survives. Returns whether the draft was written.
 */
export function saveContributeDraft(step: number, data: unknown, now: Date = new Date()): boolean {
  const parsed = RecipeSubmissionDraftDataSchema.safeParse(data);
  if (!parsed.success) return false;
  const clamped = Math.min(Math.max(0, Math.trunc(step)), CONTRIBUTE_STEPS.length - 1);
  $contributeDraft.set({ version: 1, step: clamped, data: parsed.data, updatedAt: now.toISOString() });
  return true;
}

/**
 * Whether a draft exists. A derived boolean, so the wizard re-renders only
 * when a draft appears or is discarded — not on every autosave.
 */
export const $hasContributeDraft = computed($contributeDraft, (draft) => draft !== undefined);

/** Forget the draft (removes the `localStorage` key). */
export function clearContributeDraft(): void {
  $contributeDraft.set(undefined);
}
