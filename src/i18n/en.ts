/**
 * English dictionary. Adding a key here implicitly widens the shared
 * `Dictionary` type (`typeof en`), so other locales must add the same key
 * to satisfy it. That's the type-safe equivalent of "translation completeness".
 *
 * Keys are organized by page/section. Compound values that include inline HTML
 * (e.g. `<code>` snippets in flow steps) are kept in the page template itself
 * rather than here — only plain translatable strings live in the dictionary.
 */
export const en = {
  nav: {
    // Site sections (roadmap Issue 005) + template surfaces kept for /docs and /gallery
    home: 'Home',
    recipes: 'Recipes',
    ingredients: 'Ingredients',
    planner: 'Planner',
    shopping: 'Shopping',
    pantry: 'Pantry',
    tracking: 'Tracking',
    contribute: 'Contribute',
    gallery: 'Gallery',
    demos: 'Demos',
    docs: 'Docs',
    blog: 'Blog',
    github: 'GitHub',
    switchLanguage: 'Español',
    main: 'Main navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menuTitle: 'Menu',
    menuDescription: 'Browse Foodie sections',
  },
  home: {
    // Foodie landing (roadmap Issue 005) — hero, honest stats, six feature cards, contribute CTA
    kicker: 'offline-first meal planning',
    title: 'Your personal',
    titleEmphasis: 'meal planning assistant.',
    tagline: 'Browse a trilingual recipe and ingredient catalog, plan the week, generate a consolidated shopping list, keep your pantry in check and track what you eat — no account required, works offline.',
    ctaPrimary: 'Browse recipes',
    ctaSecondary: 'Create a meal plan',
    statRecipes: 'recipes',
    statIngredients: 'ingredients',
    statLanguages: 'languages',
    statAccounts: 'accounts required',
    featuresKicker: 'what you get',
    featuresHeading: 'Everything you need for meal planning',
    feature1Title: 'Recipe browser',
    feature1Description: 'Browse recipes from many cuisines with detailed instructions and nutritional information.',
    feature2Title: 'Ingredient catalog',
    feature2Description: 'Look up ingredients by category, dietary tags, seasonality and storage tips — in your language.',
    feature3Title: 'Meal planner',
    feature3Description: 'Plan your weekly meals with an easy drag-and-drop calendar.',
    feature4Title: 'Shopping lists',
    feature4Description: 'Generate shopping lists from your meal plans with smart ingredient consolidation.',
    feature5Title: 'Pantry tracking',
    feature5Description: 'Keep an inventory of what you have at home and see what is about to expire.',
    feature6Title: 'Food diary',
    feature6Description: 'Log meals, set nutrition goals and follow your progress over time.',
    readyToStart: 'Ready to start planning?',
    joinUsers: 'Foodie is open source. Add your own recipes, translate the catalog or report what is missing — every contribution lands as a GitHub issue or pull request.',
    contributeRecipe: 'Contribute a recipe',
    viewSource: 'View the source',
  },
  gallery: {
    title: 'Component gallery',
    tagline:
      'Browse the full set of shadcn-on-Base-UI primitives and themed charts, each rendered as an Astro island.',
    cta: 'Open the gallery',
    // Bridge landing page (es/gallery.astro)
    bridgeHeading: 'Shared component pages',
    bridgeBody:
      'Individual component pages live under /gallery/ and are shared across locales: the code and interactive demos are the same, while this landing introduces the gallery in Spanish. Follow the link above to explore the primitives and themed charts.',
  },
  docsLanding: {
    title: 'Documentation',
    tagline:
      'Guides, conventions, and architecture decisions for building Foodie.',
    cta: 'Read the docs',
    // Bridge landing page (es/docs.astro)
    bridgeHeading: 'Shared documentation',
    bridgeBody:
      'Complete guides and references live under /docs/ and are shared across locales. This Spanish landing is the entry point; follow the link above to read the conventions, architecture, and scaffold decisions.',
  },
  /**
   * Shared strings that exercise `t()` interpolation (`{{name}}`) and plural
   * (`_plural`) resolution — ported from the legacy translation.json so the
   * mechanism is covered by real keys (see src/i18n/index.test.ts).
   */
  common: {
    showMore: 'Show {{count}} more',
    reviewCount: '{{count}} review',
    reviewCount_plural: '{{count}} reviews',
    checkedProgress: '{{checked}} / {{total}} checked',
    maxTimeFormat: '≤{{time}}m',
  },
  footer: {
    quickLinks: 'Quick links',
    resources: 'Resources',
    documentation: 'Documentation',
    reportIssue: 'Report an issue',
    contributing: 'Contributing',
    language: 'Language',
    license: 'MIT License',
  },
  notFound: {
    // 404.astro (EN-only page; links home per language)
    kicker: '404',
    title: 'Page not found',
    body: 'The URL does not match any built page — it may have moved while Foodie is being rebuilt, or there is a typo in the link. If a link on this site brought you here, please report it with the feedback bubble in the corner.',
    homeHeading: 'Go home in your language',
    browseRecipes: 'Browse recipes',
  },
  comingSoon: {
    // components/pages/ComingSoon.astro — placeholder for sections not yet migrated
    kicker: 'coming soon',
    title: '{{section}} is on its way',
    body: 'Foodie is being rebuilt page by page on a faster, offline-first stack. This section is not live on the new site yet.',
    followProgress: 'Follow progress on GitHub',
    backHome: 'Back to home',
  },
};
