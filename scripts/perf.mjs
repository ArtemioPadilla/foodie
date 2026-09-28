#!/usr/bin/env node
/**
 * `npm run perf` — performance gate (roadmap Issue 045).
 *
 *  1. Production-shaped build: `npm run build` with `PUBLIC_FIREBASE_*` set
 *     (dummy values unless the environment already has real ones), because
 *     the deployed site has auth enabled — the header shows "Sign in" and the
 *     Firebase SDK chunk exists (lazy). Nothing is contacted: the SDK only
 *     loads when the sign-in dialog opens.
 *  2. Bundle checks on that build: `src/tests/bundle-split.test.ts` (Recharts
 *     and Firebase only where used, no chunk > 250 KB gz) and
 *     `src/tests/auth-chunk.test.ts`, then the chunk report
 *     (`.lighthouseci/chunk-report.md`, for the PR).
 *  3. Lighthouse CI over `dist/` (`.lighthouserc.json`: /, /es/, /fr/,
 *     /recipes/, a recipe detail, /planner/, /tracking/progress/, desktop):
 *     `lhci collect`, `lhci assert` (category scores) and a second
 *     `lhci assert --budgetsFile lighthouse-budgets.json` (byte budgets —
 *     Lighthouse 12 dropped in-report budgets and lhci cannot mix a budgets
 *     file with assertions in one pass).
 *  4. Prints the measured scores and transfer sizes
 *     (`.lighthouseci/perf-summary.md`).
 *
 * Chrome: lhci uses `CHROME_PATH` or a system Chrome; when neither exists it
 * falls back to Playwright's Chromium if that is installed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const LHCI_DIR = join(root, '.lighthouseci');

const DUMMY_FIREBASE = {
  PUBLIC_FIREBASE_API_KEY: 'perf-build-not-a-real-key',
  PUBLIC_FIREBASE_AUTH_DOMAIN: 'foodie-perf.firebaseapp.com',
  PUBLIC_FIREBASE_PROJECT_ID: 'foodie-perf',
  PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000',
};

const env = { ...process.env };
const firebaseSet = Object.keys(DUMMY_FIREBASE).every((k) => env[k]);
if (!firebaseSet) Object.assign(env, DUMMY_FIREBASE);
// A perf build is a production build: never the auth mock.
delete env.PUBLIC_AUTH_MOCK;

// Newest chromium-<rev>/chrome-linux{64,}/chrome under Playwright's browser cache.
function playwrightChromium() {
  const base = env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(base)) return null;
  const builds = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const build of builds) {
    for (const dir of ['chrome-linux64', 'chrome-linux']) {
      const path = join(base, build, dir, 'chrome');
      if (existsSync(path)) return path;
    }
  }
  return null;
}

async function resolveChrome() {
  if (env.CHROME_PATH) return;
  try {
    const { chromium } = await import('playwright');
    const path = chromium.executablePath();
    if (path && existsSync(path)) {
      env.CHROME_PATH = path;
      return;
    }
  } catch {
    // Playwright not importable: try its browser cache directly.
  }
  // Otherwise lhci looks for a system Chrome itself.
  const found = playwrightChromium();
  if (found) env.CHROME_PATH = found;
}

function run(label, cmd, args) {
  console.log(`\n▶ ${label}: ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    console.error(`\n✖ ${label} failed (exit ${res.status ?? res.signal}).`);
    process.exit(res.status ?? 1);
  }
}

function summary() {
  if (!existsSync(LHCI_DIR)) return '';
  const rows = readdirSync(LHCI_DIR)
    .filter((f) => /^lhr-.*\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(LHCI_DIR, f), 'utf-8')))
    .map((lhr) => {
      const items = lhr.audits['resource-summary']?.details?.items ?? [];
      const size = (type) => items.find((i) => i.resourceType === type) ?? { transferSize: 0, requestCount: 0 };
      const score = (id) => lhr.categories[id]?.score ?? 0;
      const script = size('script');
      return {
        route: new URL(lhr.finalUrl ?? lhr.requestedUrl).pathname.replace(/index\.html$/, ''),
        cells: [
          score('performance'),
          score('accessibility'),
          score('best-practices'),
          score('seo'),
          `${(script.transferSize / 1024).toFixed(0)} KB / ${script.requestCount}`,
          `${(size('total').transferSize / 1024).toFixed(0)} KB`,
        ],
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
  return [
    '## Lighthouse (desktop preset, lhci static server)',
    '',
    '| Route | Perf | A11y | Best practices | SEO | Script (transfer / requests) | Total transfer |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map((r) => `| \`${r.route}\` | ${r.cells.join(' | ')} |`),
    '',
  ].join('\n');
}

await resolveChrome();
console.log(
  firebaseSet
    ? 'perf: building with the PUBLIC_FIREBASE_* values from the environment.'
    : 'perf: building with dummy PUBLIC_FIREBASE_* values (auth UI on, SDK lazy, nothing contacted).',
);
// Say which variable is in play, never its value (env-derived values stay out of logs).
if (env.CHROME_PATH) console.log('perf: CHROME_PATH is set; Lighthouse uses that Chrome.');

run('build', 'npm', ['run', 'build']);
run('bundle checks', 'npx', ['vitest', 'run', '--mode', 'dist', 'src/tests/bundle-split.test.ts', 'src/tests/auth-chunk.test.ts']);
mkdirSync(LHCI_DIR, { recursive: true });
run('chunk report', 'node', ['scripts/chunk-report.mjs', '--out', join(LHCI_DIR, 'chunk-report.md')]);
run('lighthouse collect', 'npx', ['lhci', 'collect']);
const table = summary();
writeFileSync(join(LHCI_DIR, 'perf-summary.md'), table);
console.log(`\n${table}`);
run('lighthouse assert (scores)', 'npx', ['lhci', 'assert']);
run('lighthouse assert (budgets)', 'npx', ['lhci', 'assert', '--no-lighthouserc', '--budgetsFile=./lighthouse-budgets.json']);
console.log('\n✔ perf: bundle checks, Lighthouse scores and budgets all green.');
