/**
 * Static/dynamic import graph of a built Astro site (roadmap Issue 045).
 *
 * Shared by `src/tests/bundle-split.test.ts` (which chunks may a page load?)
 * and `scripts/chunk-report.mjs` (the chunk table pasted into perf PRs).
 *
 * A page's *initial* JS is every `/_astro/*.js` URL its HTML references
 * (`<script src>`, `modulepreload`, `astro-island` component/renderer URLs,
 * inline module imports) plus the transitive closure of their STATIC imports.
 * Dynamic `import()` edges are tracked separately: they are fetched on demand
 * (dialog opens, chart mounts, …), never on first load.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const STATIC_IMPORT = /\b(?:import|export)\s*(?:[^"'`()]*?\bfrom\s*)?["']([^"']+\.js)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/g;
const PAGE_JS = /\/_astro\/[^"'\s)]+\.js/g;

/** @param {string} dir @param {string} ext @returns {string[]} */
export function walk(dir, ext) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, ext) : path.endsWith(ext) ? [path] : [];
  });
}

/** `dist/es/planner/index.html` → `/es/planner/`. */
export function routeOf(distDir, htmlPath) {
  const rel = relative(distDir, htmlPath).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
}

/** @param {string} distDir */
export function loadDistGraph(distDir) {
  const astroDir = join(distDir, '_astro');
  if (!existsSync(astroDir)) throw new Error(`${astroDir} not found — run \`npm run build\` first`);
  const chunks = new Map(walk(astroDir, '.js').map((p) => [basename(p), p]));
  const source = new Map();
  const text = (name) => {
    if (!source.has(name)) source.set(name, readFileSync(chunks.get(name), 'utf-8'));
    return source.get(name);
  };
  const edges = (name, re) =>
    chunks.has(name) ? [...new Set([...text(name).matchAll(re)].map((m) => basename(m[1])))].filter((n) => chunks.has(n)) : [];

  const closure = new Map();
  /** Transitive static-import closure (includes `name` itself). */
  const staticClosure = (name, seen = new Set()) => {
    if (closure.has(name)) return closure.get(name);
    if (seen.has(name) || !chunks.has(name)) return new Set();
    seen.add(name);
    const out = new Set([name]);
    for (const dep of edges(name, STATIC_IMPORT)) for (const d of staticClosure(dep, seen)) out.add(d);
    closure.set(name, out);
    return out;
  };

  /** Everything reachable through static AND dynamic edges (on-demand JS included). */
  const fullClosure = (roots) => {
    const out = new Set();
    const queue = [...roots];
    while (queue.length) {
      const name = queue.pop();
      if (out.has(name) || !chunks.has(name)) continue;
      out.add(name);
      queue.push(...edges(name, STATIC_IMPORT), ...edges(name, DYNAMIC_IMPORT));
    }
    return out;
  };

  const pages = walk(distDir, '.html')
    .filter((p) => !p.includes(`${sep}_pagefind${sep}`))
    .map((path) => {
      const html = readFileSync(path, 'utf-8');
      const entries = [...new Set((html.match(PAGE_JS) ?? []).map((u) => basename(u)))].filter((n) => chunks.has(n));
      const initial = new Set();
      for (const e of entries) for (const d of staticClosure(e)) initial.add(d);
      return { path, route: routeOf(distDir, path), entries, initial };
    });

  const gzCache = new Map();
  /** Gzipped size in bytes (level 9 — close to what static hosts serve). */
  const gzipSize = (name) => {
    if (!gzCache.has(name)) gzCache.set(name, gzipSync(readFileSync(chunks.get(name)), { level: 9 }).length);
    return gzCache.get(name);
  };

  return {
    chunks,
    text,
    staticImports: (name) => edges(name, STATIC_IMPORT),
    dynamicImports: (name) => edges(name, DYNAMIC_IMPORT),
    staticClosure,
    fullClosure,
    pages,
    gzipSize,
    /** Chunk names whose source matches `marker`. */
    find: (marker) => new Set([...chunks.keys()].filter((n) => marker.test(text(n)))),
  };
}

/** Markers that identify a vendor library inside minified chunks. */
export const MARKERS = {
  // Firebase SDK: the Auth REST host, the @firebase/app registration name, or
  // the `firebase/app` entry's registerVersion('firebase', '<semver>', …).
  firebase: /identitytoolkit\.googleapis\.com|@firebase\/app|[`"']firebase[`"'],\s*[`"']\d+\.\d+\.\d+[`"']/,
  // Recharts: its root CSS class names survive minification.
  recharts: /recharts-surface|recharts-wrapper/,
};
