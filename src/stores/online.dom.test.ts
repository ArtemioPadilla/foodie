// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Browser-side behaviour of `stores/online.ts` (roadmap Issue 028): on mount the
 * store adopts `navigator.onLine`, then follows the window `online` / `offline`
 * events. The e2e offline journey drives the banner through the `offline`
 * event because Playwright's offline emulation does not flip
 * `navigator.onLine` on every runner (PR #36), so the initial read is pinned
 * here instead.
 */
async function freshStore() {
  vi.resetModules();
  return (await import('./online')).$online;
}

function mockOnLine(value: boolean) {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('$online in the browser', () => {
  it('adopts navigator.onLine=false when the first subscriber mounts', async () => {
    mockOnLine(false);
    const $online = await freshStore();
    const off = $online.listen(() => {});
    expect($online.get()).toBe(false);
    off();
  });

  it('follows the offline and online window events', async () => {
    mockOnLine(true);
    const $online = await freshStore();
    const off = $online.listen(() => {});
    expect($online.get()).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect($online.get()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect($online.get()).toBe(true);
    off();
  });

  it('stops listening once the last subscriber leaves', async () => {
    mockOnLine(true);
    const $online = await freshStore();
    const off = $online.listen(() => {});
    off();
    // nanostores unmounts after a short delay; let it run.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    window.dispatchEvent(new Event('offline'));
    expect($online.get()).toBe(true);
  });
});
