import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Source-level guards for Wave 4 (docs surfaces) of docs/AUDIT-2026-06.md §4.5-4.6.
// Covers issues #140 (edit-link), #145 (stub migration). The #142 blog
// guards left with the blog (roadmap Issue 046).

const repoRoot = new URL('../../', import.meta.url).pathname;
const read = (p: string) => readFileSync(join(repoRoot, p), 'utf-8');

// ── 1. DocsLayout — "Edit this page" link (#140) ───────────────────────────

describe('DocsLayout — edit this page link (#140)', () => {
  it('contains the GitHub edit URL pattern', () => {
    const layout = read('src/layouts/DocsLayout.astro');
    expect(layout).toContain('${REPO_URL}/edit/main/src/content/docs/');
  });

  it('derives the edit URL from the slug prop, not a hardcoded path', () => {
    const layout = read('src/layouts/DocsLayout.astro');
    // The URL is built from template literal using editFilePath/editFileExt
    expect(layout).toContain('editUrl');
    expect(layout).toContain('editFilePath');
  });

  it('renders the edit link as an external link with noopener', () => {
    const layout = read('src/layouts/DocsLayout.astro');
    expect(layout).toContain('target="_blank"');
    expect(layout).toContain('rel="noopener noreferrer"');
  });

  it('places the edit link after the content slot and before prev/next nav', () => {
    const layout = read('src/layouts/DocsLayout.astro');
    // Look for the rendered href, not the variable declaration
    const editLinkIdx = layout.indexOf('href={editUrl}');
    const slotIdx = layout.indexOf('<slot />');
    const navIdx = layout.indexOf('rel="prev"');
    // edit link must come after <slot /> and before prev/next
    expect(editLinkIdx, 'href={editUrl} not found in layout').toBeGreaterThan(-1);
    expect(editLinkIdx).toBeGreaterThan(slotIdx);
    if (navIdx !== -1) {
      expect(editLinkIdx).toBeLessThan(navIdx);
    }
  });

  it('uses muted text styling (text-muted-foreground)', () => {
    const layout = read('src/layouts/DocsLayout.astro');
    expect(layout).toContain('text-muted-foreground');
  });
});

// ── 2. No stub pages (#145) ────────────────────────────────────────────────

describe('docs content — no "being migrated" stubs (#145)', () => {
  function collectMdFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectMdFiles(full));
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        files.push(full);
      }
    }
    return files;
  }

  it('zero docs pages contain "being migrated"', () => {
    const docsDir = join(repoRoot, 'src/content/docs');
    const mdFiles = collectMdFiles(docsDir);
    const stubs: string[] = [];
    for (const file of mdFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('being migrated')) {
        stubs.push(file.replace(repoRoot, ''));
      }
    }
    expect(stubs, `Found stub pages: ${stubs.join(', ')}`).toHaveLength(0);
  });

  // Adapted deliberately in roadmap Issue 043: the template's 19 Inceptor
  // pages were replaced by Foodie's docs (migrated from MkDocs). The guard is
  // the same — every page in the sidebar has real content — over the new set.
  it('every Foodie docs page has real content (>200 chars each)', () => {
    const expectedFiles = [
      'src/content/docs/index.mdx',
      'src/content/docs/getting-started/quick-start.md',
      'src/content/docs/getting-started/installation.md',
      'src/content/docs/getting-started/configuration.md',
      'src/content/docs/guides/development.md',
      'src/content/docs/guides/testing.md',
      'src/content/docs/guides/deployment.md',
      'src/content/docs/reference/state.md',
      'src/content/docs/reference/i18n.md',
      'src/content/docs/contributing/recipe-format.md',
      'src/content/docs/contributing/code.md',
    ];

    for (const file of expectedFiles) {
      const content = read(file);
      expect(content, `${file} is too short — still a stub?`).toSatisfy(
        (s: string) => s.length > 200,
      );
      expect(content, `${file} still contains "being migrated"`).not.toContain(
        'being migrated',
      );
    }
  });
});

