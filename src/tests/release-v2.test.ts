/**
 * Roadmap Issue 048 — the in-repo half of the v2.0.0 release.
 *
 * The tag, the GitHub Release, closing the roadmap issues and the milestone
 * are GitHub-side actions for the maintainer; they are listed, in order, in
 * docs/runbooks/github-actions-pending.md. These guards pin what the repo
 * itself must carry for that release: the CHANGELOG section, the version the
 * deploy injects, the post-migration backlog and the roadmap status.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');
const SPEC = 'docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md';

/** Body of one `## [x.y.z]` CHANGELOG section (up to the next `## [`). */
function changelogSection(md: string, version: string): string {
  const start = md.indexOf(`## [${version}]`);
  if (start === -1) return '';
  const next = md.indexOf('\n## [', start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe('CHANGELOG.md [2.0.0]', () => {
  const md = read('CHANGELOG.md');
  const section = changelogSection(md, '2.0.0');

  it('has a [2.0.0] section with Added, Changed, Removed and Security', () => {
    expect(section).not.toBe('');
    for (const heading of ['### Added', '### Changed', '### Removed', '### Security']) {
      expect(section).toContain(heading);
    }
  });

  it('folds the never-tagged 2.0.0-beta.1 section in (no separate heading left)', () => {
    expect(md).not.toMatch(/^## \[2\.0\.0-beta\.1\]/m);
    expect(md).toMatch(/^\[2\.0\.0\]: https:\/\/github\.com\/ArtemioPadilla\/foodie\/compare\/legacy-vite-1\.0\.0\.\.\.v2\.0\.0$/m);
    expect(md).toMatch(/^## \[Unreleased\]/m);
  });

  it('lists the removed v1 dependencies', () => {
    for (const dep of [
      'react-router-dom',
      'i18next',
      'react-i18next',
      'i18next-browser-languagedetector',
      'react-dnd',
      'react-dnd-html5-backend',
      '@octokit/rest',
      'vite-plugin-pwa',
      'workbox-window',
      'date-fns',
      'ajv-cli',
      '@anthropic-ai/sdk',
      '@dnd-kit/utilities',
    ]) {
      expect(section).toContain(`\`${dep}\``);
    }
  });

  it('names the deferred features (cloud sync, automatic recipe PRs, Tauri, iOS)', () => {
    expect(section).toMatch(/### Deferred/);
    for (const feature of [/cloud sync/i, /recipe pull requests/i, /Tauri/, /iOS/]) {
      expect(section).toMatch(feature);
    }
    expect(section).toContain('ROADMAP.md');
  });

  it('matches package.json (2.0.0)', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    const lock = JSON.parse(read('package-lock.json')) as { version: string; packages: Record<string, { version?: string }> };
    expect(pkg.version).toBe('2.0.0');
    expect(lock.version).toBe('2.0.0');
    expect(lock.packages['']?.version).toBe('2.0.0');
  });
});

describe('deploy.yml — PUBLIC_VERSION', () => {
  const deploy = read('.github/workflows/deploy.yml');

  it('reads the version from package.json and passes it to the build', () => {
    expect(deploy).toMatch(/require\('\.\/package\.json'\)\.version/);
    expect(deploy).toMatch(/PUBLIC_VERSION: \$\{\{ steps\.version\.outputs\.version \}\}/);
  });

  it('FeedbackFAB still reads PUBLIC_VERSION', () => {
    expect(read('src/components/common/FeedbackFAB.astro')).toContain('import.meta.env.PUBLIC_VERSION');
  });
});

describe('ROADMAP.md — post-migration backlog', () => {
  it('exists and carries the deferred items (D14 and follow-ups)', () => {
    expect(existsSync(resolve(root, 'ROADMAP.md'))).toBe(true);
    const md = read('ROADMAP.md');
    for (const item of [/cloud sync/i, /recipe pull requests/i, /Tauri/, /iOS/, /anonymous/i]) {
      expect(md).toMatch(item);
    }
    expect(md).toContain(SPEC);
    expect(md).toContain('docs/runbooks/github-actions-pending.md');
  });
});

describe('docs/runbooks/github-actions-pending.md', () => {
  const runbook = read('docs/runbooks/github-actions-pending.md');

  it('links the cutover and repo-cleanup runbooks', () => {
    expect(runbook).toContain('(cutover.md');
    expect(runbook).toContain('(repo-cleanup.md');
  });

  it('is one ordered checklist', () => {
    const steps = [...runbook.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]));
    expect(steps.length).toBeGreaterThanOrEqual(10);
    expect(steps).toEqual(steps.map((_, i) => (steps[0] ?? 0) + i));
  });

  it('covers every deferred GitHub-side action with its command', () => {
    for (const needle of [
      'git tag -a legacy-vite-1.0.0',
      'refs/heads/legacy',
      'refs/heads/$INTEGRATION',
      'bash scripts/create-issues.sh --apply',
      'branches/main/protection',
      'PUBLIC_FIREBASE_API_KEY',
      'PUBLIC_FIREBASE_AUTH_DOMAIN',
      'PUBLIC_FIREBASE_PROJECT_ID',
      'PUBLIC_FIREBASE_APP_ID',
      'has_discussions',
      'private-vulnerability-reporting',
      'code-scanning',
      'gh pr close 28',
      'for pr in 29 30 31 32 33 34 35',
      'git tag -a v2.0.0',
      'gh release create v2.0.0',
      '--reason completed',
      'milestones',
      'state=closed',
      'gh release view v2.0.0',
    ]) {
      expect(runbook).toContain(needle);
    }
  });

  it('tests the Firebase popup under the CSP before the merge', () => {
    expect(runbook).toMatch(/popup/i);
    expect(runbook).toMatch(/Content-Security-Policy|CSP/);
    expect(runbook).toMatch(/rotate/i);
  });
});

describe('roadmap spec — status and deviations (Issue 048)', () => {
  const spec = read(SPEC);

  it('header says implemented, pending GitHub actions', () => {
    expect(spec).toMatch(/^\*\*Estado:\*\* Implementado \(pendiente de acciones en GitHub\)/m);
  });

  it('has a status row with a commit for every roadmap issue', () => {
    const status = spec.slice(spec.indexOf('## 6. Estado de implementación'));
    expect(status.length).toBeGreaterThan(100);
    for (let n = 1; n <= 48; n += 1) {
      const id = String(n).padStart(3, '0');
      const row = status.split('\n').find((l) => l.startsWith(`| ${id} |`));
      expect(row, `status row for ${id}`).toBeDefined();
      if (n < 48) expect(row, `commit for ${id}`).toMatch(/`[0-9a-f]{7,}`/);
    }
  });

  it('consolidates the deviations', () => {
    const dev = spec.slice(spec.indexOf('## 7. Desviaciones'));
    for (const needle of ['ADR 0011', 'ADR 0014', '0010', '0013', '.ts', '/profile', 'client:visible', 'CSP', 'fuentes']) {
      expect(dev).toContain(needle);
    }
  });
});
