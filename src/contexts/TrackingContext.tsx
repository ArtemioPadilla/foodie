import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type {
  TrackingEntry,
  NutritionGoals,
  NutritionInfo,
  GoalProgress,
  DailyTracking,
  PeriodSummary,
} from '@/types';

interface TrackingContextType {
  entries: TrackingEntry[];
  goals: NutritionGoals;
  loading: boolean;
  todayEntries: TrackingEntry[];
  todayTotals: NutritionInfo;
  todayProgress: GoalProgress;
  logEntry: (entry: Omit<TrackingEntry, 'id' | 'loggedAt'>) => void;
  updateEntry: (id: string, updates: Partial<TrackingEntry>) => void;
  deleteEntry: (id: string) => void;
  duplicateEntry: (id: string, newDate?: string) => void;
  logRecipe: (recipeId: string, mealType: string, servings: number, date?: string) => void;
  logIngredient: (
    ingredientId: string,
    quantity: number,
    unit: string,
    mealType: string,
    date?: string
  ) => void;
  logBeverage: (beverageId: string, quantity: number, unit: string, date?: string) => void;
  logWater: (ml: number) => void;
  setGoals: (goals: Partial<NutritionGoals>) => void;
  resetGoalsToDefaults: () => void;
  getEntriesByDate: (date: string) => TrackingEntry[];
  getEntriesByDateRange: (startDate: string, endDate: string) => TrackingEntry[];
  getDailySummary: (date: string) => DailyTracking;
  getWeeklySummary: (startDate: string) => PeriodSummary;
  getMonthlySummary: (year: number, month: number) => PeriodSummary;
  calculateStreak: () => number;
  getAverageCalories: (days: number) => number;
  getMostLoggedMeals: (limit: number) => { recipeId: string; count: number }[];
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 70,
  fiber: 25,
  sodium: 2300,
  sugar: 50,
  water: 2000,
};

const createEmptyNutrition = (): NutritionInfo => ({
  servingSize: '0g',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  cholesterol: 0,
});

const aggregateNutrition = (entries: NutritionInfo[]): NutritionInfo => {
  return entries.reduce(
    (acc, nutrition) => ({
      servingSize: 'Total',
      calories: acc.calories + nutrition.calories,
      protein: acc.protein + nutrition.protein,
      carbs: acc.carbs + nutrition.carbs,
      fat: acc.fat + nutrition.fat,
      fiber: acc.fiber + nutrition.fiber,
      sugar: acc.sugar + nutrition.sugar,
      sodium: acc.sodium + nutrition.sodium,
      cholesterol: acc.cholesterol + nutrition.cholesterol,
    }),
    createEmptyNutrition()
  );
};

const calculateGoalProgress = (totals: NutritionInfo, goals: NutritionGoals): GoalProgress => {
  const createProgress = (consumed: number, goal: number) => ({
    consumed,
    goal,
    remaining: Math.max(0, goal - consumed),
    percentage: goal > 0 ? Math.round((consumed / goal) * 100) : 0,
  });

  return {
    calories: createProgress(totals.calories, goals.calories),
    protein: createProgress(totals.protein, goals.protein),
    carbs: createProgress(totals.carbs, goals.carbs),
    fat: createProgress(totals.fat, goals.fat),
    fiber: createProgress(totals.fiber, goals.fiber),
    water: goals.water ? createProgress(0, goals.water) : undefined,
  };
};

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getCurrentTime = (): string => {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
};

const generateId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `tracking_${timestamp}_${random}`;
};

