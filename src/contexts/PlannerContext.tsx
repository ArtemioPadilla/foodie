import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally using currentPlan?.days and currentPlan?.id instead of currentPlan to prevent infinite loops
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally excluding currentPlan to prevent infinite loops; we read it inside but only want to trigger on estimatedCost change
  }, [estimatedCost]);

  const createPlan = useCallback((plan: Partial<MealPlan>) => {
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
  }, []);

  const updatePlan = useCallback((updates: Partial<MealPlan>) => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      safeSetItem('currentMealPlan', updated);
      return updated;
    });
  }, []);

  const addRecipeToPlan = useCallback((
    dayIndex: number,
    mealType: string,
    recipeId: string,
    servings: number
  ) => {
    setCurrentPlan(prev => {
      if (!prev) return null;

      // Validate mealType
      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
      if (!validMealTypes.includes(mealType)) {
        console.warn(`Invalid meal type: ${mealType}. Must be one of: ${validMealTypes.join(', ')}`);
        return prev;
      }

      // Validate dayIndex
      if (dayIndex < 0 || dayIndex >= prev.days.length) {
        console.warn(`Invalid day index: ${dayIndex}. Must be between 0 and ${prev.days.length - 1}`);
        return prev;
      }

      // Validate servings
      if (servings <= 0) {
        console.warn(`Invalid servings: ${servings}. Must be greater than 0`);
        return prev;
      }

      const updatedDays = [...prev.days];
      const day = updatedDays[dayIndex];

      if (mealType === 'snacks') {
        if (!day.meals.snacks) {
          day.meals.snacks = [];
        }
        day.meals.snacks.push({ recipeId, servings });
      } else {
        // Type-safe assignment after validation
        day.meals[mealType as 'breakfast' | 'lunch' | 'dinner'] = { recipeId, servings };
      }

      const updated = { ...prev, days: updatedDays };
      safeSetItem('currentMealPlan', updated);
      return updated;
    });
  }, []);

  const removeRecipeFromPlan = useCallback((dayIndex: number, mealType: string) => {
    setCurrentPlan(prev => {
      if (!prev) return null;

      // Validate mealType
      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
      if (!validMealTypes.includes(mealType)) {
        console.warn(`Invalid meal type: ${mealType}. Must be one of: ${validMealTypes.join(', ')}`);
        return prev;
      }

      // Validate dayIndex
      if (dayIndex < 0 || dayIndex >= prev.days.length) {
        console.warn(`Invalid day index: ${dayIndex}. Must be between 0 and ${prev.days.length - 1}`);
        return prev;
      }

      const updatedDays = [...prev.days];
      const day = updatedDays[dayIndex];

      if (mealType === 'snacks') {
        day.meals.snacks = [];
      } else {
        delete day.meals[mealType as 'breakfast' | 'lunch' | 'dinner'];
      }

      const updated = { ...prev, days: updatedDays };
      safeSetItem('currentMealPlan', updated);
      return updated;
    });
  }, []);

  const savePlan = useCallback(() => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
      const existingIndex = savedPlans.findIndex((p: MealPlan) => p.id === prev.id);

      if (existingIndex >= 0) {
        savedPlans[existingIndex] = prev;
      } else {
        savedPlans.push(prev);
      }

      safeSetItem('savedMealPlans', savedPlans);
      return prev;
    });
  }, []);

  const loadPlan = useCallback((planId: string) => {
    const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
    const plan = savedPlans.find((p: MealPlan) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      safeSetItem('currentMealPlan', plan);
    }
  }, []);

  const clearPlan = useCallback(() => {
    setCurrentPlan(null);
    safeSetItem('currentMealPlan', null);
  }, []);

  const duplicateDay = useCallback((dayIndex: number, targetDayIndex: number) => {
    setCurrentPlan(prev => {
      if (!prev) return null;

      const updatedDays = [...prev.days];
      updatedDays[targetDayIndex] = {
        ...updatedDays[targetDayIndex],
        meals: JSON.parse(JSON.stringify(updatedDays[dayIndex].meals)),
      };

      const updated = { ...prev, days: updatedDays };
      safeSetItem('currentMealPlan', updated);
      return updated;
    });
  }, []);

  const adjustGlobalServings = useCallback((servings: number) => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      const updated = { ...prev, servings };
      safeSetItem('currentMealPlan', updated);
      return updated;
    });
  }, []);

  // Memoize provider value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within PlannerProvider');
  }
  return context;
};
