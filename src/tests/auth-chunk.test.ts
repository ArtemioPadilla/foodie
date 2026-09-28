import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Firebase stays out of every page's initial JS (roadmap Issue 035, ADR 0012).
 *
 * Built-site check over `dist/` (only with `--mode dist`, run by
 * `npm run check` right after the build via `npm run test:dist`). For every
 * HTML page it collects the JS the page loads up front — `<script src>`,
 * `modulepreload`, `astro-island` component/renderer URLs, inline module
 * imports — and follows their STATIC imports. No module in that graph may be
 * a Firebase SDK chunk; the SDK is only reachable through dynamic `import()`
 * (fetched when the auth dialog opens, or to restore a known session).
 *
 * Before any island consumes `src/stores/user.ts` the SDK is not in the build
 * at all, which trivially satisfies the rule; the test reports that case.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(root, 'dist');
const ASTRO_DIR = join(DIST, '_astro');
const runDist = import.meta.env.MODE === 'dist';

const FIREBASE_MARKER = /identitytoolkit\.googleapis\.com|@firebase\/app/;
const STATIC_IMPORT = /\b(?:import|export)\s*(?:[^"'()]*?\bfrom\s*)?["']([^"']+\.js)["']/g;
const PAGE_JS = /\/_astro\/[^"'\s)]+\.js/g;

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, ext) : path.endsWith(ext) ? [path] : [];
  });
}

describe.runIf(runDist)('built site — Firebase chunk is lazy (roadmap #035)', () => {
  it('no page statically loads a Firebase SDK chunk', () => {
    expect(existsSync(ASTRO_DIR)).toBe(true);
    const chunks = new Map(walk(ASTRO_DIR, '.js').map((p) => [basename(p), p]));
    const source = new Map<string, string>();
    const text = (name: string) => {
      if (!source.has(name)) source.set(name, readFileSync(chunks.get(name)!, 'utf-8'));
      return source.get(name)!;
    };
    const firebaseChunks = new Set([...chunks.keys()].filter((n) => FIREBASE_MARKER.test(text(n))));

    // Transitive static-import closure, memoised per chunk.
    const closure = new Map<string, Set<string>>();
    const reach = (name: string, seen = new Set<string>()): Set<string> => {
      if (closure.has(name)) return closure.get(name)!;
      if (seen.has(name) || !chunks.has(name)) return new Set();
      seen.add(name);
      const out = new Set([name]);
      for (const m of text(name).matchAll(STATIC_IMPORT)) {
        for (const dep of reach(basename(m[1]!), seen)) out.add(dep);
      }
      closure.set(name, out);
      return out;
    };

    const offenders: string[] = [];
    for (const page of walk(DIST, '.html')) {
      const html = readFileSync(page, 'utf-8');
      for (const ref of new Set(html.match(PAGE_JS) ?? [])) {
        for (const dep of reach(basename(ref))) {
          if (firebaseChunks.has(dep)) offenders.push(`${relative(DIST, page)} → ${dep}`);
        }
      }
    }
    if (firebaseChunks.size === 0) console.info('[auth-chunk] no Firebase chunk in dist/ (no auth consumer yet)');
    expect(offenders).toEqual([]);
  });
});
