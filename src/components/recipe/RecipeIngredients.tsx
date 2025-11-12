import React, { useState } from 'react';
import { Recipe } from '@/types';
import { Card, Checkbox } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeIngredientsProps {
  recipe: Recipe;
  servings?: number;
  className?: string;
  showCheckboxes?: boolean;
}

export const RecipeIngredients: React.FC<RecipeIngredientsProps> = ({
  recipe,
  servings = recipe.servings,
  className,
  showCheckboxes = true,
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const scaleFactor = servings / recipe.servings;

  const handleToggle = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const formatQuantity = (quantity: number): string => {
    const scaled = quantity * scaleFactor;

    // Convert to fraction if close to common fractions
    const fractions: Record<number, string> = {
      0.125: '⅛',
      0.25: '¼',
      0.333: '⅓',
      0.5: '½',
      0.667: '⅔',
      0.75: '¾',
    };

    const decimal = scaled % 1;
    const whole = Math.floor(scaled);

    for (const [value, symbol] of Object.entries(fractions)) {
      if (Math.abs(decimal - parseFloat(value)) < 0.05) {
        return whole > 0 ? `${whole} ${symbol}` : symbol;
      }
    }

    // Round to 2 decimal places
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(2);
  };

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Ingredients
        </h2>
        {servings !== recipe.servings && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Scaled for {servings} servings
          </span>
        )}
      </div>

      <div className="space-y-3">
        {recipe.ingredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);

          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 p-2 rounded-lg transition-colors',
                isChecked && 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              {showCheckboxes && (
                <Checkbox
                  checked={isChecked}
                  onChange={() => handleToggle(index)}
                  className="mt-0.5"
                />
              )}

              <div
                className={cn(
                  'flex-1',
                  isChecked && 'line-through text-gray-500 dark:text-gray-500'
                )}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatQuantity(ingredient.quantity)} {ingredient.unit}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {ingredient.ingredientId}
                    {ingredient.preparation && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}
                        ({ingredient.preparation})
                      </span>
                    )}
                  </span>
                </div>
                {ingredient.optional && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (optional)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      {showCheckboxes && checkedItems.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {checkedItems.size} / {recipe.ingredients.length} checked
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${(checkedItems.size / recipe.ingredients.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

RecipeIngredients.displayName = 'RecipeIngredients';
