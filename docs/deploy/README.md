# Deploy

This scaffold ships static HTML + a service worker. Any free static host works.

Foodie deploys to **Cloudflare Pages** at <https://eat.cybere.co/> via the
workflow at `.github/workflows/deploy.yml` (ADR 0015) — see
[Cloudflare Pages](./cloudflare-pages.md) for the secrets, DNS and Firebase
steps. The old GitHub Pages site only serves a redirect.

Other targets (not used by Foodie):

- [Netlify](./netlify.md) — best PR-preview UX; free contact form
- [Vercel](./vercel.md) — best Astro detection; hobby tier non-commercial

## Things you must change before going live

1. **`SITE_ORIGIN`** — set it in the build env (or change
   `DEFAULT_SITE_ORIGIN` in `site.config.mjs`). Canonical URLs, the sitemap,
   `robots.txt`, OG tags and JSON-LD use it.
2. **`SECURITY.md`** — update the contact line with your email or kept-private channel.
3. **`public/og-source.svg` footer text** — the host printed on the OG image;
   change `SITE` in `scripts/generate-brand-assets.mjs` and run it with
   `--og-only`.
4. **`PUBLIC_REPO_SLUG`** — leave it unset unless the site should link its
   repository (ADR 0015).

## Things you can change later

- Custom domain (each host handles this differently; see individual guides)
- Analytics — wire to Plausible / Umami / etc. The scaffold ships no analytics
- Cookie banner — none needed for an analytics-free static site
