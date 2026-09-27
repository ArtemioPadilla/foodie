// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Browser-side behaviour of `stores/theme.ts` (roadmap Issue 013: "$theme del
 * template + respeto a prefers-color-scheme"). `theme.test.ts` covers the pure
 * atom in Node; here every case re-imports the module so its eager
 * initialisation runs against a fresh DOM + localStorage.
 */

type Listener = (event: { matches: boolean }) => void;

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  vi.spyOn(window, 'matchMedia').mockImplementation(() => mql as unknown as MediaQueryList);
  return {
    fire(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
  };
}

async function loadTheme() {
  vi.resetModules();
  return import('./theme');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('initial value', () => {
  it('follows prefers-color-scheme: dark the first time (nothing stored)', async () => {
    mockMatchMedia(true);
    const { $theme, readStoredTheme } = await loadTheme();
    expect(readStoredTheme()).toBeNull();
    expect($theme.get()).toBe('dark');
  });

  it('is light when nothing is stored and the OS prefers light', async () => {
    mockMatchMedia(false);
    const { $theme } = await loadTheme();
    expect($theme.get()).toBe('light');
  });

  it('an explicit localStorage.theme wins over the OS', async () => {
    mockMatchMedia(true);
    localStorage.setItem('theme', 'light');
    const { $theme } = await loadTheme();
    expect($theme.get()).toBe('light');
  });

  it('trusts the .dark class the inline head script already applied', async () => {
    mockMatchMedia(false);
    document.documentElement.classList.add('dark');
    const { $theme } = await loadTheme();
    expect($theme.get()).toBe('dark');
  });
});

describe('set / toggle', () => {
  it('set() applies the <html> class and persists before any subscriber exists', async () => {
    mockMatchMedia(false);
    const { $theme, setTheme } = await loadTheme();
    setTheme('dark');
    expect($theme.get()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('toggleTheme flips the resolved value', async () => {
    mockMatchMedia(true);
    const { $theme, toggleTheme } = await loadTheme();
    toggleTheme();
    expect($theme.get()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('followSystemTheme clears the stored choice and applies the OS theme', async () => {
    mockMatchMedia(true);
    const { $theme, followSystemTheme, resolveSystemTheme } = await loadTheme();
    $theme.set('light');
    expect(followSystemTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
    expect($theme.get()).toBe('dark');
    expect(resolveSystemTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('while mounted', () => {
  it('follows prefers-color-scheme changes only when no choice is stored', async () => {
    const media = mockMatchMedia(false);
    const { $theme } = await loadTheme();
    const unbind = $theme.subscribe(() => {});
    media.fire(true);
    expect($theme.get()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    $theme.set('light'); // explicit choice → the OS no longer drives the theme
    media.fire(true);
    expect($theme.get()).toBe('light');
    unbind();
  });

  it('mirrors another tab via the storage event', async () => {
    mockMatchMedia(false);
    const { $theme } = await loadTheme();
    const unbind = $theme.subscribe(() => {});
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));
    expect($theme.get()).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull(); // not echoed back
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: null }));
    expect($theme.get()).toBe('light');
    unbind();
  });
});
