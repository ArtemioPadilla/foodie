/**
 * Sidebar configuration for the /docs/* route.
 *
 * Each section is an object with a label and an array of pages or sub-groups.
 * Pages reference content-collection slugs (paths under src/content/docs/
 * without the .md / .mdx extension), except `reference/api`, which is the
 * Astro page generated from src/schemas (roadmap Issue 043).
 *
 * Single source of truth — used by:
 *   - src/components/docs/DocsSidebar.astro
 *   - src/components/docs/DocsBreadcrumb.astro
 *   - src/pages/docs/[...slug].astro (for next/prev navigation)
 */

export interface DocsLink {
  label: string;
  slug: string;
}

export interface DocsGroup {
  label: string;
  items: DocsLink[];
}

export const docsSidebar: DocsGroup[] = [
  {
    label: 'Getting started',
    items: [
      { label: 'Overview', slug: '' },
      { label: 'Quick start', slug: 'getting-started/quick-start' },
      { label: 'Installation', slug: 'getting-started/installation' },
      { label: 'Configuration', slug: 'getting-started/configuration' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { label: 'Development', slug: 'guides/development' },
      { label: 'Testing', slug: 'guides/testing' },
      { label: 'Deployment', slug: 'guides/deployment' },
    ],
  },
  {
    label: 'Reference',
    items: [
      // Generated from src/schemas at build time (src/pages/docs/reference/api.astro).
      { label: 'Data model (schemas)', slug: 'reference/api' },
      { label: 'State and storage', slug: 'reference/state' },
      { label: 'Internationalisation', slug: 'reference/i18n' },
    ],
  },
  {
    label: 'Contributing',
    items: [
      { label: 'Recipes', slug: 'contributing/recipe-format' },
      { label: 'Code', slug: 'contributing/code' },
    ],
  },
];

/** Flattened list of all docs pages in sidebar order — used for prev/next. */
export const docsOrder: DocsLink[] = docsSidebar.flatMap((g) => g.items);
