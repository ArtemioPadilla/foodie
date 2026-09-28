/**
 * Content-Security-Policy for the static build (roadmap Issue 035, ADR 0012).
 *
 * Astro 7's built-in `security.csp` emits a per-page
 * `<meta http-equiv="content-security-policy">` in BaseLayout's <head> with
 * SHA-256 hashes for every script and style Astro itself renders (island
 * bootstraps, hoisted/inlined module scripts, client directives, inlined
 * stylesheets). Two things it does not cover are handled here:
 *
 *   1. `is:inline` scripts (BaseLayout's zero-flash theme script, the
 *      first-visit locale redirect with `define:vars`, FeedbackFAB's
 *      diagnostics capture) are emitted verbatim and never hashed by Astro.
 *      `cspInlineScriptHashes()` is an integration that, after the build,
 *      hashes every executable inline <script> left in each page and adds
 *      the digest to that page's `script-src`. `src/tests/csp.test.ts`
 *      (`npm run test:dist`) fails if any inline script or <style> ends up
 *      uncovered.
 *   2. Origins: Firebase Auth (REST on *.googleapis.com, the popup handler
 *      iframe on PUBLIC_FIREBASE_AUTH_DOMAIN, the Google account chooser and
 *      the apis.google.com loader), Google Fonts, the GitHub REST API, and
 *      the flag-gated analytics / Sentry origins when they are configured.
 *
 * WHY a plain .mjs module: astro.config.mjs runs in Node before Vite starts,
 * so it cannot import TypeScript that uses `import.meta.env`.
 *
 * Meta-delivered CSP cannot express `frame-ancestors`, `report-uri` or
 * `sandbox`; if the site moves to a host that sets response headers, send
 * the same policy as a header instead.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Firebase project's auth domain. Used when PUBLIC_FIREBASE_AUTH_DOMAIN
 * is not set at build time; a fork with its own Firebase project sets the
 * env var and its domain replaces this one.
 */
export const DEFAULT_FIREBASE_AUTH_DOMAIN = 'foodie-cc553.firebaseapp.com';

/** @param {string | undefined} url */
function originOf(url) {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * <style> elements that libraries insert at runtime (or React SSR hoists into
 * <head>), with fixed text. `style-src` has no 'unsafe-inline' for elements,
 * so each one is allowed by hash:
 *   - Base UI's scrollbar-hiding sheet (`@base-ui-components/react`
 *     utils/styles.js, used by ScrollArea/Select/Menu…);
 *   - zag-js splitter's global drag cursor (`* { cursor: X !important; }`,
 *     splitter.dom + utils/registry, used by src/components/ui/splitter.tsx).
 * src/tests/csp.test.ts checks every <style> rendered into dist/ is covered;
 * a library upgrade that changes one of these strings shows up there (SSR) or
 * as a "Refused to apply inline style" console error in the smoke suite.
 */
export const RUNTIME_STYLE_TEXTS = [
  '.base-ui-disable-scrollbar{scrollbar-width:none}.base-ui-disable-scrollbar::-webkit-scrollbar{display:none}',
  ...[
    'col-resize',
    'row-resize',
    'e-resize',
    's-resize',
    'w-resize',
    'n-resize',
    'default',
    'move',
    'ew-resize',
    'ns-resize',
  ].map((cursor) => `* { cursor: ${cursor} !important; }`),
];

/** @param {string} content */
const sha256 = (content) => `sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}`;

const TRUTHY = new Set(['1', 'true', 'on', 'yes']);
/** @param {string | undefined} v */
const on = (v) => TRUTHY.has(String(v ?? '').trim().toLowerCase());

/**
 * Build the `security.csp` object for astro.config.mjs.
 *
 * @param {Record<string, string | undefined>} env  PUBLIC_* values (from Vite's loadEnv)
 */
