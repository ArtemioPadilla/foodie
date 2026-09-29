import { describe, expect, it } from 'vitest';
import { buildIssueUrl, buildErrorReportBody, ISSUE_REPO, ISSUE_URL_MAX_LENGTH, issueUrlFits, issueUrlFor } from './report-issue';

// Repo links are opt-in (ADR 0015): the unit run sets no PUBLIC_REPO_SLUG, so
// the URL-shape tests pass a neutral placeholder repo explicitly.
const REPO = 'example-org/foodie';

describe('buildIssueUrl', () => {
  it('encodes title, body, labels into a GH new-issue URL', () => {
    const url = buildIssueUrl(
      {
        title: 'Hello',
        body: 'world',
        labels: ['bug', 'type:feat'],
      },
      REPO,
    )!;
    expect(url).toContain('github.com/');
    expect(url).toContain('issues/new?');
    expect(url).toContain('title=Hello');
    expect(url).toContain('body=world');
    expect(url).toMatch(/labels=bug.*type%3Afeat|labels=bug%2Ctype%3Afeat/);
  });

  it('omits body param when empty', () => {
    const url = buildIssueUrl({ title: 'Test', body: '' }, REPO)!;
    expect(url).not.toContain('body=');
  });

  it('omits labels param when array is empty', () => {
    const url = buildIssueUrl({ title: 'Test', labels: [] }, REPO)!;
    expect(url).not.toContain('labels=');
  });

  it('targets the given repo', () => {
    expect(buildIssueUrl({ title: 'x' }, REPO)).toMatch(/^https:\/\/github\.com\/example-org\/foodie\/issues\/new\?/);
  });

  it.runIf(!import.meta.env.PUBLIC_REPO_SLUG)('returns null when no repository is configured (the default build, ADR 0015)', () => {
    expect(ISSUE_REPO).toBeNull();
    expect(buildIssueUrl({ title: 'x' })).toBeNull();
    expect(buildIssueUrl({ title: 'x' }, null)).toBeNull();
  });

  it('has the correct URL shape (owner/repo agnostic for forks)', () => {
    // Assert the URL structure rather than a hardcoded repo slug so that forks
    // that set PUBLIC_REPO_SLUG still pass CI. The slug is validated separately.
    const url = buildIssueUrl({ title: 'x' }, REPO)!;
    expect(url).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/new/);
  });
});

describe('buildErrorReportBody', () => {
  it('includes the error name + message + stack', () => {
    const e = new Error('Boom');
    const body = buildErrorReportBody({ error: e, componentPath: 'RecipeBrowser › ul' });
    expect(body).toMatch(/Boom/);
    expect(body).toMatch(/Component path/);
    expect(body).toMatch(/RecipeBrowser/);
  });

  it('marks hydration mismatches explicitly', () => {
    const body = buildErrorReportBody({ error: new Error('x'), hydrationMismatch: true });
    expect(body).toMatch(/Hydration mismatch/);
  });

  it('marks non-hydration errors as Runtime error', () => {
    const body = buildErrorReportBody({ error: new Error('x'), hydrationMismatch: false });
    expect(body).toMatch(/Runtime error/);
  });

  it('omits componentPath line when not provided', () => {
    const body = buildErrorReportBody({ error: new Error('x') });
    expect(body).not.toMatch(/Component path/);
  });

  it('includes the Stack section', () => {
    const body = buildErrorReportBody({ error: new Error('x') });
    expect(body).toMatch(/## Stack/);
    expect(body).toMatch(/```/);
  });
});

describe('buildIssueUrl with an issue form (roadmap #039)', () => {
  it('puts the template first and prefills fields by id', () => {
    const url = issueUrlFor(REPO, {
      title: '[recipe] Soup',
      template: 'recipe-submission.yml',
      fields: { 'recipe-name': 'Soup', 'recipe-json': '{"id":"soup"}', notes: '' },
    });
    expect(url).toMatch(/\/issues\/new\?template=recipe-submission\.yml&title=/);
    const params = new URL(url).searchParams;
    expect(params.get('recipe-name')).toBe('Soup');
    expect(params.get('recipe-json')).toBe('{"id":"soup"}');
    expect(params.has('notes')).toBe(false);
  });

  it('issueUrlFits caps the URL at 8 KB', () => {
    expect(ISSUE_URL_MAX_LENGTH).toBe(8192);
    expect(issueUrlFits('x'.repeat(8192))).toBe(true);
    expect(issueUrlFits('x'.repeat(8193))).toBe(false);
  });
});
