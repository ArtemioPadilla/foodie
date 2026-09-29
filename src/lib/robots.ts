/**
 * The /robots.txt body (served by src/pages/robots.txt.ts). The Sitemap URL is
 * built from the build's origin and base, so it follows SITE_ORIGIN and
 * ASTRO_BASE instead of a hard-coded host (ADR 0015).
 */
export function robotsTxt(origin: string, base: string): string {
  const dir = base.endsWith('/') ? base : `${base}/`;
  const sitemap = new URL(`${dir}sitemap-index.xml`, origin).toString();
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
}
