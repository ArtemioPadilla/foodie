import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Cloudflare Pages response headers (public/_headers, ADR 0015).
 *
 * Source guards (always run) pin the security and cache headers; with
 * `--mode dist` (npm run test:dist) the file must also ship in dist/ and stay
 * out of the service worker's precache.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8');

type Rules = Map<string, Map<string, string>>;

/** Parse the `_headers` format: a path line, then indented `Name: value` lines. */
export function parseHeaders(text: string): Rules {
  const rules: Rules = new Map();
  let current: Map<string, string> | undefined;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = new Map();
      rules.set(raw.trim(), current);
      continue;
    }
    const line = raw.trim();
    const colon = line.indexOf(':');
    if (!current || colon === -1) throw new Error(`_headers: stray line "${line}"`);
    current.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return rules;
}

describe('public/_headers (Cloudflare Pages)', () => {
  const rules = parseHeaders(read('public/_headers'));
  const all = rules.get('/*');

  it('sends the security headers on every path', () => {
    expect(all?.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
    expect(all?.get('x-content-type-options')).toBe('nosniff');
    expect(all?.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(all?.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(all?.get('x-frame-options')).toBe('DENY');
  });

  it("the header CSP only sets frame-ancestors 'none' (the hashed meta CSP stays the source of truth)", () => {
    expect(all?.get('content-security-policy')).toBe("frame-ancestors 'none'");
    // No script/style/connect rules duplicated in a header, anywhere.
    for (const [path, headers] of rules) {
      const csp = headers.get('content-security-policy');
      if (csp) expect(csp, path).not.toMatch(/script-src|style-src|default-src|connect-src|unsafe-/);
    }
  });

  it('caches hashed assets and fonts for a year, never the service worker or the manifest', () => {
    for (const path of ['/_astro/*', '/fonts/*']) {
      expect(rules.get(path)?.get('cache-control'), path).toBe('public, max-age=31536000, immutable');
    }
    for (const path of ['/sw.js', '/manifest.webmanifest']) {
      expect(rules.get(path)?.get('cache-control'), path).toBe('no-cache');
    }
  });

  it('is left out of the service worker precache (no extension, not in globPatterns)', () => {
    const config = read('astro.config.mjs');
    const globs = config.match(/globPatterns:\s*\[([^\]]*)\]/)?.[1] ?? '';
    expect(globs).toContain('**/*.{');
    // Every precache glob is an extension glob, so the extension-less
    // `_headers` can never match.
    expect(globs).not.toMatch(/\*\*\/\*['"]|_headers/);
  });
});

const DIST = join(root, 'dist');
const runDist = import.meta.env.MODE === 'dist';

describe.runIf(runDist)('dist/_headers (npm run test:dist)', () => {
  it('ships at the root of dist/ unchanged', () => {
    expect(existsSync(join(DIST, '_headers'))).toBe(true);
    expect(read('dist/_headers')).toBe(read('public/_headers'));
  });

  it('is not precached by the generated service worker', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    expect(read('dist/sw.js')).not.toContain('_headers');
  });
});
