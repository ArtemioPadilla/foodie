/**
 * Source-level guards for roadmap Issue 035:
 *  - no Firebase web API key literal anywhere in `src/` (config comes from
 *    PUBLIC_FIREBASE_* env);
 *  - the Firebase SDK is only ever imported dynamically, and only
 *    `firebase/app` + `firebase/auth` (no Firestore, Analytics, umbrella).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(SRC).filter((f) => /\.(ts|tsx|astro|mjs|js)$/.test(f) && !f.endsWith('bundle-boundary.test.ts'));

describe('auth bundle boundary', () => {
  it('has no hardcoded Firebase API key', () => {
    const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('AIza' + 'Sy'));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('never imports the Firebase SDK statically', () => {
    const staticImport = /^\s*import\s+(?!type\b)[^;]*from\s+['"]firebase(\/[^'"]*)?['"]/m;
    const offenders = files.filter((f) => !f.endsWith('.test.ts') && staticImport.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('only loads firebase/app and firebase/auth', () => {
    const modules = new Set<string>();
    for (const f of files) {
      if (f.endsWith('.test.ts')) continue;
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:import\(\s*|from\s+)['"](firebase(?:\/[^'"]*)?)['"]/g)) modules.add(m[1]!);
    }
    expect([...modules].sort()).toEqual(['firebase/app', 'firebase/auth']);
  });
});
