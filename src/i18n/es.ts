import type { en } from './en';

/**
 * Spanish dictionary — must structurally satisfy the English shape. Adding a
 * key to `en.ts` produces a type error here until the Spanish version is
 * provided. That's by design.
 */
export const es: typeof en = {
  nav: {
    // Site sections (roadmap Issue 005) + template surfaces kept for /docs and /gallery
    home: 'Inicio',
    recipes: 'Recetas',
    ingredients: 'Ingredientes',
    planner: 'Planificador',
    shopping: 'Compras',
    pantry: 'Despensa',
    tracking: 'Diario',
    contribute: 'Contribuir',
    gallery: 'Galería',
    demos: 'Demos',
    docs: 'Documentación',
    blog: 'Blog',
    github: 'GitHub',
    switchLanguage: 'English',
    main: 'Navegación principal',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    menuTitle: 'Menú',
    menuDescription: 'Explora las secciones de Foodie',
  },
  home: {
    // Foodie landing (roadmap Issue 005) — hero, honest stats, six feature cards, contribute CTA
    kicker: 'planificación de comidas offline-first',
    title: 'Tu asistente personal',
    titleEmphasis: 'para planificar comidas.',
    tagline: 'Explora un catálogo trilingüe de recetas e ingredientes, planifica la semana, genera una lista de compras consolidada, controla tu despensa y registra lo que comes — sin cuenta y funciona sin conexión.',
    ctaPrimary: 'Explorar recetas',
    ctaSecondary: 'Crear un plan de comidas',
    statRecipes: 'recetas',
    statIngredients: 'ingredientes',
    statLanguages: 'idiomas',
    statAccounts: 'cuentas necesarias',
    featuresKicker: 'lo que obtienes',
    featuresHeading: 'Todo lo que necesitas para planificar comidas',
    feature1Title: 'Explorador de recetas',
    feature1Description: 'Explora recetas de varias cocinas con instrucciones detalladas e información nutricional.',
    feature2Title: 'Catálogo de ingredientes',
    feature2Description: 'Consulta ingredientes por categoría, etiquetas dietéticas, temporada y consejos de conservación — en tu idioma.',
    feature3Title: 'Planificador de comidas',
    feature3Description: 'Planifica tus comidas semanales con un calendario de arrastrar y soltar.',
    feature4Title: 'Listas de compras',
    feature4Description: 'Genera listas de compras desde tus planes con consolidación inteligente de ingredientes.',
    feature5Title: 'Seguimiento de despensa',
    feature5Description: 'Lleva el inventario de lo que tienes en casa y mira qué está por caducar.',
    feature6Title: 'Diario de comidas',
    feature6Description: 'Registra comidas, fija objetivos nutricionales y sigue tu progreso.',
    readyToStart: '¿Listo para empezar a planificar?',
    joinUsers: 'Foodie es código abierto. Añade tus recetas, traduce el catálogo o reporta lo que falta — cada contribución llega como issue o pull request en GitHub.',
    contributeRecipe: 'Contribuir una receta',
    viewSource: 'Ver el código',
  },
  gallery: {
    title: 'Galería de componentes',
    tagline:
      'Explora el conjunto completo de primitivas shadcn sobre Base UI y las gráficas con tema, cada una renderizada como una isla de Astro.',
    cta: 'Abrir la galería',
    // Bridge landing page (es/gallery.astro)
    bridgeHeading: 'Páginas de componentes compartidas',
    bridgeBody:
      'Las páginas individuales de cada componente viven bajo /gallery/ y se comparten entre idiomas: el código y las demos interactivas son los mismos, mientras que esta portada presenta la galería en español. Sigue el enlace de arriba para explorar las primitivas y las gráficas con tema.',
  },
  docsLanding: {
    title: 'Documentación',
    tagline:
      'Guías, convenciones y decisiones de arquitectura para construir Foodie.',
    cta: 'Leer la documentación',
    // Bridge landing page (es/docs.astro)
    bridgeHeading: 'Documentación compartida',
    bridgeBody:
      'Las guías y referencias completas viven bajo /docs/ y se comparten entre idiomas. Esta portada en español sirve como punto de entrada; sigue el enlace de arriba para leer las convenciones, la arquitectura y las decisiones del scaffold.',
  },
  common: {
    showMore: 'Mostrar {{count}} más',
    reviewCount: '{{count}} reseña',
    reviewCount_plural: '{{count}} reseñas',
    checkedProgress: '{{checked}} / {{total}} marcados',
    maxTimeFormat: '≤{{time}}m',
  },
  footer: {
    quickLinks: 'Enlaces rápidos',
    resources: 'Recursos',
    documentation: 'Documentación',
    reportIssue: 'Reportar un problema',
    contributing: 'Cómo contribuir',
    language: 'Idioma',
    license: 'Licencia MIT',
  },
  notFound: {
    // 404.astro (EN-only page; links home per language)
    kicker: '404',
    title: 'Página no encontrada',
    body: 'La URL no coincide con ninguna página publicada — puede haberse movido mientras reconstruimos Foodie, o el enlace tiene un error. Si llegaste aquí desde un enlace del sitio, repórtalo con la burbuja de feedback de la esquina.',
    homeHeading: 'Ir al inicio en tu idioma',
    browseRecipes: 'Explorar recetas',
  },
  comingSoon: {
    // components/pages/ComingSoon.astro — placeholder for sections not yet migrated
    kicker: 'próximamente',
    title: '{{section}} está en camino',
    body: 'Foodie se está reconstruyendo página por página sobre un stack más rápido y offline-first. Esta sección aún no está disponible en el nuevo sitio.',
    followProgress: 'Seguir el progreso en GitHub',
    backHome: 'Volver al inicio',
  },
};
