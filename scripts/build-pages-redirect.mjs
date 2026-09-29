#!/usr/bin/env node
// Build the tiny redirect site that replaces the old GitHub Pages deploy once
// the Cloudflare Pages site answers (ADR 0015; .github/workflows/deploy.yml,
// job `pages-redirect`).
//
//   node scripts/build-pages-redirect.mjs --target https://eat.cybere.co --base /foodie --out redirect-site
//
// Writes index.html and 404.html (GitHub Pages serves 404.html for every
// unknown path under the project), each of which sends
//   <base>/<path>?<query>#<hash>  →  <target>/<path>?<query>#<hash>
// with location.replace (so Back does not bounce). v1's encoded
// `<base>/?/recipes/rec_001&…` links arrive at the new root unchanged, where
// src/lib/legacy-redirect.ts decodes them. Without JavaScript, a meta refresh
// sends visitors to the new root. The pages carry no identity strings, are
// `noindex` and name the new host as canonical.
//
// localStorage is per origin: plans, lists and the diary saved on the old
// host do not follow the visitor. When the old origin still holds Foodie data,
// the page does NOT redirect straight away: it offers a download of that data
// (the /profile export format, `foodie-user-data` v1) and a link to continue.
//
// The old site registered a service worker (<base>/sw.js) that would keep
// serving the cached app. The redirect site ships a replacement sw.js that
// clears its caches, unregisters itself and reloads open tabs, so returning
// visitors reach the redirect page too. localStorage is never touched.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSiteOrigin } from '../site.config.mjs';

/**
 * Where a request on the old host goes. Pure, ES5 on purpose: its source is
 * inlined into the generated pages, so the unit test exercises the shipped
 * logic.
 *
 * @param {string} pathname - e.g. '/foodie/recipes/rec_001/'.
 * @param {string} search - e.g. '?servings=4' or ''.
 * @param {string} hash - e.g. '#nutrition' or ''.
 * @param {string} target - new origin, no trailing slash.
 * @param {string} base - old base path, e.g. '/foodie' ('' or '/' for none).
 * @returns {string}
 */
export function redirectTarget(pathname, search, hash, target, base) {
  var prefix = String(base || '').replace(/\/+$/, '');
  var path = String(pathname || '/');
  if (prefix && (path === prefix || path.indexOf(prefix + '/') === 0)) path = path.slice(prefix.length);
  // Collapse runs of slashes and backslashes: always a same-host path.
  path = ('/' + path).replace(/[\\/]+/g, '/');
  return target + path + (search || '') + (hash || '');
}

/**
 * Which localStorage keys hold user data worth carrying over (mirrors
 * src/lib/user-data.ts; a unit test keeps them aligned). UI-only choices
 * (theme, language), auth plumbing and the retired v1 GitHub token are left
 * out.
 */
export const MOVABLE_KEYS = {
  exact: ['favoriteRecipes', 'currentMealPlan', 'savedMealPlans', 'shoppingList', 'pantryItems', 'trackingEntries', 'nutritionGoals'],
  prefixes: ['user-preferences-', 'user-favorites-', 'foodie:'],
  ignore: [
    'foodie:auth-session',
    'foodie:mock-auth',
    'foodie:locale',
    'foodie:privacy-ack',
    'foodie:anon-merged',
    'github-access-token',
    'theme',
    'i18nextLng',
  ],
};

/**
 * @param {string} key
 * @param {{ exact: string[], prefixes: string[], ignore: string[] }} rules
 * @returns {boolean}
 */
export function isMovableKey(key, rules) {
  if (rules.ignore.indexOf(key) !== -1) return false;
  if (rules.exact.indexOf(key) !== -1) return true;
  for (var i = 0; i < rules.prefixes.length; i++) {
    if (key.indexOf(rules.prefixes[i]) === 0 && key.length > rules.prefixes[i].length) return true;
  }
  return false;
}

const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The redirect page (index.html and 404.html are identical).
 *
 * @param {{ target: string, base: string }} options
 * @returns {string}
 */