export function buildCsp(env = {}) {
  const authDomain = (env.PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_AUTH_DOMAIN)
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  // Flag-gated third parties (src/lib/analytics.ts, src/lib/sentry.ts): only
  // allowed when the build actually turns them on.
  const analyticsOrigin = on(env.PUBLIC_FLAG_ANALYTICS)
    ? originOf(
        env.PUBLIC_ANALYTICS_SCRIPT_URL ||
          ((env.PUBLIC_ANALYTICS_PROVIDER || 'plausible') === 'umami'
            ? 'https://cloud.umami.is/script.js'
            : 'https://plausible.io/js/script.js'),
      )
    : undefined;
  const sentryOrigin = on(env.PUBLIC_FLAG_SENTRY) ? originOf(env.PUBLIC_SENTRY_DSN) : undefined;

  const extra = (/** @type {(string | undefined)[]} */ list) =>
    list.filter(Boolean).join(' ');

  return {
    algorithm: /** @type {const} */ ('SHA-256'),
    directives: [
      "default-src 'self'",
      // Firebase Auth REST (identitytoolkit / securetoken / www.googleapis.com),
      // the GitHub REST API (FeedbackFAB duplicate search, API demos).
      `connect-src 'self' https://*.googleapis.com https://api.github.com ${extra([analyticsOrigin, sentryOrigin])}`.trim(),
      // Firebase profile photos (Google / GitHub), README-style badges.
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://img.shields.io",
      "font-src 'self' data: https://fonts.gstatic.com",
      // signInWithPopup: the auth handler iframe + Google account chooser.
      `frame-src 'self' https://${authDomain} https://accounts.google.com`,
      "worker-src 'self'",
      "manifest-src 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ],
    scriptDirective: {
      // Astro appends the SHA-256 hashes of its own inline scripts; the
      // integration below appends the `is:inline` ones. apis.google.com hosts
      // the gapi loader Firebase uses for the Google popup flow.
      resources: [
        "'self'",
        'https://apis.google.com',
        'https://accounts.google.com',
        ...(analyticsOrigin ? [analyticsOrigin] : []),
      ],
    },
    styleDirective: {
      resources: [
        "'self'",
        'https://fonts.googleapis.com',
        // `style="…"` attributes rendered by React SSR / Astro (widths,
        // CSS custom properties). Scoped to `style-src-attr` only: <style>
        // elements still need 'self' or a hash.
        { resource: "'unsafe-inline'", kind: /** @type {const} */ ('attribute') },
      ],
      hashes: RUNTIME_STYLE_TEXTS.map(sha256),
    },
  };
}

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const CSP_META_RE = /(<meta\s+http-equiv="content-security-policy"\s+content=")([^"]*)(")\s*\/?>/i;
const EXECUTABLE_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

/** @param {string} attrs */
function scriptType(attrs) {
  const m = /\btype\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  return (m ? (m[2] ?? m[3] ?? m[4] ?? '') : '').trim().toLowerCase();
}

/**
 * Inline scripts the browser would execute (no `src`, JS type), in order.
 * Shared with src/tests/csp.test.ts so the guard and the fixer agree.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function executableInlineScripts(html) {
  /** @type {string[]} */
  const out = [];
  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1] ?? '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (!EXECUTABLE_TYPES.has(scriptType(attrs))) continue;
    out.push(m[2] ?? '');
  }
  return out;
}

/**
 * CSP source expression for a script/style body.
 * @param {string} content
 */
export function sha256Source(content) {
  return `'${sha256(content)}'`;
}

/**
 * Add `hashes` to the `script-src` directive of a CSP string (no-op for a
 * hash already there, or when script-src allows 'unsafe-inline').
 *
 * @param {string} policy
 * @param {string[]} hashes
 */
export function addScriptHashes(policy, hashes) {
  return policy.replace(/(^|;\s*)script-src ([^;]*)/, (whole, lead, values) => {
    const tokens = values.split(/\s+/).filter(Boolean);
    if (tokens.includes("'unsafe-inline'")) return whole;
    for (const h of hashes) if (!tokens.includes(h)) tokens.push(h);
    return `${lead}script-src ${tokens.join(' ')}`;
  });
}

/**
 * Astro renders the CSP meta with the rest of the head content, just before
 * </head> — after BaseLayout's inline scripts and the font stylesheet, which
 * a meta policy does not govern once they are parsed. Move it to right after
 * `<meta charset>` (or the `<head>` tag) so it covers the whole document.
 *
 * @param {string} html
 * @param {string} metaTag  the (updated) CSP meta element
 */
export function hoistCspMeta(html, metaTag) {
  const without = html.replace(/<meta\s+http-equiv="content-security-policy"[^>]*>/i, '');
  const charset = /<meta\s+charset=[^>]*>/i.exec(without);
  const anchor = charset ?? /<head\b[^>]*>/i.exec(without);
  if (!anchor) return html;
  const at = anchor.index + anchor[0].length;
  return `${without.slice(0, at)}${metaTag}${without.slice(at)}`;
}

/** @param {string} dir */
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

/**
 * Astro integration: hash the `is:inline` scripts Astro leaves unhashed and
 * add them to each page's CSP meta, then hoist that meta to the top of <head>. Must run before @vite-pwa/astro so the
 * service-worker precache revisions are computed from the final HTML.
 *
 * @returns {import('astro').AstroIntegration}
 */
export function cspInlineScriptHashes() {
  return {
    name: 'foodie:csp-inline-script-hashes',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let pages = 0;
        for await (const file of htmlFiles(fileURLToPath(dir))) {
          const html = await readFile(file, 'utf8');
          const meta = CSP_META_RE.exec(html);
          if (!meta) continue;
          const hashes = executableInlineScripts(html).map(sha256Source);
          const policy = addScriptHashes(meta[2] ?? '', hashes);
          const next = hoistCspMeta(html, `${meta[1]}${policy}${meta[3]}>`);
          if (next === html) continue;
          await writeFile(file, next);
          pages++;
        }
        logger.info(`added is:inline script hashes to ${pages} page(s)`);
      },
    },
  };
}
