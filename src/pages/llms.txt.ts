import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE, REPO_URL, siteUrl } from '@/lib/site-meta';

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
  const blog = (await getCollection('blog'))
    .filter((p: CollectionEntry<'blog'>) => !p.data.draft)
    .sort((a: CollectionEntry<'blog'>, b: CollectionEntry<'blog'>) => +new Date(b.data.pubDate) - +new Date(a.data.pubDate));

  const docLine = (e: CollectionEntry<'docs'>) =>
    `- [${e.data.title}](${url(`/docs/${e.id === 'index' ? '' : `${e.id}/`}`)})${
      e.data.description ? `: ${e.data.description}` : ''
    }`;

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.longDescription}

Source: ${REPO_URL} (${SITE.license}). Agent/contributor context lives in
[CLAUDE.md](${REPO_URL}/blob/main/CLAUDE.md) — the sub-agent loop
(prometeo → forja → centinela), conventions and guardrails. Full docs as a
single file: [llms-full.txt](${url('/llms-full.txt')}).

## Start here

- [Home](${url('/')}): Foodie in English (also [Español](${url('/es/')}))
- [Docs](${url('/docs/')}): how the project is built and how to contribute
- [Component gallery](${url('/gallery/')}): the UI kit Foodie's screens are built from, rendered live

## Docs

${docs.map(docLine).join('\n')}
- [Data model (schemas)](${url('/docs/reference/api/')}): every Zod schema in src/schemas, generated at build time

## Blog

${blog.map((p: CollectionEntry<'blog'>) => `- [${p.data.title}](${url(`/blog/${p.id}/`)})${p.data.description ? `: ${p.data.description}` : ''}`).join('\n')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
