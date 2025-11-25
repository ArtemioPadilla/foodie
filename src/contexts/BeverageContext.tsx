import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useLanguage } from './LanguageContext';
import type { Beverage } from '@/types';

interface BeverageContextType {
  beverages: Beverage[];
  loading: boolean;
  getBeverageById: (id: string) => Beverage | undefined;
  getBeveragesByCategory: (category: string) => Beverage[];
  searchBeverages: (query: string) => Beverage[];
}

const BeverageContext = createContext<BeverageContextType | undefined>(undefined);

export const BeverageProvider = ({ children }: { children: ReactNode }) => {
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTranslated } = useLanguage();

  useEffect(() => {
    const loadBeverages = async () => {
      try {
        setLoading(true);
        const response = await fetch('/foodie/data/beverages.json');
        if (!response.ok) {
          throw new Error('Failed to load beverages');
        }
        const data = await response.json();
        setBeverages(data);
      } catch (error) {
        console.error('Error loading beverages:', error);
        setBeverages([]);
      } finally {
        setLoading(false);
      }
    };

    loadBeverages();
  }, []);

  const getBeverageById = useMemo(
    () => (id: string) => {
      return beverages.find(bev => bev.id === id);
    },
    [beverages]
  );

  const getBeveragesByCategory = useMemo(
    () => (category: string) => {
      return beverages.filter(bev => bev.category === category);
    },
    [beverages]
  );

  const searchBeverages = useMemo(
    () => (query: string) => {
      if (!query || query.trim() === '') {
        return beverages;
      }

      const searchTerm = query.toLowerCase().trim();

      return beverages.filter(bev => {
        const name = getTranslated(bev.name).toLowerCase();
        return name.includes(searchTerm);
      });
    },
    [beverages, getTranslated]
  );

  const value = useMemo(
    () => ({
      beverages,
      loading,
      getBeverageById,
      getBeveragesByCategory,
      searchBeverages,
    }),
    [beverages, loading, getBeverageById, getBeveragesByCategory, searchBeverages]
  );

  return <BeverageContext.Provider value={value}>{children}</BeverageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBeverages = () => {
  const context = useContext(BeverageContext);
  if (!context) {
    throw new Error('useBeverages must be used within BeverageProvider');
  }
  return context;
};
