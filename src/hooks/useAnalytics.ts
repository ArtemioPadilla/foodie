import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Google Analytics integration hook
 * Auto-tracks page views on route changes
 *
 * Setup:
 * 1. Add GA script to index.html
 * 2. Set VITE_GA_MEASUREMENT_ID in .env
 */
export function useAnalytics() {
  const location = useLocation();
  const GA_MEASUREMENT_ID = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !window.gtag) {
      return;
    }

    // Track page view
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location, GA_MEASUREMENT_ID]);

  // Event tracking functions
  const trackEvent = (
    eventName: string,
    eventParams?: Record<string, any>
  ) => {
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  };

  const trackRecipeView = (recipeId: string, recipeName: string) => {
    trackEvent('view_item', {
      item_id: recipeId,
      item_name: recipeName,
      item_category: 'Recipe',
    });
  };

  const trackRecipeSearch = (searchTerm: string) => {
    trackEvent('search', {
      search_term: searchTerm,
    });
  };

  const trackRecipeShare = (recipeId: string, method: string) => {
    trackEvent('share', {
      content_type: 'recipe',
      content_id: recipeId,
      method: method, // 'whatsapp', 'twitter', etc.
    });
  };

  const trackMealPlanCreate = () => {
    trackEvent('create_meal_plan');
  };

  const trackShoppingListGenerate = () => {
    trackEvent('generate_shopping_list');
  };

  const trackRecipeContribution = () => {
    trackEvent('contribute_recipe');
  };

  return {
    trackEvent,
    trackRecipeView,
    trackRecipeSearch,
    trackRecipeShare,
    trackMealPlanCreate,
    trackShoppingListGenerate,
    trackRecipeContribution,
  };
}
