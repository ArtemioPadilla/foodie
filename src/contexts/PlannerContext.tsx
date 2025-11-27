import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type { MealPlan } from '@/types';
import { calculatePlanCost } from '@utils/costCalculations';
import { useRecipes } from './RecipeContext';
import { safeGetItem, safeSetItem } from '@utils/storage';
import { useIngredients } from './IngredientContext';

interface PlannerContextType {
  currentPlan: MealPlan | null;
  createPlan: (plan: Partial<MealPlan>) => void;
  updatePlan: (updates: Partial<MealPlan>) => void;
  addRecipeToPlan: (dayIndex: number, mealType: string, recipeId: string, servings: number) => void;
  removeRecipeFromPlan: (dayIndex: number, mealType: string) => void;
  savePlan: () => void;
  loadPlan: (planId: string) => void;
  clearPlan: () => void;
  duplicateDay: (dayIndex: number, targetDayIndex: number) => void;
  adjustGlobalServings: (servings: number) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export const PlannerProvider = ({ children }: { children: ReactNode }) => {
  const { getRecipeById } = useRecipes();
  const { getIngredientPrice } = useIngredients();
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(() => {
    return safeGetItem<MealPlan | null>('currentMealPlan', null);
  });

  // Calculate cost using useMemo to avoid infinite loops
  // Memoize based on plan structure (days), not the entire plan object
  const estimatedCost = useMemo(() => {
    if (!currentPlan) return 0;
    return calculatePlanCost(currentPlan, getRecipeById, getIngredientPrice);
  }, [currentPlan?.days, currentPlan?.id, getRecipeById, getIngredientPrice]);

  // Update plan with calculated cost only when it changes
  useEffect(() => {
    if (!currentPlan) return;

    // Only update if cost changed to avoid infinite loops
    if (currentPlan.estimatedCost !== estimatedCost) {
      const updatedPlan = { ...currentPlan, estimatedCost };
      setCurrentPlan(updatedPlan);
      safeSetItem('currentMealPlan', updatedPlan);
    }
  }, [estimatedCost]); // Only depend on estimatedCost, not currentPlan

  const createPlan = (plan: Partial<MealPlan>) => {
    const newPlan: MealPlan = {
      id: `plan_${Date.now()}`,
      name: plan.name || { en: 'New Plan', es: 'Nuevo Plan', fr: 'Nouveau Plan' },
      description: plan.description || { en: '', es: '', fr: '' },
      servings: plan.servings || 2,
      dietaryRestrictions: plan.dietaryRestrictions || [],
      difficulty: plan.difficulty || 'easy',
      estimatedCost: 0,
      currency: 'USD',
      days: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        dayName: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i],
        meals: {},
      })),
      tags: plan.tags || [],
      isPublic: false,
    };
    setCurrentPlan(newPlan);
    safeSetItem('currentMealPlan', newPlan);
  };

  const updatePlan = (updates: Partial<MealPlan>) => {
    if (!currentPlan) return;
    const updated = { ...currentPlan, ...updates };
    setCurrentPlan(updated);
    safeSetItem('currentMealPlan', updated);
  };

  const addRecipeToPlan = (
    dayIndex: number,
    mealType: string,
    recipeId: string,
    servings: number
  ) => {
    if (!currentPlan) return;

    // Validate mealType
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    if (!validMealTypes.includes(mealType)) {
      console.warn(`Invalid meal type: ${mealType}. Must be one of: ${validMealTypes.join(', ')}`);
      return;
    }

    // Validate dayIndex
    if (dayIndex < 0 || dayIndex >= currentPlan.days.length) {
      console.warn(`Invalid day index: ${dayIndex}. Must be between 0 and ${currentPlan.days.length - 1}`);
      return;
    }

    // Validate servings
    if (servings <= 0) {
      console.warn(`Invalid servings: ${servings}. Must be greater than 0`);
      return;
    }

    const updatedDays = [...currentPlan.days];
    const day = updatedDays[dayIndex];

    if (mealType === 'snacks') {
      if (!day.meals.snacks) {
        day.meals.snacks = [];
      }
      day.meals.snacks.push({ recipeId, servings });
    } else {
      // Safe to use type assertion after validation
      (day.meals as Record<string, unknown>)[mealType] = { recipeId, servings };
    }

    const updated = { ...currentPlan, days: updatedDays };
    setCurrentPlan(updated);
    safeSetItem('currentMealPlan', updated);
  };

  const removeRecipeFromPlan = (dayIndex: number, mealType: string) => {
    if (!currentPlan) return;

    // Validate mealType
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    if (!validMealTypes.includes(mealType)) {
      console.warn(`Invalid meal type: ${mealType}. Must be one of: ${validMealTypes.join(', ')}`);
      return;
    }

    // Validate dayIndex
    if (dayIndex < 0 || dayIndex >= currentPlan.days.length) {
      console.warn(`Invalid day index: ${dayIndex}. Must be between 0 and ${currentPlan.days.length - 1}`);
      return;
    }

    const updatedDays = [...currentPlan.days];
    const day = updatedDays[dayIndex];

    if (mealType === 'snacks') {
      day.meals.snacks = [];
    } else {
      // Safe to use type assertion after validation
      delete day.meals[mealType as keyof typeof day.meals];
    }

    const updated = { ...currentPlan, days: updatedDays };
    setCurrentPlan(updated);
    safeSetItem('currentMealPlan', updated);
  };

  const savePlan = () => {
    if (!currentPlan) return;
    const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
    const existingIndex = savedPlans.findIndex((p: MealPlan) => p.id === currentPlan.id);

    if (existingIndex >= 0) {
      savedPlans[existingIndex] = currentPlan;
    } else {
      savedPlans.push(currentPlan);
    }

    safeSetItem('savedMealPlans', savedPlans);
  };

  const loadPlan = (planId: string) => {
    const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
    const plan = savedPlans.find((p: MealPlan) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      safeSetItem('currentMealPlan', plan);
    }
  };

  const clearPlan = () => {
    setCurrentPlan(null);
    localStorage.removeItem('currentMealPlan');
  };

  const duplicateDay = (dayIndex: number, targetDayIndex: number) => {
    if (!currentPlan) return;

    const updatedDays = [...currentPlan.days];
    updatedDays[targetDayIndex] = {
      ...updatedDays[targetDayIndex],
      meals: JSON.parse(JSON.stringify(updatedDays[dayIndex].meals)),
    };

    const updated = { ...currentPlan, days: updatedDays };
    setCurrentPlan(updated);
    safeSetItem('currentMealPlan', updated);
  };

  const adjustGlobalServings = (servings: number) => {
    if (!currentPlan) return;
    updatePlan({ servings });
  };

  return (
    <PlannerContext.Provider
      value={{
        currentPlan,
        createPlan,
        updatePlan,
        addRecipeToPlan,
        removeRecipeFromPlan,
        savePlan,
        loadPlan,
        clearPlan,
        duplicateDay,
        adjustGlobalServings,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within PlannerProvider');
  }
  return context;
};
