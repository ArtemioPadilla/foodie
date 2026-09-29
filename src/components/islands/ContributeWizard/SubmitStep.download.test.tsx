// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $contributeDraft, clearContributeDraft } from '@/stores/contribute-draft';
import { NOW, installCatalogFetch, onStep, renderWizard, seedDraft } from '@/tests/fixtures/contribute-wizard';

/**
 * Step 7 in the default build (ADR 0015): PUBLIC_REPO_SLUG is unset, so there
 * is no issue to open. The step keeps the JSON download, explains in neutral,
 * translated words that submissions by link are not open yet, and shows no
 * Submit button — never a dead one.
 */
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

describe.runIf(!import.meta.env.PUBLIC_REPO_SLUG)('ContributeWizard · submit step without a repository', () => {
  it.each([
    ['en', 'Sending by link is not available yet'],
    ['es', 'El envío por enlace aún no está disponible'],
    ['fr', 'L’envoi par lien n’est pas encore disponible'],
  ] as const)('%s: download only, translated notice, no Submit button and no GitHub link', async (lang, title) => {
    seedDraft('submit');
    const { user } = renderWizard(lang);
    await onStep('submit');
    const step = screen.getByTestId('contribute-step-submit');
    expect(step).toHaveAttribute('data-submit-mode', 'download');
    expect(screen.getByTestId('contribute-submit-unavailable')).toHaveTextContent(title);
    expect(screen.getByTestId('contribute-submit-unavailable')).toHaveTextContent(`recipe-${RECIPE_ID}.json`);
    expect(screen.queryByTestId('contribute-submit')).toBeNull();
    // No link to GitHub anywhere in the step: compare every URL's hostname exactly.
    const hosts = Array.from(step.querySelectorAll('[href], [src], [action]')).map(
      (el) => new URL(el.getAttribute('href') ?? el.getAttribute('src') ?? el.getAttribute('action') ?? '', 'https://eat.cybere.co').hostname,
    );
    expect(hosts.filter((host) => host === 'github.com' || host.endsWith('.github.com'))).toEqual([]);
    expect((step.textContent ?? '').toLowerCase()).not.toContain('github');

    await user.click(screen.getByTestId('contribute-download-json'));
    await waitFor(() => expect(downloads).toEqual([`recipe-${RECIPE_ID}.json`]));
    expect(open).not.toHaveBeenCalled();
    // The draft stays on the device: nothing was sent anywhere.
    expect($contributeDraft.get()).toBeDefined();
  });
});
