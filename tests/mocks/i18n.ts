import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'fr'],
  nonExplicitSupportedLngs: false,
  ns: ['translation'],
  defaultNS: 'translation',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: {
        // App
        'app.name': 'Foodie',
        'app.tagline': 'Your Personal Meal Planning Assistant',

        // Navigation
        'nav.home': 'Home',
        'nav.recipes': 'Recipes',
        'nav.planner': 'Meal Planner',
        'nav.shopping': 'Shopping List',
        'nav.pantry': 'Pantry',
        'nav.contribute': 'Contribute',

        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.sort': 'Sort',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.close': 'Close',
        'common.minutesAbbr': 'min',

        // Recipe
        'recipe.ingredients': 'Ingredients',
        'recipe.instructions': 'Instructions',
        'recipe.prepTime': 'Prep Time',
        'recipe.cookTime': 'Cook Time',
        'recipe.totalTime': 'Total Time',
        'recipe.servings': 'Servings',
        'recipe.difficulty': 'Difficulty',
        'recipe.cuisine': 'Cuisine',
        'recipe.difficulty_easy': 'Easy',
        'recipe.difficulty_medium': 'Medium',
        'recipe.difficulty_hard': 'Hard',

        // Recipes
        'recipes.title': 'Recipes',
        'recipes.search': 'Search recipes',
        'recipes.noResults': 'No recipes found',
        'recipes.servings': 'Servings',
        'recipes.prepTime': 'Prep Time',
        'recipes.cookTime': 'Cook Time',
        'recipes.totalTime': 'Total Time',

        // Meal Planner
        'planner.title': 'Meal Planner',
        'planner.week': 'Week',
        'planner.month': 'Month',
        'planner.addMeal': 'Add Meal',

        // Shopping List
        'shopping.title': 'Shopping List',
        'shopping.addItem': 'Add Item',
        'shopping.clear': 'Clear',

        // Pantry
        'pantry.title': 'Pantry',
        'pantry.addItem': 'Add Item',

        // Auth
        'auth.signIn': 'Sign In',
        'auth.signUp': 'Sign Up',
        'auth.signOut': 'Sign Out',
        'auth.email': 'Email',
        'auth.password': 'Password',
      },
    },
    es: {
      translation: {
        // App
        'app.name': 'Foodie',
        'app.tagline': 'Tu Asistente Personal de Planificación de Comidas',

        // Navigation
        'nav.home': 'Inicio',
        'nav.recipes': 'Recetas',
        'nav.planner': 'Planificador de Comidas',
        'nav.shopping': 'Lista de Compras',
        'nav.pantry': 'Despensa',
        'nav.contribute': 'Contribuir',

        // Common
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
      },
    },
    fr: {
      translation: {
        // App
        'app.name': 'Foodie',
        'app.tagline': 'Votre Assistant Personnel de Planification de Repas',

        // Navigation
        'nav.home': 'Accueil',
        'nav.recipes': 'Recettes',
        'nav.planner': 'Planificateur de Repas',
        'nav.shopping': 'Liste de Courses',
        'nav.pantry': 'Garde-manger',
        'nav.contribute': 'Contribuer',

        // Common
        'common.save': 'Enregistrer',
        'common.cancel': 'Annuler',
        'common.delete': 'Supprimer',
      },
    },
  },
});

export default i18n;
