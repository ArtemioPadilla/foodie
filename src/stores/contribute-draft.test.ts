// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_RECIPE_SUBMISSION } from '@/schemas';
import { makeRecipeSubmission } from '@/tests/fixtures/foodie-domain';
import { isFoodieKey } from '@/lib/user-data';
import { $contributeDraft, CONTRIBUTE_DRAFT_KEY, clearContributeDraft, saveContributeDraft } from './contribute-draft';

const stored = () => {
  const raw = localStorage.getItem(CONTRIBUTE_DRAFT_KEY);
  return raw === null ? null : JSON.parse(raw);
};

beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
});

describe('$contributeDraft (foodie:contribute-draft, ADR 0002)', () => {
  it('is a Foodie key, so /profile export and "Clear my data" cover it', () => {
    expect(CONTRIBUTE_DRAFT_KEY).toBe('foodie:contribute-draft');
    expect(isFoodieKey(CONTRIBUTE_DRAFT_KEY)).toBe(true);
  });

  it('saves the step and the form values with a timestamp', () => {
    const now = new Date('2026-09-28T10:00:00Z');
    expect(saveContributeDraft(2, EMPTY_RECIPE_SUBMISSION, now)).toBe(true);
    expect(stored()).toEqual({
      version: 1,
      step: 2,
      data: JSON.parse(JSON.stringify(EMPTY_RECIPE_SUBMISSION)),
      updatedAt: now.toISOString(),
    });
    expect($contributeDraft.get()?.step).toBe(2);
  });

  it('keeps the last good draft when the values do not fit (NaN, wrong types) and clamps the step', () => {
    saveContributeDraft(1, makeRecipeSubmission());
    expect(saveContributeDraft(3, { ...makeRecipeSubmission(), prepTime: 'soon' })).toBe(false);
    expect(stored().step).toBe(1);
    saveContributeDraft(42, makeRecipeSubmission());
    expect(stored().step).toBe(6);
  });

  it('stores only the form fields (no stray keys such as a contributor name or token)', () => {
    saveContributeDraft(0, { ...EMPTY_RECIPE_SUBMISSION, author: 'Ada', token: 'secret' });
    expect(Object.keys(stored().data)).not.toContain('author');
    expect(Object.keys(stored().data)).not.toContain('token');
  });

  it('"start over" removes the key', () => {
    saveContributeDraft(0, EMPTY_RECIPE_SUBMISSION);
    clearContributeDraft();
    expect(localStorage.getItem(CONTRIBUTE_DRAFT_KEY)).toBeNull();
    expect($contributeDraft.get()).toBeUndefined();
  });
});
