/**
 * CI/CD adapted to Foodie (roadmap Issue 006).
 *
 * Source-text guards over .github/ — no GitHub Actions runtime. They pin the
 * branch model (integration branch `inceptor`, `phase-*` working branches,
 * cutover to `main` in Issue 030), the static-only pipeline (no Python/MkDocs,
 * no backend archetypes) and the surviving gates (visual, lighthouse, catalog
 * validation, CodeQL + dependency review, grouped Dependabot).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');
const workflow = (name: string) => read(`.github/workflows/${name}`);
/** Workflow text without `#` comment lines — comments may legitimately name
 *  the tools that were removed; the steps must not. */
const steps = (yaml: string) => yaml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

describe('ci.yml — branch model + static pipeline', () => {
  const ci = workflow('ci.yml');

  it('runs on pushes to inceptor and phase-*/** and on PRs to inceptor and main', () => {
    expect(ci).toMatch(/push:\s*\n\s*branches:\s*\n(?:\s*-\s*.+\n)*\s*-\s*inceptor\b/);
    expect(ci).toContain("- 'phase-*/**'");
    expect(ci).toMatch(/pull_request:\s*\n\s*branches:\s*\[inceptor, main\]/);
  });

  it('keeps the build (npm run check) and actionlint jobs', () => {
    expect(ci).toContain('name: Build & Check');
    expect(ci).toContain('npm run check');
    expect(ci).toMatch(/^\s+actionlint:\s*$/m);
    // actionlint also gates pushes to the integration branch
    expect(ci).toContain("github.ref == 'refs/heads/inceptor'");
  });

  it('has no backend jobs (server-node / server-flask / python)', () => {
    expect(ci).not.toMatch(/^\s+server-node:\s*$/m);
    expect(ci).not.toMatch(/^\s+server-flask:\s*$/m);
    expect(ci).not.toContain('setup-python');
  });
});

describe('visual.yml + deploy-failure-issue.yml', () => {
  it('visual regression gates PRs to inceptor and main', () => {
    const visual = workflow('visual.yml');
    expect(visual).toMatch(/pull_request:\s*\n\s*branches:\s*\[inceptor, main\]/);
    expect(visual).toContain('npx playwright install --with-deps chromium');
    expect(visual).toContain('npx playwright test');
  });

  it('visual regression is a hard gate: no continue-on-error anywhere (roadmap #029)', () => {
    const visual = workflow('visual.yml');
    expect(visual).not.toMatch(/continue-on-error/);
  });

  it('deploy-failure-issue.yml is present and chained to the deploy workflow', () => {
    const dfi = workflow('deploy-failure-issue.yml');
    expect(dfi).toContain("workflows: ['Deploy to GitHub Pages']");
  });
});

describe('deploy.yml — Node 22 + ASTRO_BASE only', () => {
  const deploy = workflow('deploy.yml');

  it('deploys on push to main (activates at the cutover, Issue 030)', () => {
    expect(deploy).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(deploy).toMatch(/Issue 030|cutover/i);
  });

  it('builds with Node 22 and ASTRO_BASE, without MkDocs or Python', () => {
    expect(deploy).toContain("node-version: '22'");
    expect(deploy).toContain('ASTRO_BASE');
    expect(steps(deploy)).not.toMatch(/mkdocs|requirements\.txt|setup-python|pip install/i);
  });
});

describe('lighthouse.yml — lhci autorun over dist/', () => {
  it('runs lhci autorun with .lighthouserc.json after a build', () => {
    const lh = workflow('lighthouse.yml');
    expect(lh).toContain('npm run build');
    expect(lh).toContain('lhci autorun');
    expect(lh).toContain('.lighthouserc.json');
  });

  it('.lighthouserc.json serves dist/ and gates accessibility ≥ 0.9 and best-practices at error level', () => {
    const rc = JSON.parse(read('.lighthouserc.json')) as {
      ci: { collect: { staticDistDir: string; url: string[] }; assert: { assertions: Record<string, [string, { minScore?: number }]> } };
    };
    expect(rc.ci.collect.staticDistDir).toBe('./dist');
    expect(rc.ci.collect.url).toEqual(expect.arrayContaining(['http://localhost/index.html', 'http://localhost/es/index.html', 'http://localhost/fr/index.html']));
    const a11y = rc.ci.assert.assertions['categories:accessibility'];
    expect(a11y?.[0]).toBe('error');
    expect(a11y?.[1]?.minScore).toBeGreaterThanOrEqual(0.9);
    expect(rc.ci.assert.assertions['categories:best-practices']?.[0]).toBe('error');
  });
});

