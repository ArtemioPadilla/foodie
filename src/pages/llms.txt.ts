import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE, REPO_URL, siteUrl } from '@/lib/site-meta';
import { flags } from '@/lib/flags';

/**
 * /llms.txt — the curated, agent-first index of this site
 * (https://llmstxt.org convention). Generated at build time from the same
 * content collections that render the pages, so it can't drift from the
 * site. Full docs text lives at /llms-full.txt.
 *
 * Identity lines come from src/lib/site-meta.ts (Foodie).
 */
export const GET: APIRoute = async ({ site }) => {
  const base = siteUrl(site, import.meta.env.BASE_URL);
  const url = (p: string) => `${base}${p.startsWith('/') ? p : `/${p}`}`;

  const docs = (await getCollection('docs')).sort((a: CollectionEntry<'docs'>, b: CollectionEntry<'docs'>) => a.id.localeCompare(b.id));

  const docLine = (e: CollectionEntry<'docs'>) =>
    `- [${e.data.title}](${url(`/docs/${e.id === 'index' ? '' : `${e.id}/`}`)})${
      e.data.description ? `: ${e.data.description}` : ''
    }`;

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.longDescription}

${
  // The repository is named only when the build opts in (PUBLIC_REPO_SLUG,
  // ADR 0015); the default build names none.
  REPO_URL
    ? `Source: ${REPO_URL} (${SITE.license}). Agent/contributor context lives in
[CLAUDE.md](${REPO_URL}/blob/main/CLAUDE.md) — the sub-agent loop
(prometeo → forja → centinela), conventions and guardrails. `
    : `License: ${SITE.license}. `
}Full docs as a single file: [llms-full.txt](${url('/llms-full.txt')}).

## Start here

- [Home](${url('/')}): Foodie in English (also [Español](${url('/es/')}) and [Français](${url('/fr/')}))
- [Docs](${url('/docs/')}): how the project is built and how to contribute
- [Recipes](${url('/recipes/')}) and [ingredients](${url('/ingredients/')}): the catalog, one static page per entry
${
  // The gallery is built only behind flags.experimentalGallery (roadmap
  // Issue 046) — never advertise a URL the production site does not serve.
  flags.experimentalGallery
    ? `- [Component gallery](${url('/gallery/')}): the UI kit Foodie's screens are built from, rendered live\n`
    : ''
}
## Docs

${docs.map(docLine).join('\n')}
- [Data model (schemas)](${url('/docs/reference/api/')}): every Zod schema in src/schemas, generated at build time
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
