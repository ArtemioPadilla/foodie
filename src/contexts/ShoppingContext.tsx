import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { ShoppingListItem, MealPlan, MealSlot, Recipe } from '@/types';
import { safeGetItem, safeSetItem } from '@utils/storage';

interface ShoppingContextType {
  shoppingList: ShoppingListItem[];
  addItem: (item: Omit<ShoppingListItem, 'checked'>) => void;
  removeItem: (ingredientId: string) => void;
  toggleItem: (ingredientId: string) => void;
  updateQuantity: (ingredientId: string, quantity: number) => void;
  updateNotes: (ingredientId: string, notes: string) => void;
  clearList: () => void;
  clearChecked: () => void;
  generateFromPlan: (plan: MealPlan, recipes: Recipe[]) => void;
  exportList: (format: 'text' | 'json' | 'csv') => string;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export const ShoppingProvider = ({ children }: { children: ReactNode }) => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    return safeGetItem<ShoppingListItem[]>('shoppingList', []);
  });

  const saveToLocalStorage = (list: ShoppingListItem[]) => {
    safeSetItem('shoppingList', list);
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

  const updateNotes = useCallback((ingredientId: string, notes: string) => {
    setShoppingList(prev => {
      const updated = prev.map(item =>
        item.ingredientId === ingredientId ? { ...item, notes } : item
      );
      saveToLocalStorage(updated);
      return updated;
    });
  }, []);

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

  const generateFromPlan = useCallback((plan: MealPlan, recipes: Recipe[]) => {
    // Create a map for quick recipe lookup
    const recipeMap = new Map<string, Recipe>();
    recipes.forEach(recipe => recipeMap.set(recipe.id, recipe));

    // Temporary map to consolidate ingredients
    const ingredientMap = new Map<string, {
      quantity: number;
      unit: string;
      usedIn: string[];
      category?: string;
    }>();

    // Iterate through all days and meals in the plan
    plan.days.forEach(day => {
      const { meals } = day;

      // Process each meal type
      const processMeal = (mealSlot: MealSlot | undefined) => {
        if (!mealSlot) return;

        const recipe = recipeMap.get(mealSlot.recipeId);
        if (!recipe) return;

        const scaleFactor = mealSlot.servings / recipe.servings;
        const recipeName = recipe.name.en; // Using English name for "used in"

        // Add each ingredient
        recipe.ingredients.forEach(ingredient => {
          const scaledQuantity = ingredient.quantity * scaleFactor;

          if (ingredientMap.has(ingredient.ingredientId)) {
            const existing = ingredientMap.get(ingredient.ingredientId)!;
            // Check if units match before adding quantities
            if (existing.unit === ingredient.unit) {
              existing.quantity += scaledQuantity;
            } else {
              // If units don't match, create a separate entry (simplified approach)
              // In a real app, we'd do unit conversion here
              const key = `${ingredient.ingredientId}_${ingredient.unit}`;
              if (ingredientMap.has(key)) {
                ingredientMap.get(key)!.quantity += scaledQuantity;
                ingredientMap.get(key)!.usedIn.push(recipeName);
              } else {
                ingredientMap.set(key, {
                  quantity: scaledQuantity,
                  unit: ingredient.unit,
                  usedIn: [recipeName],
                });
              }
              return;
            }
            existing.usedIn.push(recipeName);
          } else {
            ingredientMap.set(ingredient.ingredientId, {
              quantity: scaledQuantity,
              unit: ingredient.unit,
              usedIn: [recipeName],
            });
          }
        });
      };

      // Process breakfast, lunch, dinner
      processMeal(meals.breakfast);
      processMeal(meals.lunch);
      processMeal(meals.dinner);

      // Process snacks (array)
      meals.snacks?.forEach(snack => processMeal(snack));
    });

    // Convert map to shopping list items
    const newShoppingList: ShoppingListItem[] = [];
    ingredientMap.forEach((value, key) => {
      // Extract ingredient ID (handle both regular keys and composite keys with units)
      const ingredientId = key.includes('_') ? key.split('_')[0] : key;

      newShoppingList.push({
        ingredientId,
        quantity: value.quantity,
        unit: value.unit,
        checked: false,
        usedIn: [...new Set(value.usedIn)], // Remove duplicates
        category: value.category,
        notes: '',
      });
    });

    // Sort by category for better organization
    newShoppingList.sort((a, b) => {
      if (!a.category && !b.category) return 0;
      if (!a.category) return 1;
      if (!b.category) return -1;
      return a.category.localeCompare(b.category);
    });

    setShoppingList(newShoppingList);
    saveToLocalStorage(newShoppingList);
  }, []);

  const exportList = (format: 'text' | 'json' | 'csv'): string => {
    switch (format) {
      case 'json':
        return JSON.stringify(shoppingList, null, 2);
      case 'csv': {
        const headers = 'Ingredient,Quantity,Unit,Category,Notes\n';
        const rows = shoppingList
          .map(item => `${item.ingredientId},${item.quantity},${item.unit},${item.category || ''},"${item.notes || ''}"`)
          .join('\n');
        return headers + rows;
      }
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
        updateNotes,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useShopping = () => {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShopping must be used within ShoppingProvider');
  }
  return context;
};
