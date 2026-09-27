// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import type { Persister, PersistedClient } from '@tanstack/query-persist-client-core';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { attachPersisterWithRestore, PERSIST_MAX_AGE_MS } from '@/lib/queryClient';
import { CategoriesFileSchema, type CategoriesFile } from '@/schemas';
import {
  makeIngredient,
  makeRecipe,
  mockBeverages,
  mockIngredientCategories,
} from '@/tests/fixtures/foodie-domain';
import {
  CATALOG_FILES,
  catalogQueryKey,
  combineCatalogStatus,
  fetchCatalogFile,
  useCatalog,
} from './use-catalog';

/**
 * Port of the 7 loading / fetch / error tests of legacy
 * `tests/unit/contexts/BeverageContext.test.tsx` (the selectors moved to
 * selectors.test.ts) plus the persistence contract of roadmap Issue 016:
 * IDB (24 h) via an in-memory persister, `offline` serves the cache.
 */

const categoriesFile: CategoriesFile = CategoriesFileSchema.parse({
  mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
  cuisines: [{ id: 'mexican', name: { en: 'Mexican', es: 'Mexicana', fr: 'Mexicaine' } }],
  dietaryTags: [{ id: 'vegan', name: { en: 'Vegan', es: 'Vegano', fr: 'Végan' } }],
  ingredientCategories: mockIngredientCategories,
});

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [makeRecipe()] },
  [CATALOG_FILES.ingredients]: { ingredients: [makeIngredient()] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: categoriesFile,
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.ok === false ? 'Not Found' : 'OK',
    json: async () => body,
  } as unknown as Response;
}

const NOT_FOUND = () => jsonResponse({ message: 'not found' }, { ok: false, status: 404 });

/**
 * fetch that serves the four catalog files (relative to BASE_URL, which is '/'
 * in vitest). An override set to `undefined` makes that file a 404.
 */
function okFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const path = url.replace(withBase('/'), '/');
    if (path in overrides) {
      return overrides[path] === undefined ? NOT_FOUND() : jsonResponse(overrides[path]);
    }
    if (path in payloads) return jsonResponse(payloads[path]);
    return NOT_FOUND();
  });
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 0 } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** In-memory `Persister` — the IDB one, minus IndexedDB. */
function memoryPersister(initial?: PersistedClient) {
  const store: { value: PersistedClient | undefined } = { value: initial };
  const persister: Persister = {
    persistClient: async (client) => {
      store.value = client;
    },
    restoreClient: async () => store.value,
    removeClient: async () => {
      store.value = undefined;
    },
  };
  return { persister, store };
}

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

describe('fetchCatalogFile', () => {
  it('fetches every file through withBase() — never a hardcoded /foodie/ prefix', async () => {
    const fetchImpl = okFetch();
    await fetchCatalogFile('beverages', fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(withBase('/data/beverages.json'));
    expect(String(fetchImpl.mock.calls[0]?.[0])).not.toMatch(/^\/foodie\//);
  });

  it('unwraps { recipes } / { ingredients } and validates with the Zod file schemas', async () => {
    const fetchImpl = okFetch();
    expect((await fetchCatalogFile('recipes', fetchImpl))[0]?.id).toBe('rec_001');
    expect((await fetchCatalogFile('ingredients', fetchImpl))[0]?.id).toBe('ing_001');
    expect((await fetchCatalogFile('beverages', fetchImpl)).map((b) => b.id)).toEqual([
      'bev_water',
      'bev_coffee',
    ]);
    expect((await fetchCatalogFile('categories', fetchImpl)).mealTypes[0]?.id).toBe('breakfast');
  });

  it('throws on a non-ok response and on a schema violation', async () => {
    await expect(
      fetchCatalogFile('recipes', okFetch({ [CATALOG_FILES.recipes]: undefined })),
    ).rejects.toThrow();
    await expect(
      fetchCatalogFile('recipes', okFetch({ [CATALOG_FILES.recipes]: { recipes: [{ id: 1 }] } })),
    ).rejects.toMatchObject({ name: 'ZodError' });
  });
});

describe('useCatalog', () => {
  it('starts loading with empty collections and resolves to success', async () => {
    vi.stubGlobal('fetch', okFetch());
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });

    expect(result.current.status).toBe('loading');
    expect(result.current.recipes).toEqual([]);
    expect(result.current.beverages).toEqual([]);
    expect(result.current.categories.mealTypes).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.recipes[0]?.id).toBe('rec_001');
    expect(result.current.ingredients[0]?.id).toBe('ing_001');
    expect(result.current.beverages).toHaveLength(2);
    expect(result.current.categories.ingredientCategories).toHaveLength(7);
    expect(result.current.error).toBeNull();
  });

  it('requests the four files at their base-aware URLs', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.status).toBe('success'));
    const urls = fetchMock.mock.calls.map((c) => String(c[0])).sort();
    expect(urls).toEqual(
      ['/data/beverages.json', '/data/categories.json', '/data/ingredients.json', '/data/recipes.json'].map(
        withBase,
      ),
    );
  });

  it('reports error (with empty data) on a network failure without cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('Network error'))));
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.recipes).toEqual([]);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('reports error on a non-ok response', async () => {
    vi.stubGlobal('fetch', okFetch({ [CATALOG_FILES.beverages]: undefined }));
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toMatch(/404/);
    // The other three files still loaded — partial data is exposed.
    expect(result.current.recipes).toHaveLength(1);
  });

  it('reports error when a payload does not match the Zod schema', async () => {
    vi.stubGlobal('fetch', okFetch({ [CATALOG_FILES.ingredients]: { ingredients: [{ id: '' }] } }));
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.name).toBe('ZodError');
    expect(result.current.ingredients).toEqual([]);
  });

  it('keeps stable empty references while loading (safe useMemo deps downstream)', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    const { result, rerender } = renderHook(() => useCatalog(), { wrapper: wrapperFor(makeClient()) });
    const first = result.current.recipes;
    rerender();
    expect(result.current.recipes).toBe(first);
  });
});

