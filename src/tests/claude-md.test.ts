import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Reads CLAUDE.md relative to this test file so the path works regardless
// of where vitest is invoked from.
const md = readFileSync(
  fileURLToPath(new URL('../../CLAUDE.md', import.meta.url)),
  'utf-8',
);

describe('CLAUDE.md', () => {
  // Foodie moved to Astro 7 to clear the npm-audit advisories before the
  // cutover (ADR 0011, roadmap #030); the template pinned 5.x here.
  it('lists installed Astro version', () => {
    expect(md).toMatch(/astro.*7\./i);
  });

  it('documents the Claude Code orchestration workflow', () => {
    expect(md.toLowerCase()).toMatch(/orchestrat/);
  });

  it('documents the compound-component gotcha', () => {
    expect(md.toLowerCase()).toMatch(/compound[\s-]?component/);
    expect(md.toLowerCase()).toMatch(/cannot span (multiple )?islands/);
  });

  it('shows a concrete example fix', () => {
    expect(md).toMatch(/ShowcaseDialog|MyDialogIsland|client:visible/);
  });

  it('documents sub-agents prometeo / forja / centinela', () => {
    expect(md).toMatch(/prometeo/);
    expect(md).toMatch(/forja/);
    expect(md).toMatch(/centinela/);
  });

  // Roadmap Issue 044: the rewrite for the finished stack.
  it('stays within 400 lines', () => {
    expect(md.split('\n').length).toBeLessThanOrEqual(400);
  });

  it.each([
    'Overview',
    'Commands',
    'Architecture',
    'Conventions',
    'Rules',
    'Data and state',
    'i18n',
    'Testing',
    'Deploy',
    'Roadmap status',
  ])('has a "%s" section', (heading) => {
    expect(md).toMatch(new RegExp(`^## ${heading}\\b`, 'm'));
  });

  it('lists the six Inceptor warnings plus the Zod, withBase and lang rules', () => {
    for (const rule of ['@astrojs/tailwind', 'Context', 'whole app in one island', '@radix-ui', '@tremor/react', 'framer-motion']) {
      expect(md).toContain(rule);
    }
    expect(md).toMatch(/Zod at every boundary/);
    expect(md).toContain('withBase()');
    expect(md).toMatch(/`lang` is a prop/);
  });

  it('indexes the Foodie ADRs and documents the preview-under-agent note', () => {
    for (const adr of ['0001', '0002', '0010', '0011', '0012', '0013', '0014', '0015']) {
      expect(md).toContain(`**${adr}**`);
    }
    expect(md).toContain('--ignore-lock');
  });
});
