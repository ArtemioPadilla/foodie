import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { IDENTITY_PATTERN } from './fixtures/identity';

/**
 * Privacy gate (ADR 0015): nothing the site serves may reveal the owner's
 * name, GitHub account or personal domain. Foodie moved to
 * https://eat.cybere.co/ precisely so the public site stands on its own.
 *
 * Two layers:
 *   1. Sources that are served verbatim or rendered into pages (always run):
 *      src/content/**, the text files in public/, and src/lib/site-meta.ts.
 *   2. The built site (only with `--mode dist`, i.e. `npm run test:dist`,
 *      which `npm run check` runs right after the default build): every
 *      html, js, css, json, xml, txt, svg and webmanifest file under dist/.
 *
 * Repository files that are never served (LICENSE, README, CHANGELOG, ADRs,
 * archives, workflows) are out of scope.
 */

const root = fileURLToPath(new URL('../..', import.meta.url));

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest', '.md', '.mdx', '.ts', '.yml', '.yaml']);
const DIST_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg', '.webmanifest']);

function files(dir: string, keep: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path, keep));
    else if (keep(path)) out.push(path);
  }
  return out;
}

/** `file:line: match` for every identity hit in `paths`. */
function hits(paths: string[]): string[] {
  const out: string[] = [];
  for (const path of paths) {
    const text = readFileSync(path, 'utf-8');
    if (!IDENTITY_PATTERN.test(text)) continue;
    text.split('\n').forEach((line, i) => {
      const match = line.match(IDENTITY_PATTERN);
      if (match) out.push(`${relative(root, path).split(sep).join('/')}:${i + 1}: …${line.slice(Math.max(0, match.index! - 40), match.index! + 40)}…`);
    });
  }
  return out;
}

describe('privacy gate — sources that reach the site (ADR 0015)', () => {
  it('the pattern catches every form of the identity (self-test)', () => {
    for (const leak of ['Artemio', 'PADILLA', 'https://artemiop.com/foodie/', 'github.com/ArtemioPadilla/foodie', 'artemiopadilla.github.io']) {
      expect(IDENTITY_PATTERN.test(leak), leak).toBe(true);
    }
    for (const fine of ['https://eat.cybere.co/', 'github.com/example-org/foodie', 'Foodie']) {
      expect(IDENTITY_PATTERN.test(fine), fine).toBe(false);
    }
  });

  it('src/content (docs, catalog collections) names no one', () => {
    const paths = files(join(root, 'src/content'), (p) => TEXT_EXTENSIONS.has(extname(p)));
    expect(paths.length).toBeGreaterThan(10);
    expect(hits(paths)).toEqual([]);
  });

  it('the text files in public/ name no one', () => {
    const paths = files(join(root, 'public'), (p) => TEXT_EXTENSIONS.has(extname(p)) || p.endsWith(`${sep}_headers`));
    expect(paths.some((p) => p.endsWith('og-source.svg'))).toBe(true);
    expect(hits(paths)).toEqual([]);
  });

  it('src/lib/site-meta.ts (identity, JSON-LD, llms.txt) names no one', () => {
    expect(hits([join(root, 'src/lib/site-meta.ts'), join(root, 'site.config.mjs')])).toEqual([]);
  });
});

const DIST = join(root, 'dist');
const runDist = import.meta.env.MODE === 'dist';

describe.runIf(runDist)('privacy gate — built site, dist/ (npm run test:dist)', () => {
  const paths = files(DIST, (p) => DIST_EXTENSIONS.has(extname(p)));

  it('dist/ is a full build', () => {
    expect(paths.filter((p) => p.endsWith('.html')).length).toBeGreaterThanOrEqual(500);
    expect(paths.some((p) => p.endsWith(`${sep}robots.txt`))).toBe(true);
    expect(paths.some((p) => p.endsWith('sitemap-index.xml'))).toBe(true);
    expect(paths.some((p) => p.endsWith('llms.txt'))).toBe(true);
    expect(paths.some((p) => p.endsWith('.js'))).toBe(true);
  });

  it('no served file carries the owner’s name, account or personal domain', () => {
    expect(hits(paths)).toEqual([]);
  });
});
