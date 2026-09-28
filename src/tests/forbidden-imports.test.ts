import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Single-source forbidden-import gate. Reads the banned list from
// .claude/checklists/forbidden-imports.json (the same file centinela greps)
// and asserts no source file actually IMPORTS a banned module.
//
// We match real import specifiers (`from '<pattern>'` / `import('<pattern>')`),
// NOT bare string mentions — so docs, comments, and the existing
// "does not import Radix" assertions in other tests don't false-positive.

interface BannedEntry {
  pattern: string;
  reason: string;
  allowedAlternative: string;
}

const checklist = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../.claude/checklists/forbidden-imports.json', import.meta.url)),
    'utf8',
  ),
) as { banned: BannedEntry[] };

// Eagerly load every source file as raw text. Exclude test files (they
// legitimately reference banned names in assertions) and generated dirs.
const sources = import.meta.glob('../**/*.{ts,tsx,astro}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.entries(sources).filter(([path]) => !/\.test\.[tj]sx?$/.test(path));

function importsOf(pattern: string): RegExp {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // static import / re-export / dynamic import of the specifier (or its subpaths)
  return new RegExp(`(from|import)\\s*\\(?\\s*['"]${esc}`);
}

describe('forbidden imports (single source: .claude/checklists/forbidden-imports.json)', () => {
  it('the checklist lists the known banned specifiers', () => {
    const pats = checklist.banned.map((b) => b.pattern);
    expect(pats).toEqual(
      expect.arrayContaining([
        '@radix-ui/',
        'radix-ui',
        '@tremor/react',
        'framer-motion',
        '@astrojs/tailwind',
        '@ark-ui/react',
      ]),
    );
  });

  it.each(checklist.banned)('no source file imports $pattern', ({ pattern }) => {
    const re = importsOf(pattern);
    const offenders = files.filter(([, src]) => re.test(src)).map(([p]) => p);
    expect(offenders, `banned import "${pattern}" found in: ${offenders.join(', ')}`).toHaveLength(0);
  });
});

// Inceptor rule (roadmap Issue 046 audit): no React Context in island files —
// cross-island state goes through nanostores (src/stores/). Context inside
// one island is only allowed in the owned kit (src/components/ui/), whose
// compound components share state within a single React root. This is the
// gate behind `grep createContext src/components/islands` = 0, so the island
// tests no longer repeat the check (the literal would match the grep).
describe('React Context stays out of src/components/islands/', () => {
  const islands = Object.entries(sources).filter(([path]) => path.startsWith('../components/islands/'));

  it('finds the island sources', () => {
    expect(islands.length).toBeGreaterThan(20);
  });

  it('no island file (tests included) creates a React Context', () => {
    const offenders = islands.filter(([, src]) => /\bcreateContext\b/.test(src)).map(([p]) => p);
    expect(offenders).toEqual([]);
  });
});