describe('validate-recipe-pr.yml — Zod catalog validation, no ajv', () => {
  const wf = workflow('validate-recipe-pr.yml');

  it('triggers on PRs touching public/data/*.json', () => {
    expect(wf).toMatch(/pull_request:\s*\n\s*paths:\s*\n\s*-\s*'public\/data\/\*\.json'/);
  });

  it('runs the catalog schema test and comments the result', () => {
    expect(wf).toContain('npm run test -- src/tests/catalog-schema.test.ts');
    expect(wf).toContain('actions/github-script');
    expect(wf).toContain('createComment');
    expect(steps(wf)).not.toMatch(/ajv/i);
  });

  it('documents the Phase 1 dependency on Issue 011 instead of failing silently', () => {
    expect(wf).toContain('Issue 011');
    expect(wf).toContain('::warning::');
  });
});

describe('security.yml + dependabot.yml', () => {
  it('security.yml keeps CodeQL and dependency-review; legacy security-scan.yml is gone', () => {
    const sec = workflow('security.yml');
    expect(sec).toContain('github/codeql-action/init');
    expect(sec).toContain('github/codeql-action/analyze');
    expect(sec).toContain('actions/dependency-review-action');
    expect(sec).toMatch(/pull_request:\s*\n\s*branches:\s*\[inceptor, main\]/);
    expect(existsSync(resolve(root, '.github/workflows/security-scan.yml'))).toBe(false);
  });

  it('security.yml stays active and audits the lockfile (roadmap Issue 047)', () => {
    const sec = workflow('security.yml');
    // Weekly cron + push: a push-less repo would get the schedule disabled.
    expect(sec).toMatch(/schedule:(?:\s*\n\s*#[^\n]*)*\s*\n\s*- cron: '[^']+'/);
    expect(sec).toMatch(/push:\s*\n\s*branches:\s*\[inceptor, main\]/);
    expect(sec).toContain('npm audit --audit-level=high');
    expect(sec).toContain('github/codeql-action/init@v4');
  });

  it('SECURITY.md states the Foodie secrets policy (roadmap Issue 047)', () => {
    const md = read('SECURITY.md');
    expect(md).toContain('ArtemioPadilla/foodie/security/advisories/new');
    expect(md).toContain('Only `PUBLIC_*` variables reach the browser');
    expect(md).toMatch(/restricts the API key to the\s+deployed origins/);
    expect(md).not.toContain('ArtemioPadilla/inceptor');
    // Every package.json override is justified in SECURITY.md.
    const pkg = JSON.parse(read('package.json')) as { overrides: Record<string, unknown> };
    for (const name of Object.keys(pkg.overrides).filter((n) => n !== '@vite-pwa/astro')) {
      expect(md, `override ${name} is not justified in SECURITY.md`).toContain(`\`${name}\``);
    }
  });

  it('unused template dev dependencies stay removed (roadmap Issue 047)', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of ['@anthropic-ai/sdk', 'ajv', 'ajv-cli', 'sharp', '@vitest/expect', '@dnd-kit/utilities']) {
      expect(all, name).not.toHaveProperty(name);
    }
  });

  it('dependabot groups astro / tanstack / tooling / firebase', () => {
    const bot = read('.github/dependabot.yml');
    for (const group of ['astro:', 'tanstack:', 'tooling:', 'firebase:']) {
      expect(bot).toMatch(new RegExp(`^\\s+${group}\\s*$`, 'm'));
    }
    expect(bot).toContain('- "firebase"');
    expect(bot).toContain('- "@firebase/*"');
  });
});

describe('legacy toolchain artifacts are removed', () => {
  it.each([
    '.github/workflows/lighthouse-ci.yml',
    '.github/workflows/lighthouse-localhost.yml',
    '.github/workflows/test.yml',
    '.github/workflows/security-scan.yml',
    '.lighthouserc.localhost.json',
    '.lighthouserc.production.json',
    'Makefile',
    'MAKEFILE.md',
    '.actrc',
    'mkdocs.yml',
    'requirements.txt',
    'DOCS_DEPLOYMENT_SETUP.md',
  ])('%s does not exist', (file) => {
    expect(existsSync(resolve(root, file))).toBe(false);
  });
});
