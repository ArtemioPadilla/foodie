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
    home: 'Accueil',
    gallery: 'Galerie',
    demos: 'Démos',
    docs: 'Documentation',
    blog: 'Blog',
    switchLanguage: 'English',
  },
  home: {
    // Hero
    kicker: 'scaffold de développement piloté par issues',
    title: 'Chaque build démarre',
    titleEmphasis: 'à pleine vitesse.',
    tagline:
      'Une méthode gouvernée et orchestrée par des agents : chaque fonctionnalité suit la même boucle — issue → Claude trie → PR → merge. La qualité et l’éthique sont imposées par le dépôt, pas par la discipline individuelle.',
    ctaPrimary: 'Démarrage rapide',
    ctaSecondary: 'Explorer la galerie',
    // Stats strip labels
    statPages: 'pages générées',
    statTests: 'fichiers de test',
    statComponents: 'composants',
    statJs: 'JS par défaut',
    // Loop section
    loopKicker: 'La boucle',
    loopHeading: 'Comment une fonctionnalité arrive en production',
    loopCta1: 'Lire le tour en 60 secondes',
    loopCta2: 'Voir une exécution réelle',
    loopCta3: 'Documentation complète du flux',
    loopFeedback: 'Un bug ? Cliquez sur la bulle de chat en bas à droite — elle crée une issue GitHub avec les diagnostics déjà remplis.',
    loopFeedbackHighlight: 'bulle de chat',
    // Loop steps
    loopStep1Title: 'Créez l’issue',
    loopStep1Body: 'Utilisez un modèle ou lancez la commande new-issue. Les diagnostics sont pré-remplis depuis le FeedbackFAB.',
    loopStep2Title: 'Confiez-la à Claude Code',
    loopStep2Body: 'prometeo planifie, forja implémente avec un test rouge→vert d’abord, centinela valide le build, les types, les tests et la barrière éthique.',
    loopStep3Title: 'La PR s’ouvre',
    loopStep3Body: 'Elle porte la référence de l’issue, les rapports des sous-agents et la checklist éthique en 8 points. La CI revalide à chaque push.',
    loopStep4Title: 'Merge',
    loopStep4Body: 'L’issue se ferme toute seule. Les captures de régression visuelle couvrent /gallery et /demos.',
    // Kit section
    kitKicker: 'Le kit',
    kitHeading: 'Ce qu’il contient',
    kitBrowseAll: 'tout voir',
    kitMoreCategories: 'catégories de plus dans la',
    kitMoreCategory: 'catégorie de plus dans la',
    kitGallery: 'galerie',
    kitView: 'voir',
    kitMore: 'plus',
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
    builtWith: 'Construit avec Astro, Tailwind, shadcn et Claude Code',
    license: 'Licence MIT',
  },
};