export const TrackingProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<TrackingEntry[]>(() => {
    const stored = localStorage.getItem('trackingEntries');
    return stored ? JSON.parse(stored) : [];
  });

  const [goals, setGoalsState] = useState<NutritionGoals>(() => {
    const stored = localStorage.getItem('nutritionGoals');
    return stored ? JSON.parse(stored) : DEFAULT_GOALS;
  });

  const [loading] = useState(false);

  const saveToLocalStorage = useCallback((newEntries: TrackingEntry[]) => {
    localStorage.setItem('trackingEntries', JSON.stringify(newEntries));
  }, []);

  const saveGoalsToLocalStorage = useCallback((newGoals: NutritionGoals) => {
    localStorage.setItem('nutritionGoals', JSON.stringify(newGoals));
  }, []);

  const todayEntries = useMemo(() => {
    const today = getToday();
    return entries.filter(entry => entry.date === today);
  }, [entries]);

  const todayTotals = useMemo(() => {
    return aggregateNutrition(todayEntries.map(entry => entry.nutrition));
  }, [todayEntries]);

  const todayProgress = useMemo(() => {
    return calculateGoalProgress(todayTotals, goals);
  }, [todayTotals, goals]);

  const logEntry = useCallback(
    (entry: Omit<TrackingEntry, 'id' | 'loggedAt'>) => {
      const newEntry: TrackingEntry = {
        ...entry,
        id: generateId(),
        loggedAt: new Date().toISOString(),
      };

      const updated = [...entries, newEntry];
      setEntries(updated);
      saveToLocalStorage(updated);
    },
    [entries, saveToLocalStorage]
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<TrackingEntry>) => {
      const updated = entries.map(entry => (entry.id === id ? { ...entry, ...updates } : entry));
      setEntries(updated);
      saveToLocalStorage(updated);
    },
    [entries, saveToLocalStorage]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const updated = entries.filter(entry => entry.id !== id);
      setEntries(updated);
      saveToLocalStorage(updated);
    },
    [entries, saveToLocalStorage]
  );

  const duplicateEntry = useCallback(
    (id: string, newDate?: string) => {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;

      const duplicated: TrackingEntry = {
        ...entry,
        id: generateId(),
        date: newDate || getToday(),
        time: getCurrentTime(),
        loggedAt: new Date().toISOString(),
      };

      const updated = [...entries, duplicated];
      setEntries(updated);
      saveToLocalStorage(updated);
    },
    [entries, saveToLocalStorage]
  );

  const logRecipe = useCallback(
    (recipeId: string, mealType: string, servings: number, date?: string) => {
      logEntry({
        date: date || getToday(),
        time: getCurrentTime(),
        mealType: mealType as TrackingEntry['mealType'],
        recipeId,
        quantity: servings,
        unit: 'servings',
        servings,
        nutrition: createEmptyNutrition(),
      });
    },
    [logEntry]
  );

  const logIngredient = useCallback(
    (ingredientId: string, quantity: number, unit: string, mealType: string, date?: string) => {
      logEntry({
        date: date || getToday(),
        time: getCurrentTime(),
        mealType: mealType as TrackingEntry['mealType'],
        ingredientId,
        quantity,
        unit,
        nutrition: createEmptyNutrition(),
      });
    },
    [logEntry]
  );

  const logBeverage = useCallback(
    (beverageId: string, quantity: number, unit: string, date?: string) => {
      logEntry({
        date: date || getToday(),
        time: getCurrentTime(),
        mealType: 'beverage',
        beverageId,
        quantity,
        unit,
        nutrition: createEmptyNutrition(),
      });
    },
    [logEntry]
  );

  const logWater = useCallback(
    (ml: number) => {
      logBeverage('bev_water', ml, 'ml');
    },
    [logBeverage]
  );

  const setGoals = useCallback(
    (newGoals: Partial<NutritionGoals>) => {
      const updated = { ...goals, ...newGoals };
      setGoalsState(updated);
      saveGoalsToLocalStorage(updated);
    },
    [goals, saveGoalsToLocalStorage]
  );

  const resetGoalsToDefaults = useCallback(() => {
    setGoalsState(DEFAULT_GOALS);
    saveGoalsToLocalStorage(DEFAULT_GOALS);
  }, [saveGoalsToLocalStorage]);

  const getEntriesByDate = useCallback(
    (date: string) => {
      return entries.filter(entry => entry.date === date);
    },
    [entries]
  );

  const getEntriesByDateRange = useCallback(
    (startDate: string, endDate: string) => {
      return entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
    },
    [entries]
  );

  const getDailySummary = useCallback(
    (date: string): DailyTracking => {
      const dayEntries = getEntriesByDate(date);
      const totals = aggregateNutrition(dayEntries.map(e => e.nutrition));
      const goalProgress = calculateGoalProgress(totals, goals);

      return {
        date,
        entries: dayEntries,
        totals,
        goalProgress,
      };
    },
    [getEntriesByDate, goals]
  );

  const getWeeklySummary = useCallback(
    (startDate: string): PeriodSummary => {
      const dates: string[] = [];
      const start = new Date(startDate);

      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const days = dates.map(date => getDailySummary(date));
      const allNutrition = days.map(day => day.totals);
      const totals = aggregateNutrition(allNutrition);
      const averages: NutritionInfo = {
        ...totals,
        calories: Math.round(totals.calories / 7),
        protein: Math.round(totals.protein / 7),
        carbs: Math.round(totals.carbs / 7),
        fat: Math.round(totals.fat / 7),
        fiber: Math.round(totals.fiber / 7),
        sugar: Math.round(totals.sugar / 7),
        sodium: Math.round(totals.sodium / 7),
        cholesterol: Math.round(totals.cholesterol / 7),
      };

      const streakDays = days.filter(day => {
        const progress = day.goalProgress;
        return (
          progress.calories.percentage >= 80 &&
          progress.calories.percentage <= 120 &&
          progress.protein.percentage >= 80
        );
      }).length;

      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        days,
        averages,
        totals,
        streakDays,
      };
    },
    [getDailySummary]
  );

  const getMonthlySummary = useCallback(
    (year: number, month: number): PeriodSummary => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dates: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        dates.push(date.toISOString().split('T')[0]);
      }

      const days = dates.map(date => getDailySummary(date));
      const allNutrition = days.map(day => day.totals);
      const totals = aggregateNutrition(allNutrition);
      const averages: NutritionInfo = {
        ...totals,
        calories: Math.round(totals.calories / daysInMonth),
        protein: Math.round(totals.protein / daysInMonth),
        carbs: Math.round(totals.carbs / daysInMonth),
        fat: Math.round(totals.fat / daysInMonth),
        fiber: Math.round(totals.fiber / daysInMonth),
        sugar: Math.round(totals.sugar / daysInMonth),
        sodium: Math.round(totals.sodium / daysInMonth),
        cholesterol: Math.round(totals.cholesterol / daysInMonth),
      };

      const streakDays = days.filter(day => {
        const progress = day.goalProgress;
        return (
          progress.calories.percentage >= 80 &&
          progress.calories.percentage <= 120 &&
          progress.protein.percentage >= 80
        );
      }).length;

      return {
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        days,
        averages,
        totals,
        streakDays,
      };
    },
    [getDailySummary]
  );

  const calculateStreak = useCallback(() => {
    const dates = Array.from(new Set(entries.map(e => e.date))).sort().reverse();
    let streak = 0;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];

      if (date === expected) {
        const summary = getDailySummary(date);
        const progress = summary.goalProgress;
        if (
          progress.calories.percentage >= 80 &&
          progress.calories.percentage <= 120 &&
          progress.protein.percentage >= 80
        ) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  }, [entries, getDailySummary]);

  const getAverageCalories = useCallback(
    (days: number) => {
      const dates = Array.from(new Set(entries.map(e => e.date)))
        .sort()
        .reverse()
        .slice(0, days);

      if (dates.length === 0) return 0;

      const totalCalories = dates.reduce((sum, date) => {
        const summary = getDailySummary(date);
        return sum + summary.totals.calories;
      }, 0);

      return Math.round(totalCalories / dates.length);
    },
    [entries, getDailySummary]
  );

  const getMostLoggedMeals = useCallback(
    (limit: number) => {
      const recipeCount = new Map<string, number>();

      entries.forEach(entry => {
        if (entry.recipeId) {
          recipeCount.set(entry.recipeId, (recipeCount.get(entry.recipeId) || 0) + 1);
        }
      });

      return Array.from(recipeCount.entries())
        .map(([recipeId, count]) => ({ recipeId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    [entries]
  );

  const value = useMemo(
    () => ({
      entries,
      goals,
      loading,
      todayEntries,
      todayTotals,
      todayProgress,
      logEntry,
      updateEntry,
      deleteEntry,
      duplicateEntry,
      logRecipe,
      logIngredient,
      logBeverage,
      logWater,
      setGoals,
      resetGoalsToDefaults,
      getEntriesByDate,
      getEntriesByDateRange,
      getDailySummary,
      getWeeklySummary,
      getMonthlySummary,
      calculateStreak,
      getAverageCalories,
      getMostLoggedMeals,
    }),
    [
      entries,
      goals,
      loading,
      todayEntries,
      todayTotals,
      todayProgress,
      logEntry,
      updateEntry,
      deleteEntry,
      duplicateEntry,
      logRecipe,
      logIngredient,
      logBeverage,
      logWater,
      setGoals,
      resetGoalsToDefaults,
      getEntriesByDate,
      getEntriesByDateRange,
      getDailySummary,
      getWeeklySummary,
      getMonthlySummary,
      calculateStreak,
      getAverageCalories,
      getMostLoggedMeals,
    ]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
};