describe('useCatalog persistence (IDB contract via in-memory persister)', () => {
  it('persists only the successful catalog queries, with meta.persist', async () => {
    vi.stubGlobal('fetch', okFetch());
    const client = makeClient();
    const { persister, store } = memoryPersister();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;

    // A transient query in the same client must not be written.
    await client.prefetchQuery({ queryKey: ['transient'], queryFn: async () => 'no' });

    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.status).toBe('success'));
    await waitFor(() => expect(store.value?.clientState.queries.length).toBe(4));

    const keys = store.value!.clientState.queries.map((q) => JSON.stringify(q.queryKey)).sort();
    expect(keys).toEqual(
      ['beverages', 'categories', 'ingredients', 'recipes'].map((n) => JSON.stringify(catalogQueryKey(n as never))),
    );
    const recipesQuery = store.value!.clientState.queries.find(
      (q) => JSON.stringify(q.queryKey) === JSON.stringify(catalogQueryKey('recipes')),
    );
    expect(recipesQuery?.meta).toEqual({ persist: true });
    expect((recipesQuery?.state.data as unknown[])[0]).toMatchObject({ id: 'rec_001' });
    detach();
  });

  async function primedPersister(): Promise<{ persister: Persister; store: { value: PersistedClient | undefined } }> {
    // First visit: online, everything loads and is persisted.
    vi.stubGlobal('fetch', okFetch());
    const client = makeClient();
    const { persister, store } = memoryPersister();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;
    const { result, unmount } = renderHook(() => useCatalog(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.status).toBe('success'));
    await waitFor(() => expect(store.value?.clientState.queries.length).toBe(4));
    unmount();
    detach();
    return { persister, store };
  }

  it('serves the cache with status offline when the refetch fails', async () => {
    const { persister } = await primedPersister();

    // Second visit: the network is down but the cache is restored first.
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const client = makeClient();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(client) });

    // Hydrated synchronously from the persisted state — data before any fetch settles.
    expect(result.current.recipes[0]?.id).toBe('rec_001');
    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.recipes[0]?.id).toBe('rec_001');
    expect(result.current.beverages).toHaveLength(2);
    expect(result.current.error?.message).toBe('offline');
    detach();
  });

  it('serves the cache with status offline while the browser is offline (paused fetch)', async () => {
    const { persister } = await primedPersister();
    const fetchMock = vi.fn(async () => Promise.reject(new Error('should not be called')));
    vi.stubGlobal('fetch', fetchMock);
    onlineManager.setOnline(false);

    const client = makeClient();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;
    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.recipes).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    detach();
  });

  it('discards a persisted cache older than 24 h and falls through to error', async () => {
    const { persister, store } = await primedPersister();
    store.value = { ...store.value!, timestamp: Date.now() - PERSIST_MAX_AGE_MS - 60_000 };

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const client = makeClient();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;
    expect(client.getQueryCache().findAll({ queryKey: ['catalog'] })).toHaveLength(0);
    expect(store.value).toBeUndefined(); // removeClient() was called on the stale cache

    const { result } = renderHook(() => useCatalog(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.recipes).toEqual([]);
    detach();
  });

  it('restores a cache younger than 24 h', async () => {
    const { persister, store } = await primedPersister();
    store.value = { ...store.value!, timestamp: Date.now() - PERSIST_MAX_AGE_MS + 60_000 };
    const client = makeClient();
    const { detach, restored } = attachPersisterWithRestore(client, { persister, throttleTime: 0 });
    await restored;
    expect(client.getQueryCache().findAll({ queryKey: ['catalog'] })).toHaveLength(4);
    detach();
  });
});

describe('combineCatalogStatus', () => {
  const q = (data: unknown, isError = false, fetchStatus: 'idle' | 'fetching' | 'paused' = 'idle') =>
    ({ data, isError, fetchStatus }) as never;

  it('collapses the four query states', () => {
    expect(combineCatalogStatus([q(undefined), q(undefined)])).toBe('loading');
    expect(combineCatalogStatus([q([]), q(undefined, false, 'fetching')])).toBe('loading');
    expect(combineCatalogStatus([q([]), q([])])).toBe('success');
    expect(combineCatalogStatus([q([]), q(undefined, true)])).toBe('error');
    expect(combineCatalogStatus([q([]), q([], true)])).toBe('offline');
    expect(combineCatalogStatus([q(undefined, false, 'paused'), q(undefined)])).toBe('offline');
  });
});
