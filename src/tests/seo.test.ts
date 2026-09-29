import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n';
import { SITE_ORIGIN } from '../lib/site-meta';

/**
 * SEO contract (roadmap Issue 022).
 *
 * Two layers:
 *   1. Source guards (always run): BaseLayout emits the canonical / OG /
 *      Twitter tags, the sitemap integration declares the trilingual i18n
 *      alternates, and the catalog pages pass hreflang alternates.
 *   2. Built-site checks over `dist/` (only with `--mode dist`, i.e.
 *      `npm run test:seo`, which `npm run check` runs right after the build —
 *      so a stale or absent `dist/` never fails the parallel unit run):
 *      every page has a unique `<title>`, a `description`, and a canonical
 *      equal to origin + base + its own path; `sitemap-index.xml` lists the
 *      ~590 URLs with `xhtml:link` alternates per locale.
 *
 * The base is read back from the built sitemap, so the same test validates a
 * root build (`/`) and the GitHub Pages build (`ASTRO_BASE=/foodie`).
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string) => readFileSync(join(root, rel), 'utf-8');

describe('SEO source guards (roadmap #022)', () => {
  const layout = read('src/layouts/BaseLayout.astro');

  it('BaseLayout emits title, description, canonical, OG and Twitter card tags', () => {
    expect(layout).toMatch(/<title>\{title\}<\/title>/);
    expect(layout).toMatch(/<meta name="description" content=\{description\}/);
    expect(layout).toMatch(/<link rel="canonical" href=\{canonicalUrl\}/);
    for (const prop of ['og:title', 'og:description', 'og:image', 'og:url', 'og:locale']) {
      expect(layout).toContain(`property="${prop}"`);
    }
    expect(layout).toContain('name="twitter:card" content="summary_large_image"');
    expect(layout).toContain('name="twitter:image"');
  });

  it('the default OG image and the favicons go through withBase()', () => {
    expect(layout).toMatch(/withBase\('\/og-image\.png'\)/);
    expect(layout).toMatch(/href=\{withBase\('\/favicon\.svg'\)\}/);
    expect(existsSync(join(root, 'public/og-image.png'))).toBe(true);
  });

  it('the sitemap integration declares en/es/fr alternates', () => {
    const config = read('astro.config.mjs');
    expect(config).toMatch(/sitemap\(\{[\s\S]*i18n:\s*\{[\s\S]*defaultLocale:\s*'en'[\s\S]*locales:\s*\{\s*en:\s*'en',\s*es:\s*'es',\s*fr:\s*'fr'\s*\}/);
  });

  it.each(['recipes/[id]', 'ingredients/[id]', 'recipes/index', 'ingredients/index', 'index'])(
    'every locale wrapper of %s passes hreflang alternates',
    (page) => {
      for (const lang of LOCALES) {
        const file = `src/pages/${lang === 'en' ? '' : `${lang}/`}${page}.astro`;
        expect(read(file), file).toMatch(/alternates=\{/);
      }
    },
  );
});

// ── Built site ───────────────────────────────────────────────────────────────

const DIST = join(root, 'dist');
const runDist = import.meta.env.MODE === 'dist';

function htmlPages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!name.startsWith('_')) out.push(...htmlPages(path));
    } else if (name.endsWith('.html')) {
      out.push(path);
    }
  }
  return out;
}

const decode = (s: string) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (html: string, re: RegExp) => {
  const m = html.match(re);
  return m ? decode(m[1]!) : undefined;
};

describe.runIf(runDist)('built site — dist/ (npm run test:seo, roadmap #022)', () => {
  it('dist/ exists (run `npm run build` first)', () => {
    expect(existsSync(join(DIST, 'sitemap-index.xml'))).toBe(true);
  });

  const index = existsSync(join(DIST, 'sitemap-index.xml')) ? readFileSync(join(DIST, 'sitemap-index.xml'), 'utf-8') : '';
  // `<loc>https://origin/<base>sitemap-0.xml</loc>` → origin + base of this build.
  const firstSitemap = index.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? `${SITE_ORIGIN}/sitemap-0.xml`;
  const prefix = firstSitemap.replace(/sitemap-\d+\.xml$/, ''); // origin + base, trailing slash
  const sitemapFiles = [...index.matchAll(/<loc>[^<]*\/(sitemap-\d+\.xml)<\/loc>/g)].map((m) => m[1]!);
  const urls = sitemapFiles.flatMap((file) => {
    const xml = existsSync(join(DIST, file)) ? readFileSync(join(DIST, file), 'utf-8') : '';
    return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
      loc: m[1]!.match(/<loc>([^<]+)<\/loc>/)![1]!,
      alternates: [...m[1]!.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((a) => ({
        hreflang: a[1]!,
        href: a[2]!,
      })),
    }));
  });

  const pages = existsSync(DIST)
    ? htmlPages(DIST)
        .map((file) => ({ file, html: readFileSync(file, 'utf-8') }))
        // Redirect stubs (/docs/guides/github-pages-setup → deployment) and the 404 are not indexable pages.
        .filter(({ file, html }) => !/http-equiv="refresh"/.test(html) && !file.endsWith(`${sep}404.html`))
        .map(({ file, html }) => {
          const rel = relative(DIST, file).split(sep).join('/');
          const path = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '').replace(/\.html$/, '');
          return {
            path,
            title: attr(html, /<title>([^<]*)<\/title>/),
            description: attr(html, /<meta name="description" content="([^"]*)"/),
            canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
            ogImage: attr(html, /<meta property="og:image" content="([^"]*)"/),
            twitterCard: attr(html, /<meta name="twitter:card" content="([^"]*)"/),
          };
        })
    : [];

  it('the sitemap origin matches SITE_ORIGIN', () => {
    expect(prefix.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
  });

  it('builds the ~500+ pages: 50 recipes and 105 ingredients × 3 locales among them', () => {
    expect(pages.length).toBeGreaterThanOrEqual(500);
    for (const lang of LOCALES) {
      const loc = lang === 'en' ? '' : `${lang}/`;
      expect(pages.filter((p) => new RegExp(`^${loc}recipes/rec_\\d+/$`).test(p.path))).toHaveLength(50);
      expect(pages.filter((p) => new RegExp(`^${loc}ingredients/ing_\\d+/$`).test(p.path))).toHaveLength(105);
    }
  });

  it('every page has a non-empty, unique <title>', () => {
    const missing = pages.filter((p) => !p.title?.trim()).map((p) => p.path);
    expect(missing, 'pages without <title>').toEqual([]);
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const page of pages) {
      const other = seen.get(page.title!);
      if (other !== undefined) duplicates.push(`"${page.title}": /${other} and /${page.path}`);
      else seen.set(page.title!, page.path);
    }
    expect(duplicates, 'duplicate titles').toEqual([]);
  });

  it('every page has a meta description', () => {
    expect(pages.filter((p) => !p.description?.trim()).map((p) => p.path)).toEqual([]);
  });

  it('every canonical is origin + base + the page’s own path', () => {
    const wrong = pages.filter((p) => p.canonical !== `${prefix}${p.path}`).map((p) => `${p.path} → ${p.canonical}`);
    expect(wrong).toEqual([]);
  });

  it('every page has an absolute og:image under the base and a twitter:card', () => {
    const bad = pages
      .filter((p) => !p.ogImage || !/^https?:\/\//.test(p.ogImage) || (!p.ogImage.startsWith(prefix) && p.ogImage.startsWith(SITE_ORIGIN)) || !p.twitterCard)
      .map((p) => p.path);
    expect(bad).toEqual([]);
  });

  it('sitemap-index.xml lists every page, all under the base', () => {
    expect(urls.length).toBeGreaterThanOrEqual(500);
    expect(urls.filter((u) => !u.loc.startsWith(prefix)).map((u) => u.loc)).toEqual([]);
    const locs = new Set(urls.map((u) => u.loc));
    expect(pages.filter((p) => !locs.has(`${prefix}${p.path}`)).map((p) => p.path)).toEqual([]);
  });

  it('robots.txt ships and points at the production sitemap index', () => {
    const robots = readFileSync(join(DIST, 'robots.txt'), 'utf-8');
    expect(robots).toMatch(/^User-agent: \*$/m);
    // Generated from origin + base (src/pages/robots.txt.ts, ADR 0015), so it
    // points at this build's own sitemap index whatever the base.
    expect(robots).toContain(`Sitemap: ${prefix}sitemap-index.xml`);
  });

  it('catalog URLs carry xhtml:link alternates for en, es and fr', () => {
    const catalog = urls.filter((u) => /\/(recipes|ingredients)\/(rec|ing)_\d+\/$/.test(u.loc));
    expect(catalog).toHaveLength((50 + 105) * 3);
    for (const url of catalog) {
      expect(url.alternates.map((a) => a.hreflang).sort(), url.loc).toEqual(['en', 'es', 'fr']);
      const tail = url.loc.slice(prefix.length).replace(/^(es|fr)\//, '');
      expect(url.alternates.find((a) => a.hreflang === 'en')?.href).toBe(`${prefix}${tail}`);
      expect(url.alternates.find((a) => a.hreflang === 'es')?.href).toBe(`${prefix}es/${tail}`);
      expect(url.alternates.find((a) => a.hreflang === 'fr')?.href).toBe(`${prefix}fr/${tail}`);
    }
  });
});
