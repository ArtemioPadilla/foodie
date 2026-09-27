import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClient,
  type Persister,
} from '@tanstack/query-persist-client-core';
import { get, set, del } from 'idb-keyval';

const IDB_PERSIST_KEY = 'tanstack-query-cache';

/** How long a persisted cache is trusted before it is discarded on restore (24 h). */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * idb-keyval-backed Persister. Stores the whole TanStack Query cache as one
 * JSON-serializable object under a single key in IndexedDB.
 */
export function createIdbPersister(idbKey: string = IDB_PERSIST_KEY): Persister {
  return {
    persistClient: async (client) => {
      await set(idbKey, client);
    },
    restoreClient: async () => {
      return (await get(idbKey)) ?? undefined;
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
}

/**
 * Creates a QueryClient + (optionally) wires it up to persistence.
 *
 * Persistence is OPT-IN at the query level: a query opts in by setting
 *   useQuery({ queryKey, queryFn, meta: { persist: true } })
 * The dehydrate filter below excludes queries without that meta flag, so
 * the persister never touches transient queries (avatars, search-as-you-type,
 * one-off pings) that would just bloat the cache.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Sensible offline-first defaults — long staleTime so cached data is
        // shown immediately on revisit; tweak per query if needed.
        staleTime: 5 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Predicate for which queries get written to IndexedDB.
 *
 * Two conditions, both required:
 *  - the query opted in via `meta.persist === true`
 *  - the query has settled successfully — TanStack v5's `dehydrate()`
 *    includes *pending* queries by default, and a dehydrated pending query
 *    carries its in-flight `promise`, which IndexedDB's structured clone
 *    rejects (`DataCloneError: #<Promise> could not be cloned`).
 */
export function shouldPersistQuery(query: {
  state: { status: string };
  meta?: Record<string, unknown> | null;
}): boolean {
  return (
    query.state.status === 'success' &&
    Boolean(query.meta && (query.meta as { persist?: boolean }).persist)
  );
}

export interface AttachPersisterOptions {
  /** IndexedDB key (default `tanstack-query-cache`); ignored when `persister` is given. */
  idbKey?: string;
  /** Replace the idb-keyval persister (tests use an in-memory one). */
  persister?: Persister;
  /** Debounce for writes, ms (default 1000 — TanStack's own default). */
  throttleTime?: number;
}

/**
 * Attach a persister to a QueryClient and also expose the restore promise, so
 * callers that need to know when the cached state has been hydrated (tests,
 * prefetch-on-boot) can await it. `attachPersister` is the fire-and-forget
 * form used by `QueryProvider`.
 *
 * Only successfully-settled queries with `meta.persist === true` are written
 * (see `shouldPersistQuery`); a persisted cache older than
 * `PERSIST_MAX_AGE_MS` is dropped on restore.
 */
export function attachPersisterWithRestore(
  client: QueryClient,
  options?: AttachPersisterOptions,
): { detach: () => void; restored: Promise<void> } {
  const persister = options?.persister ?? createIdbPersister(options?.idbKey);
  const [unsubscribe, restored] = persistQueryClient({
    queryClient: client,
    persister,
    maxAge: PERSIST_MAX_AGE_MS,
    ...(options?.throttleTime !== undefined ? { throttleTime: options.throttleTime } : {}),
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
    },
  });
  return { detach: unsubscribe, restored };
}

/**
 * Attach the idb-keyval persister to a QueryClient. Returns a cleanup function
 * that detaches and removes the persisted cache.
 *
 * Only successfully-settled queries with `meta.persist === true` are written
 * to disk (see `shouldPersistQuery`).
 */
export function attachPersister(client: QueryClient, options?: AttachPersisterOptions): () => void {
  return attachPersisterWithRestore(client, options).detach;
}
