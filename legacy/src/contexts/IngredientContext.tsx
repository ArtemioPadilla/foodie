import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Ingredient } from '@/types';
import { useLanguage } from './LanguageContext';

interface IngredientContextType {
  ingredients: Ingredient[];
  loading: boolean;
  getIngredientById: (id: string) => Ingredient | undefined;
  getIngredientName: (id: string) => string;
  getIngredientsByCategory: (category: string) => Ingredient[];
}

const IngredientContext = createContext<IngredientContextType | undefined>(undefined);

export const IngredientProvider = ({ children }: { children: ReactNode }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <IngredientContext.Provider
      value={{
        ingredients,
        loading,
        getIngredientById,
        getIngredientName,
        getIngredientsByCategory,
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
