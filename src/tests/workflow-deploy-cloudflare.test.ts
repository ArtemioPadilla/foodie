/**
 * deploy.yml — Cloudflare Pages at https://eat.cybere.co/ (ADR 0015).
 *
 * Source-text guards (no GitHub Actions runtime): the production job builds
 * at the root with the new origin and no repository slug, skips gracefully
 * without secrets, deploys with a SHA-pinned wrangler-action and manages the
 * domain idempotently; the old GitHub Pages site becomes a redirect only after
 * the new host answers; pull requests get previews without untrusted input
 * reaching a command line.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const deploy = readFileSync(resolve(process.cwd(), '.github/workflows/deploy.yml'), 'utf-8');
/** Workflow text without `#` comment lines. */
const steps = deploy
  .split('\n')
  .filter((l) => !/^\s*#/.test(l))
  .join('\n');

/** The block of one job: from `  <name>:` to the next top-level job. */
function job(name: string): string {
  const lines = steps.split('\n');
  const start = lines.findIndex((l) => l === `  ${name}:`);
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && /^ {2}[\w-]+:\s*$/.test(l));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

/** The body of every `run:` step (inline or block scalar). */
function runScripts(yaml: string): string[] {
  const lines = yaml.split('\n');
  const out: string[] = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(\s*)(?:- )?run:\s*(.*)$/);
    if (!m) return;
    if (m[2] !== '|') {
      out.push(m[2]!);
      return;
    }
    const indent = m[1]!.length;
    const body: string[] = [];
    for (const next of lines.slice(i + 1)) {
      if (next.trim() !== '' && next.length - next.trimStart().length <= indent) break;
      body.push(next);
    }
    out.push(body.join('\n'));
  });
  return out;
}

describe('deploy.yml — triggers and permissions', () => {
  it('is named Deploy and runs on push to main, pull requests and manual dispatch', () => {
    expect(deploy).toMatch(/^name: Deploy$/m);
    expect(deploy).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
    expect(deploy).toMatch(/^\s{2}pull_request:\s*$/m);
    expect(deploy).toMatch(/^\s{2}workflow_dispatch:\s*$/m);
  });

  it('defaults to read-only permissions; only the redirect job may write Pages', () => {
    expect(steps).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
    expect(job('cloudflare')).not.toMatch(/pages: write|id-token: write/);
    expect(job('preview')).not.toMatch(/pages: write|id-token: write|pull-requests: write/);
    expect(job('pages-redirect')).toMatch(/pages: write/);
    expect(job('pages-redirect')).toMatch(/id-token: write/);
  });

  it('pins every third-party action to a full commit SHA', () => {
    const uses = [...steps.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]!);
    expect(uses.length).toBeGreaterThan(0);
    for (const ref of uses) expect(ref, ref).toMatch(/@[0-9a-f]{40}$/);
    expect(deploy).toMatch(/cloudflare\/wrangler-action@[0-9a-f]{40} # v3\.\d+\.\d+/);
  });
});

