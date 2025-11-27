import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Ingredient } from '@/types';
import { useLanguage } from './LanguageContext';
import { safeGetItem, safeSetItem } from '@utils/storage';
import { cleanIngredientId } from '@utils/ingredientUtils';

/**
 * Ingredient Price Data
 */
interface IngredientPrice {
  price: number; // Price per unit
  unit: string; // Unit for pricing
  currency: string;
}

type DefaultPrices = Record<string, IngredientPrice>;
type CustomPrices = Record<string, number>;

interface IngredientContextType {
  ingredients: Ingredient[];
  loading: boolean;
  getIngredientById: (id: string) => Ingredient | undefined;
  getIngredientName: (id: string) => string;
  getIngredientsByCategory: (category: string) => Ingredient[];
  // Pricing methods
  getIngredientPrice: (ingredientId: string) => number | undefined;
  getIngredientCurrency: (ingredientId: string) => string;
  setIngredientPrice: (ingredientId: string, price: number) => void;
  resetIngredientPrice: (ingredientId: string) => void;
  resetAllPrices: () => void;
  isCustomPrice: (ingredientId: string) => boolean;
  hasCompleteData: (ingredientIds: string[]) => boolean;
  getPriceDataCoverage: (ingredientIds: string[]) => number;
}

const IngredientContext = createContext<IngredientContextType | undefined>(undefined);

export const IngredientProvider = ({ children }: { children: ReactNode }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultPrices, setDefaultPrices] = useState<DefaultPrices>({});
  const [customPrices, setCustomPrices] = useState<CustomPrices>({});
  const { getTranslated } = useLanguage();

  // Load ingredients
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/ingredients.json`);
        const data = await response.json();
        setIngredients(data.ingredients || []);
      } catch (error) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error('Failed to load ingredients:', error);
        }
        setIngredients([]);
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  }, []);

  // Load default ingredient prices
  useEffect(() => {
    async function loadDefaultPrices() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/ingredient-prices.json`);
        if (!response.ok) throw new Error('Failed to load prices');
        const data: DefaultPrices = await response.json();
        setDefaultPrices(data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Could not load ingredient prices:', error);
        }
        setDefaultPrices({});
      }
    }

    loadDefaultPrices();
  }, []);

  // Load custom prices from localStorage
  useEffect(() => {
    const stored = safeGetItem<CustomPrices>('customIngredientPrices', {});
    setCustomPrices(stored);
  }, []);

  const getIngredientById = (id: string): Ingredient | undefined => {
    return ingredients.find(ing => ing.id === id);
  };

  const getIngredientName = (id: string): string => {
    const ingredient = getIngredientById(id);
    if (!ingredient) return id; // Fallback to ID if not found
    return getTranslated(ingredient.name);
  };

  const getIngredientsByCategory = (category: string): Ingredient[] => {
    return ingredients.filter(ing => ing.category === category);
  };

  // Get price for an ingredient (custom overrides default)
  const getIngredientPrice = useCallback(
    (ingredientId: string): number | undefined => {
      const cleanId = cleanIngredientId(ingredientId);

      // Check custom prices first
      if (customPrices[cleanId] !== undefined) {
        return customPrices[cleanId];
      }

      // Fall back to default prices
      return defaultPrices[cleanId]?.price;
    },
    [customPrices, defaultPrices]
  );

  // Get currency for an ingredient
  const getIngredientCurrency = useCallback(
    (ingredientId: string): string => {
      const cleanId = cleanIngredientId(ingredientId);

      // Get currency from default prices, fallback to 'USD'
      return defaultPrices[cleanId]?.currency || 'USD';
    },
    [defaultPrices]
  );

  // Set custom price with validation
  const setIngredientPrice = useCallback((ingredientId: string, price: number) => {
    // Validate price
    if (!Number.isFinite(price) || price <= 0) {
      console.warn(`Invalid price: ${price}. Price must be a positive number.`);
      return;
    }

    const cleanId = cleanIngredientId(ingredientId);

    setCustomPrices((prev) => {
      const updated = { ...prev, [cleanId]: price };
      safeSetItem('customIngredientPrices', updated);
      return updated;
    });
  }, []);

  // Reset single ingredient to default
  const resetIngredientPrice = useCallback((ingredientId: string) => {
    const cleanId = cleanIngredientId(ingredientId);

    setCustomPrices((prev) => {
      const updated = { ...prev };
      delete updated[cleanId];
      safeSetItem('customIngredientPrices', updated);
      return updated;
    });
  }, []);

  // Reset all to defaults
  const resetAllPrices = useCallback(() => {
    setCustomPrices({});
    safeSetItem('customIngredientPrices', {});
  }, []);

  // Check if price is custom
  const isCustomPrice = useCallback(
    (ingredientId: string): boolean => {
      const cleanId = cleanIngredientId(ingredientId);
      return customPrices[cleanId] !== undefined;
    },
    [customPrices]
  );

  // Check if all ingredients have price data
  const hasCompleteData = useCallback(
    (ingredientIds: string[]): boolean => {
      return ingredientIds.every((id) => getIngredientPrice(id) !== undefined);
    },
    [getIngredientPrice]
  );

  // Get percentage of ingredients with price data
  const getPriceDataCoverage = useCallback(
    (ingredientIds: string[]): number => {
      if (ingredientIds.length === 0) return 0;

      const withPrices = ingredientIds.filter((id) => getIngredientPrice(id) !== undefined).length;
      return (withPrices / ingredientIds.length) * 100;
    },
    [getIngredientPrice]
  );

  return (
    <IngredientContext.Provider
      value={{
        ingredients,
        loading,
        getIngredientById,
        getIngredientName,
        getIngredientsByCategory,
        getIngredientPrice,
        getIngredientCurrency,
        setIngredientPrice,
        resetIngredientPrice,
        resetAllPrices,
        isCustomPrice,
        hasCompleteData,
        getPriceDataCoverage,
      }}
    >
      {children}
    </IngredientContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIngredients = () => {
  const context = useContext(IngredientContext);
  if (!context) {
    throw new Error('useIngredients must be used within IngredientProvider');
  }
  return context;
};
