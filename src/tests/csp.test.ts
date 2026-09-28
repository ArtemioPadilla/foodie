import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Content-Security-Policy on the built site (roadmap Issue 035, ADR 0012).
 *
 * Built-site check over `dist/` (only with `--mode dist`, run by
 * `npm run check` right after the build via `npm run test:dist`). The policy
 * comes from `security.csp` in astro.config.mjs (built by csp.config.mjs);
 * this test is written independently of that module so it catches a fixer
 * that drifts. For every HTML page:
 *
 *   - exactly one `<meta http-equiv="content-security-policy">`, placed
 *     before any script, stylesheet or <style> so it governs all of them;
 *   - the Firebase Auth origins are allowed (`*.googleapis.com`,
 *     `accounts.google.com`, the auth domain) and nothing re-opens inline
 *     script execution (`'unsafe-inline'`) or `eval` outside the gallery
 *     pages that mount the live Playground;
 *   - no Google Fonts origin in the policy or the markup (fonts are
 *     self-hosted under public/fonts/);
 *   - Zod's JIT is off (`__zod_globalConfig.jitless`) before any module
 *     script, so its `new Function` probe never trips the policy;
 *   - every inline script the browser would execute and every inline
 *     <style> element is covered by a SHA-256 hash in the policy, so the
 *     page behaves the same with the CSP as without it.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(root, 'dist');
const runDist = import.meta.env.MODE === 'dist';

const AUTH_DOMAIN =
  (process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'foodie-cc553.firebaseapp.com').replace(
    /^https?:\/\//,
    '',
  );

const META_RE = /<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"\s*\/?>/gi;
// End tags as the HTML tokenizer ends raw text: `</script`, then `>`,
// whitespace or `/` (so `</script >` and `</SCRIPT\n>` close it too).
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script(?:[\s/][^>]*)?>/gi;
const STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style(?:[\s/][^>]*)?>/gi;
const GOOGLE_FONTS_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

/** Hostnames of every absolute or protocol-relative http(s) URL in `text`. */
function hostsIn(text: string): Set<string> {
  const hosts = new Set<string>();
  for (const [url] of text.matchAll(/(?:https?:)?\/\/[^\s"'<>()\\;,]+/gi)) {
    try {
      hosts.add(new URL(url, 'https://base.invalid').hostname.toLowerCase());
    } catch {
      // not a URL (e.g. a `//` comment) — nothing to check
    }
  }
  return hosts;
}
const allowsGoogleFonts = (text: string) => [...hostsIn(text)].some((h) => GOOGLE_FONTS_HOSTS.has(h));
const EXECUTABLE = new Set(['', 'text/javascript', 'application/javascript', 'module']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : [];
  });
}

const sha256 = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

function directives(policy: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) out.set(name, values);
  }
  return out;
}

function typeOf(attrs: string): string {
  const m = /\btype\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  return (m ? (m[2] ?? m[3] ?? m[4] ?? '') : '').trim().toLowerCase();
}

describe.runIf(runDist)('built site — Content-Security-Policy (roadmap #035)', () => {
  const pages = existsSync(DIST) ? walk(DIST) : [];

  it('builds pages to check', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it('every page carries one CSP meta ahead of its scripts and styles, covering them', () => {
    const problems: string[] = [];
    for (const file of pages) {
      const html = readFileSync(file, 'utf-8');
      const rel = relative(DIST, file);
      // Meta-refresh redirect stubs (astro.config `redirects`) have no head content.
      if (/<meta\s+http-equiv="refresh"/i.test(html) && !/<script\b/i.test(html)) continue;

      const metas = [...html.matchAll(META_RE)];
      if (metas.length !== 1) {
        problems.push(`${rel}: ${metas.length} CSP meta tags`);
        continue;
      }
      const meta = metas[0]!;
      const firstGoverned = html.search(/<script\b|<style\b|<link\b[^>]*rel="stylesheet"/i);
      if (firstGoverned !== -1 && firstGoverned < meta.index!) {
        problems.push(`${rel}: CSP meta comes after a script/stylesheet`);
      }

      const d = directives(meta[1]!.replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
      const scriptSrc = d.get('script-src') ?? [];
      const styleSrc = d.get('style-src') ?? [];
      const need = (dir: string, value: string) => {
        if (!(d.get(dir) ?? []).includes(value)) problems.push(`${rel}: ${dir} lacks ${value}`);
      };
      need('default-src', "'self'");
      need('connect-src', 'https://*.googleapis.com');
      need('frame-src', 'https://accounts.google.com');
      need('frame-src', `https://${AUTH_DOMAIN}`);
      need('script-src', 'https://accounts.google.com');
      need('object-src', "'none'");
      need('base-uri', "'self'");
      // Fonts are self-hosted (public/fonts/): no third-party font host.
      if (allowsGoogleFonts(meta[1]!)) problems.push(`${rel}: CSP allows a Google Fonts origin`);
      if (allowsGoogleFonts(html)) problems.push(`${rel}: references Google Fonts`);
      if (scriptSrc.includes("'unsafe-inline'")) problems.push(`${rel}: script-src allows 'unsafe-inline'`);
      // Zod's JIT probe (`new Function('')`) is a CSP violation: the theme
      // bootstrap turns it off before any module script can create a schema.
      const jitless = html.indexOf('__zod_globalConfig');
      const firstModule = html.search(/<script\b[^>]*type="module"/i);
      if (jitless === -1 || (firstModule !== -1 && firstModule < jitless)) {
        problems.push(`${rel}: Zod jitless config missing or set after a module script`);
      }
      const isPlaygroundPage = rel.startsWith('gallery/') && html.includes('Playground');
      if (scriptSrc.includes("'unsafe-eval'") && !isPlaygroundPage) {
        problems.push(`${rel}: script-src allows 'unsafe-eval'`);
      }

      for (const m of html.matchAll(SCRIPT_RE)) {
        const attrs = m[1] ?? '';
        if (/\bsrc\s*=/i.test(attrs) || !EXECUTABLE.has(typeOf(attrs))) continue;
        const h = sha256(m[2] ?? '');
        if (!scriptSrc.includes(h)) problems.push(`${rel}: inline script ${h} not in script-src`);
      }
      if (!styleSrc.includes("'unsafe-inline'")) {
        for (const m of html.matchAll(STYLE_RE)) {
          const h = sha256(m[1] ?? '');
          if (!styleSrc.includes(h)) problems.push(`${rel}: inline <style> ${h} not in style-src`);
        }
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });
});
