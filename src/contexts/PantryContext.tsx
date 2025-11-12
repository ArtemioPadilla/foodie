import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { PantryItem } from '@/types';

interface PantryContextType {
  pantryItems: PantryItem[];
  addItem: (item: Omit<PantryItem, 'id' | 'addedAt'>) => void;
  updateItem: (id: string, updates: Partial<PantryItem>) => void;
  removeItem: (id: string) => void;
  getItemById: (id: string) => PantryItem | undefined;
  getExpiringItems: (days: number) => PantryItem[];
  getLowStockItems: (threshold: number) => PantryItem[];
  clearPantry: () => void;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider = ({ children }: { children: ReactNode }) => {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() => {
    const stored = localStorage.getItem('pantryItems');
    return stored ? JSON.parse(stored) : [];
  });

  const saveToLocalStorage = (items: PantryItem[]) => {
    localStorage.setItem('pantryItems', JSON.stringify(items));
  };

  const addItem = (item: Omit<PantryItem, 'id' | 'addedAt'>) => {
    setPantryItems((prev) => {
      const newItem: PantryItem = {
        ...item,
        id: `pantry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        addedAt: new Date().toISOString(),
      };

      const updated = [...prev, newItem];
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const updateItem = (id: string, updates: Partial<PantryItem>) => {
    setPantryItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const removeItem = (id: string) => {
    setPantryItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      saveToLocalStorage(filtered);
      return filtered;
    });
  };

  const getItemById = (id: string): PantryItem | undefined => {
    return pantryItems.find((item) => item.id === id);
  };

  const getExpiringItems = (days: number): PantryItem[] => {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return pantryItems.filter((item) => {
      if (!item.expirationDate) return false;
      const expDate = new Date(item.expirationDate);
      return expDate <= threshold && expDate >= now;
    });
  };

  const getLowStockItems = (threshold: number): PantryItem[] => {
    return pantryItems.filter((item) => item.quantity <= threshold);
  };

  const clearPantry = () => {
    setPantryItems([]);
    localStorage.removeItem('pantryItems');
  };

  const value = useMemo(
    () => ({
      pantryItems,
      addItem,
      updateItem,
      removeItem,
      getItemById,
      getExpiringItems,
      getLowStockItems,
      clearPantry,
    }),
    [pantryItems]
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
};

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (!context) {
    throw new Error('usePantry must be used within PantryProvider');
  }
  return context;
};
