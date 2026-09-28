import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadDistGraph, MARKERS, type DistGraph } from '../../scripts/dist-graph.mjs';

/**
 * Heavy vendors load only on the pages that use them (roadmap Issue 045).
 *
 * Built-site check over `dist/` (only with `--mode dist`: `npm run check`
 * runs it after its build through `npm run test:dist`, and `npm run perf`
 * runs it after a build with dummy `PUBLIC_FIREBASE_*` values, so the
 * Firebase SDK chunk exists). The graph comes from `scripts/dist-graph.mjs`:
 * a page's *initial* JS is what its HTML references plus static imports;
 * *on demand* adds the dynamic `import()` edges (dialogs, lazy panels).
 *
 * - **Recharts** (~85 KB gz): initial JS only on the tracking progress/goals
 *   pages (every locale) and the template's chart galleries/demos; never
 *   reachable, not even on demand, from the landing, the catalog or the
 *   planner.
 * - **Firebase** (auth adapter, Issues 035/036): never initial JS on any page
 *   (also guarded by `auth-chunk.test.ts`); the SDK is reached only through
 *   the lazy adapter's dynamic `import()` (sign-in dialog / session restore),
 *   and only from pages that carry the header's account slot.
 * - **Chunk size**: no chunk above 250 KB gzipped unless listed with a reason.
 */
const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
const runDist = import.meta.env.MODE === 'dist';

/** Pages allowed to load Recharts up front: they draw charts on first paint. */
const RECHARTS_ROUTES = [/^\/(?:(?:es|fr)\/)?tracking\/(?:goals|progress)\/$/, /^\/(?:gallery|demos)\//];
/** Foodie routes audited by Lighthouse that must stay chart-free. */
const CHART_FREE_ROUTES = ['/', '/es/', '/fr/', '/recipes/', '/recipes/rec_001/', '/planner/', '/es/planner/', '/fr/planner/'];

const MAX_CHUNK_GZ = 250 * 1024;
/** Chunks allowed over MAX_CHUNK_GZ, by file-name prefix → justification. Keep empty unless argued in a PR. */
const OVERSIZED_OK: Record<string, string> = {};

describe.runIf(runDist)('built site — vendor chunks load only where used (roadmap #045)', () => {
  let graph: DistGraph;
  const g = () => (graph ??= loadDistGraph(DIST));
  const page = (route: string) => {
    const found = g().pages.find((p) => p.route === route);
    if (!found) throw new Error(`${route} is not in dist/`);
    return found;
  };
  const hasAny = (set: Set<string>, chunks: Set<string>) => [...chunks].some((c) => set.has(c));

  it('Recharts is initial JS only on chart pages, and required on /tracking/progress/', () => {
    const recharts = g().find(MARKERS.recharts);
    expect(recharts.size, 'a Recharts chunk exists (tracking/progress uses it)').toBeGreaterThan(0);
    const loading = g()
      .pages.filter((p) => hasAny(p.initial, recharts))
      .map((p) => p.route);
    expect(loading.filter((route) => !RECHARTS_ROUTES.some((re) => re.test(route)))).toEqual([]);
    for (const route of ['/tracking/progress/', '/es/tracking/progress/', '/fr/tracking/progress/']) {
      expect(loading, route).toContain(route);
    }
  });

  it('Recharts is not reachable, even on demand, from the landing, catalog or planner', () => {
    const recharts = g().find(MARKERS.recharts);
    for (const route of CHART_FREE_ROUTES) {
      expect(hasAny(g().fullClosure(page(route).entries), recharts), route).toBe(false);
    }
  });

  it('Firebase is never initial JS, and on demand only through the lazy auth adapter', () => {
    const firebase = g().find(MARKERS.firebase);
    if (process.env.PUBLIC_FIREBASE_API_KEY) {
      expect(firebase.size, 'build with PUBLIC_FIREBASE_* must contain the SDK chunk').toBeGreaterThan(0);
    }
    if (firebase.size === 0) {
      console.info('[bundle-split] no Firebase chunk in dist/ (built without PUBLIC_FIREBASE_*) — run `npm run perf` for the full check');
      return;
    }
    const initial = g()
      .pages.filter((p) => hasAny(p.initial, firebase))
      .map((p) => p.route);
    expect(initial).toEqual([]);

    // On demand: the SDK is imported by exactly one app chunk — the lazy
    // adapter (`lib/auth/firebase.ts`) — and only through dynamic import().
    const nonSdk = [...g().chunks.keys()].filter((n) => !firebase.has(n));
    const staticImporters = nonSdk.filter((n) => g().staticImports(n).some((d) => firebase.has(d)));
    const dynamicImporters = nonSdk.filter((n) => g().dynamicImports(n).some((d) => firebase.has(d)));
    expect(staticImporters).toEqual([]);
    expect(dynamicImporters).toHaveLength(1);

    // …and only pages with the header's account slot can ever reach it.
    const reaching = g().pages.filter((p) => hasAny(g().fullClosure(p.entries), firebase));
    expect(reaching.filter((p) => !p.entries.some((e) => e.startsWith('AccountMenu.'))).map((p) => p.route)).toEqual([]);
    expect(reaching.map((p) => p.route)).toContain('/');
  });

  it(`no chunk is over ${MAX_CHUNK_GZ / 1024} KB gzipped without a recorded reason`, () => {
    const oversized = [...g().chunks.keys()]
      .filter((name) => g().gzipSize(name) > MAX_CHUNK_GZ)
      .filter((name) => !Object.keys(OVERSIZED_OK).some((prefix) => name.startsWith(prefix)))
      .map((name) => `${name} ${Math.round(g().gzipSize(name) / 1024)} KB`);
    expect(oversized).toEqual([]);
  });

  it('dist/ is a full build', () => {
    expect(g().pages.length).toBeGreaterThan(100);
    expect(g().chunks.size).toBeGreaterThan(0);
  });
});
