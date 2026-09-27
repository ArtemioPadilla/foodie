import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MealPlan, Recipe } from '@/types';
import { DroppableSlot } from './DroppableSlot';
import { RecipePickerModal } from './RecipePickerModal';
import { usePlanner } from '@contexts/PlannerContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useTracking } from '@contexts/TrackingContext';
import { Card } from '@components/common';
import { cn } from '@utils/cn';

export interface WeekViewProps {
  plan: MealPlan;
  startDate?: Date;
  className?: string;
  onSlotClick?: (dayIndex: number, mealType: string, recipeId?: string) => void;
}

/**
 * Week view calendar with 7-day grid and meal slots
 */
interface SelectedSlot {
  dayIndex: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  dayName: string;
}

export const WeekView: React.FC<WeekViewProps> = ({
  plan,
  startDate = new Date(),
  className,
  onSlotClick,
}) => {
  const { t } = useTranslation();
  const { addRecipeToPlan, removeRecipeFromPlan } = usePlanner();
  const { getRecipeById } = useRecipes();
  const { logRecipe } = useTracking();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const dayNames = useMemo(() => {
    return [
      t('days.monday', 'Monday'),
      t('days.tuesday', 'Tuesday'),
      t('days.wednesday', 'Wednesday'),
      t('days.thursday', 'Thursday'),
      t('days.friday', 'Friday'),
      t('days.saturday', 'Saturday'),
      t('days.sunday', 'Sunday'),
    ];
  }, [t]);

  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snacks'> = [
    'breakfast',
    'lunch',
    'dinner',
    'snacks',
  ];

  const handleDrop = (dayIndex: number, mealType: string, recipe: Recipe, servings: number) => {
    addRecipeToPlan(dayIndex, mealType, recipe.id, servings);
  };

  const handleRemove = (dayIndex: number, mealType: string) => {
    removeRecipeFromPlan(dayIndex, mealType);
  };

  const handleAddClick = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', dayName: string) => {
    setSelectedSlot({ dayIndex, mealType, dayName });
    setIsPickerOpen(true);
  };

  const handleRecipeSelect = (recipe: Recipe, servings: number) => {
    if (selectedSlot) {
      addRecipeToPlan(selectedSlot.dayIndex, selectedSlot.mealType, recipe.id, servings);
    }
    setIsPickerOpen(false);
    setSelectedSlot(null);
  };

  const handleLogMeal = (dayIndex: number, meal: { recipeId: string; servings: number }, mealType: string) => {
    // Calculate the date for this day
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    const dateString = date.toISOString().split('T')[0];

    // Log the recipe
    logRecipe(meal.recipeId, mealType, meal.servings, dateString);

    // Show success message (optional - could add toast notification here)
    alert(t('tracking.entryLogged', 'Meal logged to tracking!'));
  };

  return (
    <div data-testid="week-view" className={cn('space-y-4', className)}>
      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {plan.days.map((day, dayIndex) => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + dayIndex);

          return (
            <Card key={day.dayNumber} className="space-y-4">
              {/* Day Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {dayNames[dayIndex]}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Meal Slots */}
              <div className="space-y-3">
                {mealTypes.map((mealType) => {
                  const meal =
                    mealType === 'snacks'
                      ? day.meals.snacks?.[0]
                      : day.meals[mealType as 'breakfast' | 'lunch' | 'dinner'];

                  const recipe = meal ? getRecipeById(meal.recipeId) : undefined;

                  return (
                    <DroppableSlot
                      key={mealType}
                      mealType={mealType}
                      meal={meal}
                      recipe={recipe}
                      dayIndex={dayIndex}
                      onDrop={(recipe, servings) => handleDrop(dayIndex, mealType, recipe, servings)}
                      onRemove={() => handleRemove(dayIndex, mealType)}
                      onClick={
                        meal && recipe
                          ? () => onSlotClick?.(dayIndex, mealType, meal.recipeId)
                          : undefined
                      }
                      onAddClick={() => handleAddClick(dayIndex, mealType, dayNames[dayIndex])}
                      onLogClick={meal ? () => handleLogMeal(dayIndex, meal, mealType) : undefined}
                    />
                  );
                })}
              </div>

              {/* Day Notes */}
              {day.notes && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {day.notes.en || day.notes.es || day.notes.fr}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Recipe Picker Modal */}
      <RecipePickerModal
        isOpen={isPickerOpen}
        onClose={() => {
          setIsPickerOpen(false);
          setSelectedSlot(null);
        }}
        onSelect={handleRecipeSelect}
        mealType={selectedSlot?.mealType || 'breakfast'}
        dayName={selectedSlot?.dayName}
      />
    </div>
  );
};

WeekView.displayName = 'WeekView';
