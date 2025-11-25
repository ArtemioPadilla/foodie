import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '@/types';
import { Card, Checkbox } from '@components/common';
import { useIngredients } from '@contexts/IngredientContext';
import { useUnitConversion, UnitSystem } from '@hooks/useUnitConversion';
import { cn } from '@utils/cn';
import { Scale } from 'lucide-react';

export interface RecipeIngredientsProps {
  recipe: Recipe;
  servings?: number;
  className?: string;
  showCheckboxes?: boolean;
  showUnitToggle?: boolean;
}

export const RecipeIngredients: React.FC<RecipeIngredientsProps> = ({
  recipe,
  servings = recipe.servings,
  className,
  showCheckboxes = true,
  showUnitToggle = true,
}) => {
  const { t } = useTranslation();
  const { getIngredientName } = useIngredients();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [unitOverride, setUnitOverride] = useState<UnitSystem | undefined>(undefined);

  const { convert, preferredSystem } = useUnitConversion(unitOverride);
  const currentSystem = unitOverride || preferredSystem;

  const scaleFactor = servings / recipe.servings;

  const toggleUnitSystem = () => {
    const newSystem = currentSystem === 'metric' ? 'imperial' : 'metric';
    setUnitOverride(newSystem);
  };

  const handleToggle = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('recipe.ingredients')}
        </h2>
        <div className="flex items-center gap-3">
          {servings !== recipe.servings && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              {t('recipe.scaledForServings', { servings })}
            </span>
          )}
          {showUnitToggle && (
            <button
              onClick={toggleUnitSystem}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={t('profile.unitSystem', 'Unit System')}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{currentSystem === 'metric' ? 'kg/g' : 'lb/oz'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {recipe.ingredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);

          // Apply scaling first, then unit conversion
          const scaledQuantity = ingredient.quantity * scaleFactor;
          const { unit: convertedUnit, formatted } = convert(scaledQuantity, ingredient.unit);

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
                  isChecked && 'line-through text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatted} {t(`units.${convertedUnit}`, convertedUnit)}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {getIngredientName(ingredient.ingredientId)}
                    {ingredient.preparation && (
                      <span className="text-gray-700 dark:text-gray-300">
                        {' '}
                        ({ingredient.preparation})
                      </span>
                    )}
                  </span>
                </div>
                {ingredient.optional && (
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    ({t('common.optional')})
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
            <span className="text-gray-700 dark:text-gray-300">{t('common.progress')}</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {t('common.checkedProgress', { checked: checkedItems.size, total: recipe.ingredients.length })}
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