export function buildRedirectHtml({ target, base }) {
  const origin = resolveSiteOrigin(target);
  const root = `${origin}/`;
  const host = new URL(origin).host;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Foodie has moved</title>
<link rel="canonical" href="${escapeHtml(root)}">
<script>
(function () {
  ${redirectTarget.toString()}
  ${isMovableKey.toString()}
  var to = redirectTarget(location.pathname, location.search, location.hash, ${JSON.stringify(origin)}, ${JSON.stringify(base)});
  var keys = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key !== null && isMovableKey(key, ${JSON.stringify(MOVABLE_KEYS)})) keys.push(key);
    }
  } catch (e) {
    keys = [];
  }
  if (keys.length === 0) {
    location.replace(to);
    return;
  }
  document.documentElement.setAttribute('data-has-data', 'true');
  window.__foodieMove = { to: to, keys: keys.sort() };
})();
</script>
<noscript><meta http-equiv="refresh" content="0; url=${escapeHtml(root)}"></noscript>
<style>
body{font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5}
#data{display:none}
html[data-has-data] #data{display:block}
html[data-has-data] #moving{display:none}
button,a.continue{font:inherit;padding:.5rem 1rem;border-radius:.5rem;border:1px solid #059669;margin:.25rem .5rem .25rem 0;display:inline-block}
button{background:#059669;color:#fff;cursor:pointer}
</style>
</head>
<body>
<h1>Foodie has moved</h1>
<p id="moving">Foodie now lives at <a href="${escapeHtml(root)}">${escapeHtml(host)}</a>. You are being redirected.</p>
<div id="data">
<p>Foodie now lives at <strong>${escapeHtml(host)}</strong>. Your plans, lists and diary are saved in this browser for the old address and do not move by themselves.</p>
<p>Download them first to keep a copy, then continue to the new site.</p>
<p><button type="button" id="download">Download my data</button><a class="continue" id="continue" href="${escapeHtml(root)}">Continue to ${escapeHtml(host)}</a></p>
</div>
<script>
(function () {
  var move = window.__foodieMove;
  if (!move) return;
  document.getElementById('continue').href = move.to;
  document.getElementById('download').addEventListener('click', function () {
    var data = {};
    for (var i = 0; i < move.keys.length; i++) {
      var raw = localStorage.getItem(move.keys[i]);
      if (raw === null) continue;
      try { data[move.keys[i]] = JSON.parse(raw); } catch (e) { data[move.keys[i]] = raw; }
    }
    var now = new Date();
    var file = { format: 'foodie-user-data', version: 1, exportedAt: now.toISOString(), account: null, data: data };
    var url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'foodie-data-' + now.toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  });
})();
</script>
</body>
</html>
`;
}

/**
 * Kill-switch service worker for the old scope: replaces the old app's
 * worker, drops its caches, unregisters and reloads the open tabs.
 *
 * @returns {string}
 */
export function buildKillSwitchSw() {
  return `// Foodie moved (ADR 0015): retire the old app's service worker.
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        // Cache Storage is per origin and the old origin hosts other apps too:
        // delete only Foodie's caches (the Workbox precache names embed this
        // worker's scope; the runtime caches are Foodie's v1 and v2 names).
        var scope = self.registration.scope;
        var foodie = ['foodie-data', 'data-cache', 'google-fonts-cache', 'firebase-images-cache'];
        return Promise.all(
          keys
            .filter(function (key) { return key.indexOf(scope) !== -1 || foodie.indexOf(key) !== -1; })
            .map(function (key) { return caches.delete(key); }),
        );
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      }),
  );
});
`;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const target = arg('target', 'https://eat.cybere.co');
  const base = arg('base', '/foodie');
  const out = resolve(arg('out', 'redirect-site'));
  const html = buildRedirectHtml({ target, base });
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'index.html'), html);
  writeFileSync(resolve(out, '404.html'), html);
  writeFileSync(resolve(out, 'sw.js'), buildKillSwitchSw());
  // No Jekyll processing on GitHub Pages.
  writeFileSync(resolve(out, '.nojekyll'), '');
  console.log(`Redirect site written to ${out}: ${base}/* → ${resolveSiteOrigin(target)}/*`);
}
