import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

/**
 * `prefers-reduced-motion` guard (Epic 12 criterion #4).
 *
 * Two rules:
 *   1. global.css declares the @media (prefers-reduced-motion: reduce) block
 *      that disables view-transitions and animation keyframes.
 *   2. No island uses Motion's `animate=` prop outside a <LazyMotion> tree.
 *      `tailwindcss-motion` utilities are exempt — they respect the OS pref
 *      by default.
 *
 * Rule 2 is a lint: greps the islands tree for `animate=` and asserts that
 * every match co-locates with `LazyMotion`.
 */

const css = readFileSync(
  fileURLToPath(new URL('../styles/global.css', import.meta.url)),
  'utf-8',
);

describe('prefers-reduced-motion guard', () => {
  it('global.css declares the @media (prefers-reduced-motion: reduce) rule', () => {
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  });

  it('disables view-transitions on reduced motion', () => {
    // Both ::view-transition-old(root) and ::view-transition-new(root) get animation: none
    expect(css).toMatch(/::view-transition-(old|new)\(root\)/);
  });

  it('every Motion `animate=` prop in islands is wrapped in <LazyMotion>', () => {
    // List islands using `find` since `node:fs/promises` glob isn't on all node versions
    const list = execSync(
      "find src/components -type f \\( -name '*.tsx' -o -name '*.ts' \\)",
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    const offenders: string[] = [];
    for (const path of list) {
      const src = readFileSync(path, 'utf-8');
      // Only flag files that import from motion/react (i.e. real Motion usage)
      if (!/from\s+['"]motion\/react['"]/.test(src)) continue;
      if (!/<LazyMotion/.test(src) && /animate\s*=/.test(src)) {
        offenders.push(path);
      }
    }
    expect(offenders, `Motion animate= outside <LazyMotion>: ${offenders.join(', ')}`).toEqual([]);
  });
});

/**
 * Foodie domain components (roadmap Issue 021): movement utilities — hover
 * lifts (`-translate-*`, `scale-*`, `rotate-*`), `transition-all` /
 * `transition-transform` / animated SVG strokes and `animate-*` — must be
 * gated behind `motion-safe:` so `prefers-reduced-motion: reduce` gets a
 * static UI. Colour-only transitions (`transition-colors`) are exempt.
 */
describe('domain components respect reduced motion', () => {
  // Static transforms (e.g. the timer ring's `-rotate-90`) don't move; they
  // only count when a state variant (hover:, focus:, …) animates them.
  const TRANSFORM = /^-?(translate-[xy]?|scale-|rotate-)/;
  const STATE_VARIANT = /(^|:)(hover|focus|focus-visible|focus-within|active|group-hover|peer-hover|data-\[[^\]]+\]):/;
  const ANIMATION = /^animate-(?!none)|^transition-(all|transform|\[stroke-dashoffset\])$|^duration-|^ease-/;

  it('every movement utility in src/components/domain is motion-safe:', () => {
    const files = execSync("find src/components/domain -type f -name '*.tsx' ! -name '*.test.tsx'", { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const path of files) {
      const src = readFileSync(path, 'utf-8');
      // Class tokens live in string literals: split every literal on whitespace.
      for (const literal of src.match(/(['"`])(?:(?!\1).)*\1/g) ?? []) {
        for (const token of literal.slice(1, -1).split(/\s+/)) {
          const utility = token.split(':').pop() ?? '';
          const moves = ANIMATION.test(utility) || (TRANSFORM.test(utility) && STATE_VARIANT.test(token));
          if (moves && !token.includes('motion-safe:') && !token.includes('motion-reduce:')) {
            offenders.push(`${path}: ${token}`);
          }
        }
      }
    }
    expect(offenders, `ungated movement: ${offenders.join(', ')}`).toEqual([]);
  });
});