describe('deploy.yml — cloudflare (production)', () => {
  const cf = job('cloudflare');

  it('skips pull requests', () => {
    expect(cf).toContain("if: github.event_name != 'pull_request'");
  });

  it('builds with Node 22 at the root, with the new origin, versions, Firebase secrets and FOODIE_DEPLOY', () => {
    expect(cf).toContain("node-version: '22'");
    expect(cf).toContain('ASTRO_BASE: /');
    expect(cf).toContain('SITE_ORIGIN: https://eat.cybere.co');
    expect(cf).toContain('PUBLIC_BUILD_SHA: ${{ github.sha }}');
    expect(cf).toContain('PUBLIC_VERSION: ${{ steps.version.outputs.version }}');
    expect(cf).toContain("FOODIE_DEPLOY: '1'");
    for (const key of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID']) {
      expect(cf).toContain(`PUBLIC_FIREBASE_${key}: \${{ secrets.PUBLIC_FIREBASE_${key} }}`);
    }
  });

  it('never sets PUBLIC_REPO_SLUG (repository links are opt-in)', () => {
    expect(steps).not.toContain('PUBLIC_REPO_SLUG');
  });

  it('without the Cloudflare secrets: a ::notice:: and skipped deploy steps, not a failure', () => {
    expect(cf).toMatch(/if \[ -z "\$CLOUDFLARE_API_TOKEN" \] \|\| \[ -z "\$CLOUDFLARE_ACCOUNT_ID" \]/);
    expect(cf).toContain('::notice title=Cloudflare Pages not configured::');
    expect(cf).toContain('configured=false');
    // Every step after the check is gated on it.
    const after = cf.slice(cf.indexOf('Check Cloudflare configuration'));
    const gated = after.split('- name: ').slice(1);
    expect(gated.length).toBeGreaterThanOrEqual(5);
    for (const s of gated.slice(1)) expect(s, s.split('\n')[0]).toContain("if: steps.cf.outputs.configured == 'true'");
  });

  it('ensures the project idempotently and deploys dist/ to the main branch', () => {
    expect(cf).toContain('/pages/projects');
    expect(cf).toMatch(/if \[ "\$status" = "404" \]/);
    expect(cf).toContain('production_branch: "main"');
    expect(cf).toContain('command: pages deploy dist --project-name=foodie --branch=main');
  });

  it('attaches eat.cybere.co idempotently and manages DNS only with a zone id', () => {
    expect(steps).toContain('CF_DOMAIN: eat.cybere.co');
    expect(cf).toContain('/pages/projects/${CF_PROJECT}/domains');
    expect(cf).toMatch(/test\("already"; "i"\)/);
    expect(cf).toContain('if [ -z "$CLOUDFLARE_ZONE_ID" ]; then');
    expect(cf).toContain('::notice title=DNS is a manual step::');
    expect(cf).toContain('/zones/${CLOUDFLARE_ZONE_ID}/dns_records');
    expect(cf).toContain('proxied: true');
  });

  it('keeps secrets out of shell scripts (they arrive through env)', () => {
    expect(runScripts(deploy).length).toBeGreaterThanOrEqual(8);
    for (const script of runScripts(deploy)) expect(script).not.toMatch(/\$\{\{\s*secrets\./);
  });
});

describe('deploy.yml — pages-redirect', () => {
  const redirect = job('pages-redirect');

  it('runs only after a real Cloudflare deploy', () => {
    expect(redirect).toContain('needs: cloudflare');
    expect(redirect).toContain("if: needs.cloudflare.outputs.deployed == 'true'");
  });

  it('polls the new host (~5 min) for the new build before touching GitHub Pages', () => {
    expect(redirect).toMatch(/for attempt in \$\(seq 1 30\)/);
    expect(redirect).toContain('sleep 10');
    expect(redirect).toContain("grep -q 'data-app-version'");
    expect(redirect).toContain('live=false');
    const live = redirect.slice(redirect.indexOf('id: live'));
    for (const s of live.split('- ').slice(1).filter((s) => /uses:|run:/.test(s))) {
      expect(s).toContain("if: steps.live.outputs.live == 'true'");
    }
  });

  it('builds the redirect site from the tested script and deploys it with the Pages actions', () => {
    expect(redirect).toContain('node scripts/build-pages-redirect.mjs --target "https://${CF_DOMAIN}" --base /foodie --out redirect-site');
    expect(redirect).toContain('actions/upload-pages-artifact@');
    expect(redirect).toContain('path: ./redirect-site');
    expect(redirect).toContain('actions/deploy-pages@');
  });
});

describe('deploy.yml — preview', () => {
  const preview = job('preview');

  it('runs for same-repository pull requests only', () => {
    expect(preview).toContain(
      "if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository",
    );
  });

  it('builds like production but keeps the default origin', () => {
    expect(preview).toContain('ASTRO_BASE: /');
    expect(preview).toContain("FOODIE_DEPLOY: '1'");
    expect(preview).not.toContain('SITE_ORIGIN');
  });

  it('sanitises the head branch before it reaches wrangler and never deploys to main', () => {
    expect(preview).toContain('HEAD_REF: ${{ github.head_ref }}');
    expect(preview).toContain("tr -c 'a-z0-9-' '-'");
    expect(preview).toContain('if [ -z "$alias" ] || [ "$alias" = "main" ]; then alias="pr-${PR_NUMBER}"; fi');
    expect(preview).toContain('command: pages deploy dist --project-name=foodie --branch=${{ steps.branch.outputs.name }}');
    expect(preview).not.toMatch(/--branch=\$\{\{ github\.head_ref/);
  });

  it('skips gracefully without the secrets', () => {
    expect(preview).toContain('::notice title=Preview skipped::');
    expect(preview.slice(preview.indexOf('Deploy the preview'))).toContain("if: steps.cf.outputs.configured == 'true'");
  });
});
