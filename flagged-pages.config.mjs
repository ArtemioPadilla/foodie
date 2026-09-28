/**
 * Flag-gated template pages (roadmap Issue 046).
 *
 * The Inceptor template shipped reference surfaces (component gallery, demos,
 * blocks, showcase, blog). Issue 046 removed everything except the component
 * gallery, which the agents use as the reference for the owned UI kit. The
 * gallery must not ship to Foodie's users, so its pages live outside
 * src/pages — in src/flagged-pages/, laid out exactly like src/pages — and
 * this integration injects them only when their flag is on.
 *
 * WHY injectRoute instead of a runtime check: the site is static. A page
 * under src/pages is always rendered, so "off" would still publish HTML (and
 * list it in the sitemap). Injecting the routes means a production build has
 * no /gallery/ page at all.
 *
 * WHY a plain .mjs module: astro.config.mjs runs in Node before Vite starts
 * (same reason as csp.config.mjs and site.config.mjs).
 */

const TRUTHY = ['1', 'true', 'on', 'yes'];
const FALSY = ['0', 'false', 'off', 'no'];

/**
 * Routes injected when the gallery flag is on: [route pattern, entrypoint].
 * `src/tests/route-parity.test.ts` checks that this list and the files in
 * src/flagged-pages/ match one to one.
 */
export const GALLERY_ROUTES = [
  ['/gallery', './src/flagged-pages/gallery/index.astro'],
  ['/gallery/[component]', './src/flagged-pages/gallery/[component].astro'],
  ['/es/gallery', './src/flagged-pages/es/gallery.astro'],
  ['/fr/gallery', './src/flagged-pages/fr/gallery.astro'],
];

/**
 * Whether the component gallery is built.
 *
 * `PUBLIC_FLAG_EXPERIMENTAL_GALLERY` decides when it is set (true/1/on/yes or
 * false/0/off/no). Unset, the gallery is on everywhere except the production
 * deploy — the build that sets `FOODIE_DEPLOY=1` (.github/workflows/deploy.yml).
 * So `npm run dev`, `npm run check`, the visual suite's `npm run build` and CI
 * keep the gallery; the published site does not.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function galleryEnabled(env) {
  const explicit = String(env.PUBLIC_FLAG_EXPERIMENTAL_GALLERY ?? '').trim().toLowerCase();
  if (TRUTHY.includes(explicit)) return true;
  if (FALSY.includes(explicit)) return false;
  const deploy = String(env.FOODIE_DEPLOY ?? '').trim().toLowerCase();
  return !TRUTHY.includes(deploy);
}

/**
 * Astro integration: injects the flag-gated routes whose flag is on.
 *
 * @param {{ gallery: boolean }} options
 * @returns {import('astro').AstroIntegration}
 */
export function flaggedPages({ gallery }) {
  return {
    name: 'foodie:flagged-pages',
    hooks: {
      'astro:config:setup': ({ injectRoute, logger }) => {
        if (!gallery) {
          logger.info('component gallery off (flags.experimentalGallery) — /gallery/ is not built');
          return;
        }
        for (const [pattern, entrypoint] of GALLERY_ROUTES) {
          injectRoute({ pattern, entrypoint, prerender: true });
        }
      },
    },
  };
}
