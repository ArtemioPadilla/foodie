import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-level guards for the June 2026 audit Wave-1 production fixes
// (docs/AUDIT-2026-06.md §3, §5.3). Each assertion pins a fix that shipped
// after being reproduced on the live deploy.

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf-8');

describe('audit wave 1 — production fixes', () => {
  // ADR 0015: the static public/robots.txt became a build-time endpoint so the
  // Sitemap URL follows SITE_ORIGIN + ASTRO_BASE (it pointed at the old host
  // after every move). The same guard, now over the generator.
  it('robots.txt points at the real sitemap, not the placeholder domain', async () => {
    const { robotsTxt } = await import('../lib/robots');
    const robots = robotsTxt('https://eat.cybere.co', '/');
    expect(robots).not.toContain('.example');
    expect(robots).toContain('Sitemap: https://eat.cybere.co/sitemap-index.xml');
    expect(robotsTxt('https://eat.cybere.co', '/foodie/')).toContain('Sitemap: https://eat.cybere.co/foodie/sitemap-index.xml');
    expect(robotsTxt('https://eat.cybere.co', '/foodie')).toContain('Sitemap: https://eat.cybere.co/foodie/sitemap-index.xml');
    expect(read('src/pages/robots.txt.ts')).toContain('robotsTxt(');
  });

  it('PWA navigateFallback stays inside the configured base scope', () => {
    const config = read('astro.config.mjs');
    expect(config).toContain('navigateFallback: BASE');
    expect(config).not.toMatch(/navigateFallback:\s*'\/'/);
  });

  it('a custom 404 page exists so GitHub Pages stops serving its default', () => {
    const page = read('src/pages/404.astro');
    // Roadmap Issue 005: the copy comes from the dictionary (notFound.*) so
    // the page can offer the way home in every language.
    expect(page).toContain("t('en', 'notFound.title')");
    expect(read('src/i18n/en.ts')).toContain("title: 'Page not found'");
    expect(page).toContain('withBase(');
  });

  it('docs search resolves the Pagefind bundle under the deploy base', () => {
    const search = read('src/components/docs/DocsSearch.astro');
    expect(search).toContain('import.meta.env.BASE_URL');
    expect(search).not.toContain("['/', '_pagefind', '/pagefind.js']");
  });

  it('every Recharts wrapper disables the entry animation that left shapes invisible inside Astro islands', () => {
    for (const f of [
      'src/components/ui/charts/bar-chart.tsx',
      'src/components/ui/charts/donut-chart.tsx',
      'src/components/ui/charts/area-chart.tsx',
      'src/components/ui/charts/line-chart.tsx',
      'src/components/ui/charts/gauge.tsx',
      'src/components/ui/charts/sparkline.tsx',
    ]) {
      expect(read(f), `${f} must set isAnimationActive={false}`).toContain(
        'isAnimationActive={false}',
      );
    }
  });
});
