import type { APIRoute } from 'astro';
import { robotsTxt } from '@/lib/robots';
import { SITE_ORIGIN } from '@/lib/site-meta';

/**
 * /robots.txt — generated at build time so the Sitemap URL always matches the
 * build's origin (`site`, from SITE_ORIGIN in site.config.mjs) and base
 * (ASTRO_BASE). Replaces the static public/robots.txt, whose hard-coded host
 * drifted every time the site moved (ADR 0015).
 */
export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt((site ?? new URL(SITE_ORIGIN)).origin, import.meta.env.BASE_URL), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
