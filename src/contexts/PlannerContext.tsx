import { createContext, useContext, useState, ReactNode } from 'react';
import type { MealPlan } from '@/types';

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
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(() => {
    const stored = localStorage.getItem('currentMealPlan');
    return stored ? JSON.parse(stored) : null;
  });

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
    localStorage.setItem('currentMealPlan', JSON.stringify(newPlan));
  };

  const updatePlan = (updates: Partial<MealPlan>) => {
    if (!currentPlan) return;
    const updated = { ...currentPlan, ...updates };
    setCurrentPlan(updated);
    localStorage.setItem('currentMealPlan', JSON.stringify(updated));
  };

  const addRecipeToPlan = (
    dayIndex: number,
    mealType: string,
    recipeId: string,
    servings: number
  ) => {
    if (!currentPlan) return;

    const updatedDays = [...currentPlan.days];
    const day = updatedDays[dayIndex];

    if (mealType === 'snacks') {
      if (!day.meals.snacks) {
        day.meals.snacks = [];
      }
      day.meals.snacks.push({ recipeId, servings });
    } else {
      (day.meals as any)[mealType] = { recipeId, servings };
    }

    setCurrentPlan({ ...currentPlan, days: updatedDays });
    localStorage.setItem('currentMealPlan', JSON.stringify({ ...currentPlan, days: updatedDays }));
  };

  const removeRecipeFromPlan = (dayIndex: number, mealType: string) => {
    if (!currentPlan) return;

    const updatedDays = [...currentPlan.days];
    const day = updatedDays[dayIndex];

    if (mealType === 'snacks') {
      day.meals.snacks = [];
    } else {
      delete day.meals[mealType as keyof typeof day.meals];
    }

    setCurrentPlan({ ...currentPlan, days: updatedDays });
    localStorage.setItem('currentMealPlan', JSON.stringify({ ...currentPlan, days: updatedDays }));
  };

  const savePlan = () => {
    if (!currentPlan) return;
    const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
    const existingIndex = savedPlans.findIndex((p: MealPlan) => p.id === currentPlan.id);

    if (existingIndex >= 0) {
      savedPlans[existingIndex] = currentPlan;
    } else {
      savedPlans.push(currentPlan);
    }

    localStorage.setItem('savedMealPlans', JSON.stringify(savedPlans));
  };

  const loadPlan = (planId: string) => {
    const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
    const plan = savedPlans.find((p: MealPlan) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      localStorage.setItem('currentMealPlan', JSON.stringify(plan));
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

    setCurrentPlan({ ...currentPlan, days: updatedDays });
    localStorage.setItem('currentMealPlan', JSON.stringify({ ...currentPlan, days: updatedDays }));
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

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within PlannerProvider');
  }
  return context;
};
