/**
 * `useUrlSearch()` — the query string as a React external store (roadmap
 * Issues 017/019: `RecipeBrowser` and `IngredientBrowser` keep every filter in
 * the URL so results are shareable and deep-linkable).
 *
 * `useSyncExternalStore` reads `location.search` (server snapshot = '' → the
 * SSR markup shows the defaults and hydration never mismatches),
 * `writeUrlSearch` updates it with `history.replaceState` and notifies every
 * subscriber (replaceState fires no event), `popstate` re-reads it. Safari
 * caps replaceState at 100 calls / 30 s and throws past it — the write then
 * falls back to an in-memory search so the UI keeps working and the URL
 * catches up on the next successful write.
 */
import * as React from 'react';

const listeners = new Set<() => void>();
let fallbackSearch: string | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onPopState = () => {
    fallbackSearch = null;
    listener();
  };
  window.addEventListener('popstate', onPopState);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', onPopState);
  };
}

/** Current query string, with its leading `?` (or `''`). Browser only. */
export function readUrlSearch(): string {
  return fallbackSearch ?? window.location.search;
}

function getServerSnapshot(): string {
  return '';
}

/** Replace the current query string (`query` without `?`) and notify every subscriber. */
export function writeUrlSearch(query: string): void {
  const next = query ? `?${query}` : '';
  if (readUrlSearch() === next) return;
  try {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${next}${window.location.hash}`);
    fallbackSearch = null;
  } catch {
    fallbackSearch = next;
  }
  for (const listener of listeners) listener();
}

/** The live query string (`''` during SSR and the hydration render). */
export function useUrlSearch(): string {
  return React.useSyncExternalStore(subscribe, readUrlSearch, getServerSnapshot);
}

/**
 * Typed URL state on top of `useUrlSearch`: `parse`/`serialize` map the query
 * string to a state object (both must be stable references). `initialState`
 * seeds the URL once (tests / embedding).
 */
export function useUrlState<S>(
  parse: (search: string) => S,
  serialize: (state: S) => string,
  initialState?: S,
) {
  const search = useUrlSearch();
  const state = React.useMemo(() => parse(search), [parse, search]);

  React.useEffect(() => {
    if (initialState) writeUrlSearch(serialize(initialState));
  }, [initialState, serialize]);

  const setState = React.useCallback(
    (next: S | ((prev: S) => S)) => {
      const resolved = typeof next === 'function' ? (next as (prev: S) => S)(parse(readUrlSearch())) : next;
      writeUrlSearch(serialize(resolved));
    },
    [parse, serialize],
  );

  const update = React.useCallback((patch: Partial<S>) => setState((prev) => ({ ...prev, ...patch })), [setState]);

  return { state, setState, update };
}
