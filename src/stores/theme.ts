import { atom, onMount } from 'nanostores';

export type Theme = 'light' | 'dark';

/** Legacy `ThemeContext` key, kept verbatim (ADR 0002, key 1). */
export const THEME_KEY = 'theme';

/**
 * Cross-island theme store. The inline <script is:inline> in BaseLayout.astro
 * is what applies the .dark class before first paint (zero-flash); this store
 * is the post-hydration source of truth that any island can read or write.
 *
 * Lifecycle:
 *   1. Page loads → inline script reads localStorage.theme (or system pref) and
 *      adds .dark to <html> before paint.
 *   2. Modules load → `$theme` starts from the actual `<html>` class (which the
 *      inline script already set), falling back to `localStorage.theme` and
 *      then to `prefers-color-scheme` (roadmap §2: "respeto a
 *      prefers-color-scheme la primera vez").
 *   3. Every `set()` keeps the `<html>` class and `localStorage.theme` in sync
 *      immediately — also when it runs from a store action with no subscriber
 *      yet (e.g. `stores/preferences.ts`), not only after an island mounts.
 *   4. While mounted, the store mirrors other tabs (`storage` event) and, when
 *      the user has no explicit choice stored, follows the OS
 *      (`prefers-color-scheme` `change`).
 *
 * `localStorage.theme` present  ⇒ explicit user choice (light/dark).
 * `localStorage.theme` absent   ⇒ follow the system (see `followSystemTheme`).
 */

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The explicit choice in `localStorage.theme`, or `null` (follow the system). */
export function readStoredTheme(): Theme | null {
  try {
    const stored = getStorage()?.getItem(THEME_KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    return null;
  }
}

function darkMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return null;
  }
}

/** `prefers-color-scheme: dark`; `false` on the server or without `matchMedia`. */
export function systemPrefersDark(): boolean {
  return darkMediaQuery()?.matches ?? false;
}

/** The theme the page should show right now: explicit choice, else the OS. */
export function resolveSystemTheme(): Theme {
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light');
}

function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  // The inline head script has already applied the class; trust it first so
  // the store never disagrees with what the user sees.
  if (document.documentElement.classList.contains('dark')) return 'dark';
  return resolveSystemTheme();
}

function applyClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const $theme = atom<Theme>(initialTheme());

const setInMemory = $theme.set.bind($theme);

/** Set the theme as an explicit choice: updates `<html>` and `localStorage.theme`. */
$theme.set = (next: Theme) => {
  setInMemory(next);
  applyClass(next);
  try {
    getStorage()?.setItem(THEME_KEY, next);
  } catch {
    // localStorage unavailable (Safari private mode, quota…) — still toggle
    // the class so the UI responds; persistence just won't survive reload.
  }
};

if (typeof window !== 'undefined') {
  onMount($theme, () => {
    // Cross-tab sync: if the user toggles theme in another tab, mirror it here.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_KEY) return;
      if (event.key === null || event.newValue === null) {
        // Cleared elsewhere → back to following the system.
        const next = systemPrefersDark() ? 'dark' : 'light';
        setInMemory(next);
        applyClass(next);
        return;
      }
      if (event.newValue === 'dark' || event.newValue === 'light') {
        setInMemory(event.newValue);
        applyClass(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);

    // Follow the OS only while the user has not made an explicit choice.
    const media = darkMediaQuery();
    const onMediaChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme() !== null) return;
      const next: Theme = event.matches ? 'dark' : 'light';
      setInMemory(next);
      applyClass(next);
    };
    media?.addEventListener?.('change', onMediaChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      media?.removeEventListener?.('change', onMediaChange);
    };
  });
}

/** Set an explicit light/dark choice (legacy `ThemeContext.setTheme`). */
export function setTheme(theme: Theme): void {
  $theme.set(theme);
}

/** Flip the current theme. Safe to call from any island or Astro script. */
export function toggleTheme(): void {
  $theme.set($theme.get() === 'dark' ? 'light' : 'dark');
}

/**
 * Drop the explicit choice and follow `prefers-color-scheme` again: removes
 * `localStorage.theme` (so BaseLayout's inline script keeps following the OS
 * on the next load) and applies the OS theme now.
 */
export function followSystemTheme(): Theme {
  try {
    getStorage()?.removeItem(THEME_KEY);
  } catch {
    // storage unavailable — nothing was persisted anyway
  }
  const next: Theme = systemPrefersDark() ? 'dark' : 'light';
  setInMemory(next);
  applyClass(next);
  return next;
}
