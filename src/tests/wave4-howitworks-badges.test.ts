import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-level guards for Wave 4 issues #138 (TimelineStage) and #144
// (status badge strip) from docs/AUDIT-2026-06.md §7 items 2 & 9. The
// template's /how-it-works marketing page was dropped in the Foodie rebrand
// (roadmap Issue 003); the TimelineStage component it used stays in the kit.
//
// These are structural guards: they assert the presence of specific markup
// strings that form the acceptance criteria without executing the Astro build.

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf-8');

// ── TimelineStage component ───────────────────────────────────────────────────

describe('TimelineStage component (#138)', () => {
  it('the component file exists', () => {
    const src = read('src/components/marketing/TimelineStage.astro');
    expect(src.length).toBeGreaterThan(0);
  });

  it('accepts ISSUE | PLAN | COMMITS | VERDICT as the label prop', () => {
    const src = read('src/components/marketing/TimelineStage.astro');
    // The Props type must enumerate all four
    expect(src).toContain("'ISSUE'");
    expect(src).toContain("'PLAN'");
    expect(src).toContain("'COMMITS'");
    expect(src).toContain("'VERDICT'");
  });
});

// ── Issue #144 — status badge strip ──────────────────────────────────────────

describe('StatusBadgeStrip component (#144)', () => {
  it('the component file exists', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src.length).toBeGreaterThan(0);
  });

  it('contains the CI workflow badge.svg reference', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src).toContain('ci.yml/badge.svg');
  });

  it('contains the Deploy workflow badge.svg reference', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src).toContain('deploy.yml/badge.svg');
  });

  it('all badge data entries carry alt text', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    // The badges const array has an `alt` key for each badge; we check the
    // template uses it (b.alt renders via the img alt={b.alt} expression).
    expect(src).toContain('alt={b.alt}');
    // All four badge objects have an `alt:` entry
    const altEntries = src.match(/alt:/g) ?? [];
    expect(altEntries.length).toBeGreaterThanOrEqual(4);
  });

  it('badge images have explicit width and height to prevent CLS', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src).toContain('width=');
    expect(src).toContain('height=');
  });

  it('badge images use loading="lazy"', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src).toContain('loading="lazy"');
  });

  it('each badge is wrapped in an anchor linking to the corresponding workflow/file page', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    // The anchor iterates b.href from the badges array; each badge has `href:`
    expect(src).toContain('href={b.href}');
    // All four badge objects define a href: entry
    const hrefEntries = src.match(/href:/g) ?? [];
    expect(hrefEntries.length).toBeGreaterThanOrEqual(4);
  });

  it('shields.io badges use flat-square style for dark-mode consistency', () => {
    const src = read('src/components/marketing/StatusBadgeStrip.astro');
    expect(src).toContain('flat-square');
  });
});

// ── index.astro integrations ──────────────────────────────────────────────────

describe('index.astro wave 4 integrations', () => {
  // The "/how-it-works" walkthrough (a template-marketing page about the
  // upstream template's own PR #136) was removed in the Foodie rebrand
  // (roadmap Issue 003), so the loop section no longer links to it.
  it('no longer links the removed /how-it-works/ page', () => {
    const src = read('src/pages/index.astro');
    expect(src).not.toContain("withBase('/how-it-works/')");
  });

  // Roadmap Issue 005 replaced the template landing (badge strip, "60-second
  // tour") with the Foodie one; the wrapper keeps only the agent-readable
  // JSON-LD and delegates the body to components/pages/Home.astro.
  it('renders the shared Foodie landing body instead of the template sections', () => {
    const src = read('src/pages/index.astro');
    expect(src).toContain('<Home lang={lang} />');
    expect(src).not.toContain('StatusBadgeStrip');
    expect(src).not.toContain('Read the 60-second tour');
  });
});
