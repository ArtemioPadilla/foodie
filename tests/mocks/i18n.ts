import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translation'],
  defaultNS: 'translation',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: {
      translation: {
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
  },
});

export default i18n;
