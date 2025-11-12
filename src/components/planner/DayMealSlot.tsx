import React from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe, MealSlot } from '@/types';
import { Card, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface DayMealSlotProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  meal?: MealSlot;
  recipe?: Recipe;
  dayIndex: number;
  className?: string;
  onRemove?: () => void;
  onClick?: () => void;
}

/**
 * Individual meal slot component for displaying a recipe in a meal plan
 */
export const DayMealSlot: React.FC<DayMealSlotProps> = ({
  mealType,
  meal,
  recipe,
  dayIndex: _dayIndex,
  className,
  onRemove,
  onClick,
}) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language as 'en' | 'es' | 'fr';

  const mealTypeLabels: Record<string, string> = {
    breakfast: t('planner.breakfast', 'Breakfast'),
    lunch: t('planner.lunch', 'Lunch'),
    dinner: t('planner.dinner', 'Dinner'),
    snacks: t('planner.snacks', 'Snacks'),
  };

  const isEmpty = !meal || !recipe;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isEmpty && 'border-dashed border-2 border-gray-300 dark:border-gray-600',
        !isEmpty && 'cursor-pointer',
        className
      )}
      onClick={isEmpty ? undefined : onClick}
    >
      <div className="space-y-3">
        {/* Meal Type Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">
            {mealTypeLabels[mealType]}
          </h4>
          {meal && (
            <Badge variant="default" size="sm">
              {meal.servings} {t('common.servings', 'servings')}
            </Badge>
          )}
        </div>

        {/* Recipe Content or Empty State */}
        {isEmpty ? (
          <div className="py-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('planner.dragRecipeHere', 'Drag a recipe here')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Recipe Image */}
            {recipe?.imageUrl && (
              <img
                src={recipe.imageUrl}
                alt={recipe.name[currentLang] || recipe.name.en}
                className="w-full h-32 object-cover rounded-md"
              />
            )}

            {/* Recipe Info */}
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                {recipe?.name[currentLang] || recipe?.name.en}
              </h5>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                {/* Time */}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{recipe?.totalTime} min</span>
                </div>

                {/* Difficulty */}
                {recipe?.difficulty && (
                  <Badge
                    variant={
                      recipe.difficulty === 'easy'
                        ? 'success'
                        : recipe.difficulty === 'medium'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {recipe.difficulty}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-full py-1.5 px-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                {t('common.remove', 'Remove')}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

DayMealSlot.displayName = 'DayMealSlot';
