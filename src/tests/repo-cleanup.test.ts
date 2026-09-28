/**
 * Roadmap Issue 042 — the in-repo half of closing PR #28: its two documents
 * are archived, and the maintainer runbook carries the closing comment (with
 * links to Issues 026/040/041 and the spec), the Dependabot PRs and the list
 * of dead branches. The GitHub-side actions themselves are the maintainer's.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('PR #28 archive (docs/archive/legacy-vite)', () => {
  it.each(['FIREBASE_SETUP.md', 'TEST_PLAN.md'])('%s is archived, not at the repo root', (file) => {
    expect(existsSync(resolve(root, 'docs/archive/legacy-vite', file))).toBe(true);
    expect(existsSync(resolve(root, file))).toBe(false);
  });
});

describe('docs/runbooks/repo-cleanup.md', () => {
  const runbook = read('docs/runbooks/repo-cleanup.md');

  it('closes PR #28 with a comment linking Issues 026, 040, 041 and the spec', () => {
    expect(runbook).toContain('gh pr close 28');
    for (const issue of ['Issue 026', 'Issue 040', 'Issue 041']) expect(runbook).toContain(issue);
    expect(runbook).toContain('docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md');
    expect(existsSync(resolve(root, 'docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md'))).toBe(true);
  });

  it('closes the Dependabot PRs #29–#35', () => {
    expect(runbook).toContain('for pr in 29 30 31 32 33 34 35');
  });

  it('deletes feat/tracking and the dead branches but keeps main, legacy, inceptor, phase-* and claude/*', () => {
    for (const branch of ['feat/tracking', 'auth-fix', 'icons', 'remove-mocks', 'copilot/sub-pr-3', 'fix-auth']) {
      expect(runbook).toContain(`\`${branch}\``);
    }
    expect(runbook).toContain("grep -Ev '^(main|legacy|inceptor|phase-.*|claude/.*)$'");
  });
});
