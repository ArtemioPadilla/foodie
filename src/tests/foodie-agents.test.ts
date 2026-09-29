/**
 * Agents, FeedbackFAB wiring and GitHub templates pointed at Foodie (roadmap
 * Issue 007). Source-text guards: the sub-agents must read the migration
 * roadmap as their canonical plan and know the Foodie domain; the repo slug
 * must be single-sourced; the issue/PR templates must be the template's plus
 * the recipe-submission form; the bootstrap script must parse the roadmap.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');
const ROADMAP = 'docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md';

describe('.claude/agents — canonical plan is the migration roadmap', () => {
  it.each(['prometeo', 'forja', 'centinela'])('%s.md references the roadmap and not INTEGRATION-PLAN.md', (agent) => {
    const md = read(`.claude/agents/${agent}.md`);
    expect(md).toContain(ROADMAP);
    expect(md).not.toContain('INTEGRATION-PLAN');
  });

  it.each(['forja', 'centinela'])('%s.md carries a "Contexto Foodie" section with the domain rules', (agent) => {
    const md = read(`.claude/agents/${agent}.md`);
    expect(md).toMatch(/^## Contexto Foodie$/m);
    for (const marker of ['src/schemas/', 'src/stores/', 'withBase()', 'lang: Locale', 'MultiLangText', 'persistentAtom', 'risk:high', 'localStorage']) {
      expect(md, `${agent}.md should mention ${marker}`).toContain(marker);
    }
    // ethics tier trigger for auth surfaces and localStorage writes
    expect(md).toMatch(/\/auth`?-like/);
  });

  it('prometeo knows the roadmap milestones and the (roadmap #NNN) title convention', () => {
    const md = read('.claude/agents/prometeo.md');
    expect(md).toContain('v0.1 - Foundation');
    expect(md).toContain('v1.0 - Foodie on Inceptor');
    expect(md).toContain('(roadmap #NNN)');
    expect(md).toContain('scripts/create-issues.sh');
  });
});

// Adapted deliberately with ADR 0015: repository links became opt-in. The
// slug is still single-sourced in site-meta.ts, but nothing defaults it to the
// owner's repository any more — .env.example leaves it empty and the
// production deploy does not set it.
describe('repo slug — opt-in, single-sourced (ADR 0015)', () => {
  it('.env.example leaves PUBLIC_REPO_SLUG empty', () => {
    expect(read('.env.example')).toMatch(/^PUBLIC_REPO_SLUG=$/m);
  });

  it('FeedbackFAB and report-issue read the slug from site-meta (single source)', () => {
    expect(read('src/components/common/FeedbackFAB.astro')).toContain('SITE.repoSlug');
    expect(read('src/lib/report-issue.ts')).toContain('SITE.repoSlug');
    expect(read('src/lib/site-meta.ts')).toContain('repoSlug: parseRepoSlug(import.meta.env.PUBLIC_REPO_SLUG)');
  });

  it('every repository surface is gated on the slug', () => {
    expect(read('src/layouts/BaseLayout.astro')).toMatch(/issueReporting = SITE\.repoSlug !== null/);
    expect(read('src/layouts/BaseLayout.astro')).toContain('{issueReporting && <FeedbackFAB');
    expect(read('src/components/common/SiteHeader.astro')).toContain('{REPO_URL && (');
    expect(read('src/components/common/SiteFooter.astro')).toContain('...(REPO_URL');
    expect(read('src/components/pages/Home.astro')).toContain('{REPO_URL && (');
    expect(read('src/layouts/DocsLayout.astro')).toContain('{editUrl && (');
    expect(read('src/components/islands/MobileNavSheet.tsx')).toContain('{repoUrl ? (');
  });
});

describe('.github templates', () => {
  it('ships the template issue forms plus recipe-submission.yml, without the legacy .md pair', () => {
    for (const f of ['bug_report.yml', 'feature_request.yml', 'question.yml', 'story.yml', 'audit.yml', 'add_component.yml', 'recipe-submission.yml']) {
      expect(existsSync(resolve(root, `.github/ISSUE_TEMPLATE/${f}`)), f).toBe(true);
    }
    expect(existsSync(resolve(root, '.github/ISSUE_TEMPLATE/bug_report.md'))).toBe(false);
    expect(existsSync(resolve(root, '.github/ISSUE_TEMPLATE/feature_request.md'))).toBe(false);
  });

  it('recipe-submission.yml is an issue form with a JSON textarea and the recipe-submission label', () => {
    const tpl = read('.github/ISSUE_TEMPLATE/recipe-submission.yml');
    expect(tpl).toMatch(/^name:\s*Recipe submission/m);
    expect(tpl).toMatch(/^labels:\s*\n(\s*-\s*"[^"]+"\s*\n)+/m);
    expect(tpl).toContain('- "recipe-submission"');
    expect(tpl).toMatch(/id:\s*recipe-json/);
    expect(tpl).toMatch(/render:\s*json/);
    expect(tpl).toContain('src/schemas/recipe.ts');
    expect(tpl).toMatch(/\ben\b.*\bes\b.*\bfr\b/);
  });

  it('config.yml points at the Foodie repo, not the template', () => {
    const cfg = read('.github/ISSUE_TEMPLATE/config.yml');
    expect(cfg).toContain('github.com/ArtemioPadilla/foodie/');
    expect(cfg).not.toContain('ArtemioPadilla/inceptor');
  });

  it('PULL_REQUEST_TEMPLATE.md has Summary / Closes / TDD / ethics sections', () => {
    const pr = read('.github/PULL_REQUEST_TEMPLATE.md');
    expect(pr).toMatch(/^## Summary/m);
    expect(pr).toMatch(/^Closes #/m);
    expect(pr).toMatch(/^## TDD evidence/m);
    expect(pr).toMatch(/^## Ethics & UX checklist/m);
  });
});

describe('scripts/create-issues.sh — roadmap parser', () => {
  const sh = read('scripts/create-issues.sh');

  it('parses the roadmap ### Issue blocks and their metadata lines', () => {
    expect(sh).toContain(`SPEC="${ROADMAP}"`);
    expect(sh).toMatch(/\^### Issue \[0-9\]\{3\} — /);
    for (const field of ['Phase', 'Milestone', 'Labels', 'Branch', 'Depends on', 'Effort']) {
      expect(sh, field).toContain(`\\*\\*${field}\\*\\*`);
    }
    expect(sh).toContain('Acceptance criteria');
    expect(sh).toContain('Validation');
  });

  it('is a dry run by default and only calls gh with --apply', () => {
    expect(sh).toContain('APPLY=false');
    expect(sh).toContain('--apply) APPLY=true');
    expect(sh).toContain('gh issue create');
    expect(sh).toContain('gh label create');
    // gh is only required when applying
    expect(sh).toMatch(/if \$APPLY; then\n\s+command -v gh/);
  });

  it('the roadmap has exactly 48 issue blocks for it to create', () => {
    const headers = read(ROADMAP).match(/^### Issue \d{3} — /gm) ?? [];
    expect(headers).toHaveLength(48);
  });
});

// Adapted deliberately in roadmap Issue 044: the provisional CLAUDE.md of
// Issue 007 deferred its rewrite to #044; the rewritten file must still link
// the roadmap as the canonical plan, and must no longer call itself provisional.
describe('CLAUDE.md (rewritten for the finished stack, Issue 044)', () => {
  it('links the roadmap as the canonical plan and is no longer provisional', () => {
    const md = read('CLAUDE.md');
    expect(md).toContain(ROADMAP);
    expect(md).not.toMatch(/provisional|Until Issue 044/i);
    expect(md).not.toContain('INTEGRATION-PLAN');
  });
});
