import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Source-level guards for Wave 2 (trust & polish) of docs/AUDIT-2026-06.md §4, §5.
// Each assertion pins a specific code-level property so regressions are caught
// at the test layer before a deploy.

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf-8');

describe('audit wave 2 — trust & polish', () => {

  // ── 1. SiteFooter ────────────────────────────────────────────────────────
  describe('SiteFooter', () => {
    it('exists as a component file', () => {
      // If this throws the file is missing
      const footer = read('src/components/common/SiteFooter.astro');
      expect(footer.length).toBeGreaterThan(0);
    });

    it('is imported and rendered from BaseLayout', () => {
      const layout = read('src/layouts/BaseLayout.astro');
      expect(layout).toContain("import SiteFooter from '../components/common/SiteFooter.astro'");
      expect(layout).toContain('<SiteFooter />');
    });

    it('uses withBase() for all internal links', () => {
      const footer = read('src/components/common/SiteFooter.astro');
      // Every href that points to an internal path must go through withBase.
      // We assert the helper is imported and called.
      expect(footer).toContain("import { withBase } from '@/lib/href'");
      expect(footer).toMatch(/withBase\(/);
    });

    it('contains a GitHub link (single-sourced from site-meta)', () => {
      const footer = read('src/components/common/SiteFooter.astro');
      expect(footer).toContain('href={REPO_URL}');
    });

    it('contains an MIT license note', () => {
      const footer = read('src/components/common/SiteFooter.astro');
      expect(footer.toLowerCase()).toContain('mit');
    });

    it('renders the EN/ES/FR LangSwitcher', () => {
      const footer = read('src/components/common/SiteFooter.astro');
      expect(footer).toContain('<LangSwitcher');
      const switcher = read('src/components/common/LangSwitcher.astro');
      expect(switcher).toContain('hreflang={locale}');
      expect(switcher).toContain('localizedPath');
    });
  });

  // ── 2. BaseLayout head plumbing ─────────────────────────────────────────
  describe('BaseLayout', () => {
    it('derives canonical URL from Astro.site + Astro.url.pathname', () => {
      const layout = read('src/layouts/BaseLayout.astro');
      expect(layout).toContain('Astro.site');
      expect(layout).toContain('Astro.url.pathname');
      expect(layout).toContain('rel="canonical"');
    });

    it('emits hreflang alternates when the alternates prop is provided', () => {
      const layout = read('src/layouts/BaseLayout.astro');
      expect(layout).toContain('alternates');
      expect(layout).toContain('rel="alternate"');
      expect(layout).toContain('hreflang');
    });

    it('contains color-scheme meta tag', () => {
      const layout = read('src/layouts/BaseLayout.astro');
      expect(layout).toContain('name="color-scheme"');
      expect(layout).toContain('light dark');
    });

    it('has a skip-to-content link as the first interactive element in body', () => {
      const layout = read('src/layouts/BaseLayout.astro');
      // The skip link must target #main-content and carry sr-only classes
      expect(layout).toContain('href="#main-content"');
      expect(layout).toContain('sr-only');
      // It must appear before SiteHeader in the source (body order)
      const skipIdx = layout.indexOf('href="#main-content"');
      const headerIdx = layout.indexOf('<SiteHeader');
      expect(skipIdx).toBeLessThan(headerIdx);
    });
  });

  // ── 3. global.css ────────────────────────────────────────────────────────
  describe('global.css', () => {
    it('has color-scheme: light on :root / .light', () => {
      const css = read('src/styles/global.css');
      // color-scheme: light must appear inside the :root, .light block
      expect(css).toContain('color-scheme: light');
    });

    it('has color-scheme: dark on .dark', () => {
      const css = read('src/styles/global.css');
      expect(css).toContain('color-scheme: dark');
    });

    it('defines --destructive-foreground once via light-dark() (single source, Epic 25)', () => {
      const css = read('src/styles/global.css');
      // Epic 25 collapsed the hand-duplicated :root/.dark blocks into one
      // light-dark(<light>, <dark>) declaration per token — the token name
      // must appear exactly once, and that declaration must carry both
      // branches.
      const occurrences = (css.match(/--destructive-foreground:/g) ?? []).length;
      expect(occurrences).toBe(1);
      expect(css).toMatch(/--destructive-foreground:\s*light-dark\(\s*oklch\([^,]+\),\s*oklch\([^)]+\)\s*\)/);
    });

    it('maps --color-destructive-foreground in the @theme inline block', () => {
      const css = read('src/styles/global.css');
      expect(css).toContain('--color-destructive-foreground: var(--destructive-foreground)');
    });
  });

  // ── 4. index.astro — no hardcoded stats ──────────────────────────────────
  describe('index.astro stats', () => {
    it('does not hardcode the old "439" test count', () => {
      const page = read('src/pages/index.astro');
      expect(page).not.toContain("'439'");
      expect(page).not.toContain('"439"');
    });

    it('does not hardcode the old "60" pages count', () => {
      const page = read('src/pages/index.astro');
      // The string '60' as a standalone stat value should be gone;
      // it may still appear as part of e.g. line comments so we test for
      // the specific stat literal form used in the old code.
      expect(page).not.toContain("value: '60'");
      expect(page).not.toContain('value: "60"');
    });

    // Roadmap Issue 005: the Foodie landing's numbers are catalog counts read
    // at build time from public/data/*.json (the single source, D6) — never
    // hardcoded literals.
    it('computes recipe and ingredient counts from public/data at build time', () => {
      const home = read('src/components/pages/Home.astro');
      expect(home).toContain("from '../../../public/data/recipes.json'");
      expect(home).toContain("from '../../../public/data/ingredients.json'");
      expect(home).toContain("countOf(recipesData, 'recipes')");
      expect(home).toContain("countOf(ingredientsData, 'ingredients')");
      expect(home).not.toMatch(/value: '\d{2,}'/);
    });

    it('passes alternates prop to BaseLayout for hreflang', () => {
      const page = read('src/pages/index.astro');
      expect(page).toContain('alternates={alternates}');
    });
  });

  // ── 5. FeedbackFAB — panel centered (native <dialog> top-layer) ──────────
  describe('FeedbackFAB dialog centering', () => {
    it('dialog relies on native top-layer centering (m-auto), not corner pinning', () => {
      const fab = read('src/components/common/FeedbackFAB.astro');
      // Corner-pinning with fixed/bottom/right fights the UA stylesheet's
      // `inset: 0` and stretches the panel to the top-left (live bug,
      // user-reported). The dialog must center via margin:auto instead.
      expect(fab).toContain('m-auto');
      const dialogTag = fab.slice(fab.indexOf('<dialog'), fab.indexOf('</header>'));
      expect(dialogTag).not.toMatch(/fixed bottom-\d+ right-\d+/);
      expect(dialogTag).not.toContain('m-0"');
    });
  });

  // ── 6. SiteHeader language switcher ────────────────────────────────────
  describe('SiteHeader language switcher', () => {
    it('renders the EN/ES/FR LangSwitcher', () => {
      const header = read('src/components/common/SiteHeader.astro');
      expect(header).toContain('<LangSwitcher');
    });

    it('uses withBase() for the switcher hrefs', () => {
      const header = read('src/components/common/SiteHeader.astro');
      // Both links must go through withBase for subpath correctness
      // Locale-aware links are withBase(localizedPath(...)); assets are
      // withBase('/…') — both must go through the helper (roadmap Issue 005).
      const matches = header.match(/withBase\(/g) ?? [];
      // At minimum: the wordmark link, the favicon and the section links
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 7. es/index.astro ────────────────────────────────────────────────────
  // Updated for ES parity: /es/ is now a full translation matching the EN home
  // structure (hero + stats + loop + kit), not a minimal pattern-demo page.
  describe('es/index.astro', () => {
    it('has the product name (from site-meta) in the title, not a lowercase slug', () => {
      const page = read('src/pages/es/index.astro');
      // The old lowercase "<slug> — ES" title was one of the audit findings
      // (§4.6). The title is now `${SITE.name} — <tagline>` (Foodie rebrand).
      expect(page).toContain('title={`${SITE.name} —');
      expect(page).not.toMatch(/"[a-z]+ — ES"/);
    });

    it('passes alternates prop for hreflang', () => {
      const page = read('src/pages/es/index.astro');
      expect(page).toContain('alternates={alternates}');
    });

    // Roadmap Issue 005: the landing body moved to components/pages/Home.astro
    // (hero + honest stats + six feature cards + contribute CTA); every locale
    // wrapper renders it with its own `lang`, so parity is structural.
    it('is a thin wrapper over the shared Home body with the ES locale', () => {
      const page = read('src/pages/es/index.astro');
      expect(page).toContain("import Home from '@/components/pages/Home.astro'");
      expect(page).toContain("const lang = 'es' as const");
      expect(page).toContain('<Home lang={lang} />');
      const home = read('src/components/pages/Home.astro');
      for (const key of ['home.ctaPrimary', 'home.ctaSecondary', 'home.featuresHeading', 'home.statRecipes', 'home.contributeRecipe']) {
        expect(home).toContain(key);
      }
      expect(home.match(/home\.feature\dTitle/g)).toHaveLength(6);
    });
  });
});
