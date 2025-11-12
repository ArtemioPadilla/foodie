import { createContext, useContext, useState, ReactNode } from 'react';
import type { ShoppingListItem } from '@/types';

interface ShoppingContextType {
  shoppingList: ShoppingListItem[];
  addItem: (item: Omit<ShoppingListItem, 'checked'>) => void;
  removeItem: (ingredientId: string) => void;
  toggleItem: (ingredientId: string) => void;
  updateQuantity: (ingredientId: string, quantity: number) => void;
  clearList: () => void;
  clearChecked: () => void;
  generateFromPlan: (planId: string) => void;
  exportList: (format: 'text' | 'json' | 'csv') => string;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export const ShoppingProvider = ({ children }: { children: ReactNode }) => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    const stored = localStorage.getItem('shoppingList');
    return stored ? JSON.parse(stored) : [];
  });

  const saveToLocalStorage = (list: ShoppingListItem[]) => {
    localStorage.setItem('shoppingList', JSON.stringify(list));
  };

  const addItem = (item: Omit<ShoppingListItem, 'checked'>) => {
    setShoppingList(prev => {
      const existing = prev.find(i => i.ingredientId === item.ingredientId);

      if (existing) {
        const updated = prev.map(i =>
          i.ingredientId === item.ingredientId
            ? { ...i, quantity: i.quantity + item.quantity, usedIn: [...new Set([...i.usedIn, ...item.usedIn])] }
            : i
        );
        saveToLocalStorage(updated);
        return updated;
      }

      const newList = [...prev, { ...item, checked: false }];
      saveToLocalStorage(newList);
      return newList;
    });
  };

  const removeItem = (ingredientId: string) => {
    setShoppingList(prev => {
      const filtered = prev.filter(item => item.ingredientId !== ingredientId);
      saveToLocalStorage(filtered);
      return filtered;
    });
  };

  const toggleItem = (ingredientId: string) => {
    setShoppingList(prev => {
      const updated = prev.map(item =>
        item.ingredientId === ingredientId ? { ...item, checked: !item.checked } : item
      );
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const updateQuantity = (ingredientId: string, quantity: number) => {
    setShoppingList(prev => {
      const updated = prev.map(item =>
        item.ingredientId === ingredientId ? { ...item, quantity } : item
      );
      saveToLocalStorage(updated);
      return updated;
    });
  };

  const clearList = () => {
    setShoppingList([]);
    localStorage.removeItem('shoppingList');
  };

  const clearChecked = () => {
    setShoppingList(prev => {
      const filtered = prev.filter(item => !item.checked);
      saveToLocalStorage(filtered);
      return filtered;
    });
  };

  const generateFromPlan = (planId: string) => {
    // This would generate a shopping list from a meal plan
    // Simplified implementation
    console.log('Generating shopping list from plan:', planId);
  };

  const exportList = (format: 'text' | 'json' | 'csv'): string => {
    switch (format) {
      case 'json':
        return JSON.stringify(shoppingList, null, 2);
      case 'csv':
        const headers = 'Ingredient,Quantity,Unit,Category,Notes\n';
        const rows = shoppingList
          .map(item => `${item.ingredientId},${item.quantity},${item.unit},${item.category || ''},"${item.notes || ''}"`)
          .join('\n');
        return headers + rows;
      case 'text':
      default:
        return shoppingList
          .map(item => `${item.checked ? '✓' : '☐'} ${item.quantity} ${item.unit} ${item.ingredientId}`)
          .join('\n');
    }
  };

  return (
    <ShoppingContext.Provider
      value={{
        shoppingList,
        addItem,
        removeItem,
        toggleItem,
        updateQuantity,
        clearList,
        clearChecked,
        generateFromPlan,
        exportList,
      }}
    >
      {children}
    </ShoppingContext.Provider>
  );
};

export const useShopping = () => {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShopping must be used within ShoppingProvider');
  }
  return context;
};
