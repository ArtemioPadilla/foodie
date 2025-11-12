import React from 'react';
import { Recipe } from '@/types';
import { Card } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeNutritionProps {
  recipe: Recipe;
  servings?: number;
  className?: string;
  showChart?: boolean;
}

export const RecipeNutrition: React.FC<RecipeNutritionProps> = ({
  recipe,
  servings = recipe.servings,
  className,
  showChart = true,
}) => {
  if (!recipe.nutrition) {
    return null;
  }

  const scaleFactor = servings / recipe.servings;
  const nutrition = recipe.nutrition;

  const scaleValue = (value: number) => Math.round(value * scaleFactor);

  const nutritionItems = [
    {
      label: 'Calories',
      value: scaleValue(nutrition.calories),
      unit: '',
      color: 'bg-red-500',
      max: 2000,
    },
    {
      label: 'Protein',
      value: scaleValue(nutrition.protein),
      unit: 'g',
      color: 'bg-blue-500',
      max: 50,
    },
    {
      label: 'Carbs',
      value: scaleValue(nutrition.carbs),
      unit: 'g',
      color: 'bg-yellow-500',
      max: 300,
    },
    {
      label: 'Fat',
      value: scaleValue(nutrition.fat),
      unit: 'g',
      color: 'bg-purple-500',
      max: 70,
    },
    {
      label: 'Fiber',
      value: scaleValue(nutrition.fiber),
      unit: 'g',
      color: 'bg-green-500',
      max: 30,
    },
    {
      label: 'Sugar',
      value: scaleValue(nutrition.sugar),
      unit: 'g',
      color: 'bg-pink-500',
      max: 50,
    },
  ];

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Nutrition Facts
        </h2>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Per serving ({nutrition.servingSize})
        </span>
      </div>

      {servings !== recipe.servings && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
          Values scaled for {servings} servings
        </div>
      )}

      {/* Main Macros Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {nutritionItems.map((item) => (
          <div
            key={item.label}
            className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {item.value}
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-1">
                {item.unit}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {item.label}
            </div>

            {/* Progress Bar */}
            {showChart && (
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Sodium</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {scaleValue(nutrition.sodium)} mg
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cholesterol</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {scaleValue(nutrition.cholesterol)} mg
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-600 dark:text-gray-400">
        * Percent Daily Values are based on a 2,000 calorie diet. Your daily values may be
        higher or lower depending on your calorie needs.
      </div>
    </Card>
  );
};

RecipeNutrition.displayName = 'RecipeNutrition';
