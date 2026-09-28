#!/usr/bin/env node
/**
 * Chunk report for perf PRs (roadmap Issue 045).
 *
 *   node scripts/chunk-report.mjs [--out <file>] [--top <n>]
 *
 * Reads the built `dist/` (run `npm run build` first) and prints Markdown:
 *   1. initial JS per audited route (gzipped bytes, chunk count) — the static
 *      graph the HTML loads; lazy `import()` chunks are fetched later;
 *   2. the largest chunks, gzipped, with how many pages load each up front,
 *      and a flag for any chunk over the 250 KB gz ceiling.
 * `npm run perf` writes it to `.lighthouseci/chunk-report.md` (uploaded with
 * the Lighthouse reports in CI) so the PR can paste it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDistGraph, MARKERS } from './dist-graph.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const out = opt('--out', null);
const top = Number(opt('--top', 20));

const ROUTES = ['/', '/es/', '/fr/', '/recipes/', '/recipes/rec_001/', '/planner/', '/tracking/progress/'];
const MAX_CHUNK_GZ = 250 * 1024;

const g = loadDistGraph(join(root, 'dist'));
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const tagOf = (name) =>
  Object.entries(MARKERS)
    .filter(([, re]) => g.find(re).has(name))
    .map(([tag]) => tag)
    .join(', ');

const lines = ['## Chunk report', '', `\`dist/_astro\`: ${g.chunks.size} JS chunks, ${g.pages.length} pages.`, ''];

lines.push(
  '### Initial JS per route (gzip -9, static import graph)',
  '',
  "Excludes on-demand chunks, including the page locale's dictionary (`en`/`es`/`fr`, ~20 KB gz) that `src/i18n` fetches with a top-level `import()`. Lighthouse's `resource-summary` (in `npm run perf`) counts everything fetched plus response headers.",
  '',
  '| Route | Chunks | Gzipped |',
  '|---|---:|---:|',
);
for (const route of ROUTES) {
  const page = g.pages.find((p) => p.route === route);
  if (!page) {
    lines.push(`| \`${route}\` | — | missing |`);
    continue;
  }
  const bytes = [...page.initial].reduce((sum, name) => sum + g.gzipSize(name), 0);
  lines.push(`| \`${route}\` | ${page.initial.size} | ${kb(bytes)} |`);
}

const loadCount = new Map();
for (const page of g.pages) for (const name of page.initial) loadCount.set(name, (loadCount.get(name) ?? 0) + 1);
const ranked = [...g.chunks.keys()].map((name) => ({ name, gz: g.gzipSize(name) })).sort((a, b) => b.gz - a.gz);

lines.push('', `### Largest chunks (top ${top})`, '', '| Chunk | Gzipped | Pages loading it up front (0 = on demand only) | Vendor |', '|---|---:|---:|---|');
for (const { name, gz } of ranked.slice(0, top)) {
  const flag = gz > MAX_CHUNK_GZ ? ' ⚠️ > 250 KB' : '';
  lines.push(`| \`${name}\` | ${kb(gz)}${flag} | ${loadCount.get(name) ?? 0} | ${tagOf(name)} |`);
}
const over = ranked.filter((c) => c.gz > MAX_CHUNK_GZ);
lines.push('', over.length ? `**${over.length} chunk(s) over 250 KB gz** — justify in the PR.` : 'No chunk over 250 KB gzipped.', '');

const report = lines.join('\n');
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, report);
}
console.log(report);
