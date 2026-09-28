// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import { NOW, installCatalogFetch, onStep, renderWizard, seedDraft, validSubmission } from '@/tests/fixtures/contribute-wizard';

/** Step 7 — sending without secrets: JSON download + prefilled issue (roadmap Issue 039). */
const RECIPE_ID = `green-chicken-skillet-${NOW.getTime().toString(36)}`;

let open: ReturnType<typeof vi.fn>;
let downloads: string[];

beforeEach(() => {
  clearContributeDraft();
  localStorage.clear();
  installCatalogFetch();
  open = vi.fn(() => null);
  vi.stubGlobal('open', open);
  downloads = [];
  URL.createObjectURL = vi.fn(() => 'blob:recipe');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ContributeWizard · submit step', () => {
  it('Submit opens the prefilled recipe-submission issue, downloads the JSON and clears the draft', async () => {
    seedDraft('submit');
    const { user } = renderWizard('en');
    await onStep('submit');
    const step = screen.getByTestId('contribute-step-submit');
    expect(step).toHaveAttribute('data-json-in-url', 'true');
    expect(screen.getByTestId('contribute-submit-steps')).toHaveTextContent(`recipe-${RECIPE_ID}.json`);
    expect(screen.queryByTestId('contribute-submit-attach')).toBeNull();

    await user.click(screen.getByTestId('contribute-submit'));

    expect(open).toHaveBeenCalledTimes(1);
    const [url, target, features] = open.mock.calls[0] as [string, string, string];
    expect(target).toBe('_blank');
    expect(features).toContain('noopener');
    expect(url).toMatch(/^https:\/\/github\.com\/ArtemioPadilla\/foodie\/issues\/new\?template=recipe-submission\.yml&/);
    const params = new URL(url).searchParams;
    expect(params.get('recipe-name')).toBe('Green Chicken Skillet');
    expect(JSON.parse(params.get('recipe-json') ?? '{}')).toMatchObject({ id: RECIPE_ID, type: 'dinner' });
    expect(downloads).toEqual([`recipe-${RECIPE_ID}.json`]);

    await waitFor(() => expect(step).toHaveAttribute('data-sent', 'true'));
    expect(screen.getByTestId('contribute-issue-link')).toHaveAttribute('href', url);
    expect($contributeDraft.get()).toBeUndefined();
    expect(localStorage.getItem('foodie:contribute-draft')).toBeNull();
  });

  it('asks to attach the file when the recipe is too long for the link', async () => {
    const long = 'Stir slowly and keep tasting as you go, adjusting salt and acidity. '.repeat(20);
    seedDraft('submit', validSubmission({ instructions: Array.from({ length: 12 }, () => long) }));
    const { user } = renderWizard('es');
    await onStep('submit');
    expect(screen.getByTestId('contribute-step-submit')).toHaveAttribute('data-json-in-url', 'false');
    expect(screen.getByTestId('contribute-submit-attach')).toHaveTextContent(`recipe-${RECIPE_ID}.json`);
    await user.click(screen.getByTestId('contribute-submit'));
    const url = open.mock.calls[0]?.[0] as string;
    expect(url.length).toBeLessThanOrEqual(8192);
    expect(new URL(url).searchParams.get('recipe-json')).toContain(`recipe-${RECIPE_ID}.json`);
  });

  it('Download JSON saves the file without opening GitHub', async () => {
    seedDraft('submit');
    const { user } = renderWizard('fr');
    await onStep('submit');
    await user.click(screen.getByTestId('contribute-download-json'));
    await waitFor(() => expect(downloads).toEqual([`recipe-${RECIPE_ID}.json`]));
    expect(open).not.toHaveBeenCalled();
    expect($contributeDraft.get()).toBeDefined();
  });
});
