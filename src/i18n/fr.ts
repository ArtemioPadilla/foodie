import type { en } from './en';

/**
 * French dictionary — must structurally satisfy the English shape (`typeof
 * en`). Adding a key to `en.ts` produces a type error here until the French
 * version is provided. That's by design.
 *
 * These are the template's own keys, translated so the trilingual
 * infrastructure (roadmap Issue 004) ships complete; Foodie's product
 * dictionaries land in Issue 015.
 */
export const fr: typeof en = {
  nav: {
    // Site sections (roadmap Issue 005) + template surfaces kept for /docs and /gallery
    home: 'Accueil',
    recipes: 'Recettes',
    ingredients: 'Ingrédients',
    planner: 'Planificateur',
    shopping: 'Courses',
    pantry: 'Garde-manger',
    tracking: 'Journal',
    contribute: 'Contribuer',
    gallery: 'Galerie',
    demos: 'Démos',
    docs: 'Documentation',
    blog: 'Blog',
    github: 'GitHub',
    switchLanguage: 'English',
    main: 'Navigation principale',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menuTitle: 'Menu',
    menuDescription: 'Parcourir les sections de Foodie',
  },
  home: {
    // Foodie landing (roadmap Issue 005) — hero, honest stats, six feature cards, contribute CTA
    kicker: 'planification de repas hors ligne',
    title: 'Votre assistant personnel',
    titleEmphasis: 'de planification de repas.',
    tagline: 'Parcourez un catalogue trilingue de recettes et d’ingrédients, planifiez la semaine, générez une liste de courses consolidée, gérez votre garde-manger et suivez ce que vous mangez — sans compte, et hors ligne.',
    ctaPrimary: 'Parcourir les recettes',
    ctaSecondary: 'Créer un plan de repas',
    statRecipes: 'recettes',
    statIngredients: 'ingrédients',
    statLanguages: 'langues',
    statAccounts: 'compte requis',
    featuresKicker: 'ce que vous obtenez',
    featuresHeading: 'Tout ce dont vous avez besoin pour planifier vos repas',
    feature1Title: 'Explorateur de recettes',
    feature1Description: 'Parcourez des recettes de diverses cuisines avec des instructions détaillées et des informations nutritionnelles.',
    feature2Title: 'Catalogue d’ingrédients',
    feature2Description: 'Consultez les ingrédients par catégorie, étiquettes alimentaires, saisonnalité et conseils de conservation — dans votre langue.',
    feature3Title: 'Planificateur de repas',
    feature3Description: 'Planifiez vos repas de la semaine avec un calendrier en glisser-déposer.',
    feature4Title: 'Listes de courses',
    feature4Description: 'Générez des listes de courses à partir de vos plans avec consolidation intelligente des ingrédients.',
    feature5Title: 'Suivi du garde-manger',
    feature5Description: 'Tenez l’inventaire de ce que vous avez chez vous et repérez ce qui va expirer.',
    feature6Title: 'Journal alimentaire',
    feature6Description: 'Enregistrez vos repas, fixez des objectifs nutritionnels et suivez vos progrès.',
    readyToStart: 'Prêt à commencer à planifier ?',
    joinUsers: 'Foodie est open source. Ajoutez vos recettes, traduisez le catalogue ou signalez ce qui manque — chaque contribution arrive sous forme d’issue ou de pull request GitHub.',
    contributeRecipe: 'Contribuer une recette',
    viewSource: 'Voir le code source',
  },
  gallery: {
    title: 'Galerie de composants',
    tagline:
      'Parcourez l’ensemble des primitives shadcn sur Base UI et les graphiques thématisés, chacun rendu comme une île Astro.',
    cta: 'Ouvrir la galerie',
    // Bridge landing page (fr/gallery.astro)
    bridgeHeading: 'Pages de composants partagées',
    bridgeBody:
      'Les pages individuelles de chaque composant vivent sous /gallery/ et sont partagées entre les langues : le code et les démos interactives sont les mêmes, tandis que cette page d’accueil présente la galerie en français. Suivez le lien ci-dessus pour explorer les primitives et les graphiques thématisés.',
  },
  docsLanding: {
    title: 'Documentation',
    tagline: 'Guides, conventions et décisions d’architecture pour construire Foodie.',
    cta: 'Lire la documentation',
    // Bridge landing page (fr/docs.astro)
    bridgeHeading: 'Documentation partagée',
    bridgeBody:
      'Les guides et références complets vivent sous /docs/ et sont partagés entre les langues. Cette page d’accueil en français sert de point d’entrée ; suivez le lien ci-dessus pour lire les conventions, l’architecture et les décisions du scaffold.',
  },
  common: {
    showMore: 'Afficher {{count}} de plus',
    reviewCount: '{{count}} avis',
    reviewCount_plural: '{{count}} avis',
    checkedProgress: '{{checked}} / {{total}} cochés',
    maxTimeFormat: '≤{{time}}m',
  },
  footer: {
    quickLinks: 'Liens rapides',
    resources: 'Ressources',
    documentation: 'Documentation',
    reportIssue: 'Signaler un problème',
    contributing: 'Contribuer',
    language: 'Langue',
    license: 'Licence MIT',
  },
  notFound: {
    // 404.astro (EN-only page; links home per language)
    kicker: '404',
    title: 'Page introuvable',
    body: 'L’URL ne correspond à aucune page publiée — elle a peut-être changé pendant la reconstruction de Foodie, ou le lien contient une faute. Si un lien du site vous a amené ici, signalez-le avec la bulle de feedback dans le coin.',
    homeHeading: 'Retour à l’accueil dans votre langue',
    browseRecipes: 'Parcourir les recettes',
  },
  comingSoon: {
    // components/pages/ComingSoon.astro — placeholder for sections not yet migrated
    kicker: 'bientôt disponible',
    title: '{{section}} arrive bientôt',
    body: 'Foodie est reconstruit page par page sur une pile plus rapide et hors ligne. Cette section n’est pas encore disponible sur le nouveau site.',
    followProgress: 'Suivre l’avancement sur GitHub',
    backHome: 'Retour à l’accueil',
  },
};
