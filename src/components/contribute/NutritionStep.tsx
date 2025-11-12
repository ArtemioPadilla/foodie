import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Card } from '@components/common';
import { cn } from '@utils/cn';

export interface NutritionStepProps {
  data: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  onChange: (field: string, value: number | undefined) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

/**
 * Fifth step of recipe contribution wizard - Nutrition information
 */
export const NutritionStep: React.FC<NutritionStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  className,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    // All nutrition fields are optional, but must be valid if provided
    const fields = [
      'calories',
      'protein',
      'carbohydrates',
      'fat',
      'fiber',
      'sodium',
      'sugar',
    ] as const;

    fields.forEach((field) => {
      const value = data[field];
      if (value !== undefined && value !== null) {
        if (value < 0) {
          newErrors[field] = t(
            'contribute.nutritionNegative',
            'Value cannot be negative'
          );
        }
        if (field === 'calories' && value > 10000) {
          newErrors[field] = t(
            'contribute.caloriesUnrealistic',
            'Calories seem unrealistic (max 10,000 per serving)'
          );
        }
        if (field !== 'calories' && field !== 'sodium' && value > 1000) {
          newErrors[field] = t(
            'contribute.nutritionUnrealistic',
            'Value seems unrealistic (max 1,000g per serving)'
          );
        }
        if (field === 'sodium' && value > 10000) {
          newErrors[field] = t(
            'contribute.sodiumUnrealistic',
            'Sodium seems unrealistic (max 10,000mg per serving)'
          );
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const handleNumberChange = (field: string, value: string) => {
    if (value === '') {
      onChange(field, undefined);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        onChange(field, numValue);
      }
    }
  };

  const hasAnyNutritionData = Object.values(data).some(
    (value) => value !== undefined && value !== null && value > 0
  );

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('contribute.nutritionInfo', 'Nutrition Information')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'contribute.nutritionInfoDescription',
              'Add nutrition facts per serving (optional but recommended)'
            )}
          </p>
        </div>

        {/* Nutrition Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.calories', 'Calories')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.calories ?? ''}
                onChange={(e) => handleNumberChange('calories', e.target.value)}
                placeholder="0"
                min="0"
                max="10000"
                step="1"
                error={errors.calories}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                kcal
              </div>
            </div>
          </div>

          {/* Protein */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.protein', 'Protein')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.protein ?? ''}
                onChange={(e) => handleNumberChange('protein', e.target.value)}
                placeholder="0"
                min="0"
                max="1000"
                step="0.1"
                error={errors.protein}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                g
              </div>
            </div>
          </div>

          {/* Carbohydrates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.carbohydrates', 'Carbohydrates')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.carbohydrates ?? ''}
                onChange={(e) => handleNumberChange('carbohydrates', e.target.value)}
                placeholder="0"
                min="0"
                max="1000"
                step="0.1"
                error={errors.carbohydrates}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                g
              </div>
            </div>
          </div>

          {/* Fat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.fat', 'Fat')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.fat ?? ''}
                onChange={(e) => handleNumberChange('fat', e.target.value)}
                placeholder="0"
                min="0"
                max="1000"
                step="0.1"
                error={errors.fat}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                g
              </div>
            </div>
          </div>

          {/* Fiber */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.fiber', 'Fiber')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.fiber ?? ''}
                onChange={(e) => handleNumberChange('fiber', e.target.value)}
                placeholder="0"
                min="0"
                max="1000"
                step="0.1"
                error={errors.fiber}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                g
              </div>
            </div>
          </div>

          {/* Sugar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.sugar', 'Sugar')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.sugar ?? ''}
                onChange={(e) => handleNumberChange('sugar', e.target.value)}
                placeholder="0"
                min="0"
                max="1000"
                step="0.1"
                error={errors.sugar}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                g
              </div>
            </div>
          </div>

          {/* Sodium */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('nutrition.sodium', 'Sodium')}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={data.sodium ?? ''}
                onChange={(e) => handleNumberChange('sodium', e.target.value)}
                placeholder="0"
                min="0"
                max="10000"
                step="1"
                error={errors.sodium}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                mg
              </div>
            </div>
          </div>
        </div>

        {/* Summary Box */}
        {hasAnyNutritionData && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              {t('contribute.nutritionSummary', 'Nutrition Summary per Serving')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {data.calories !== undefined && data.calories > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.calories', 'Calories')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.calories} kcal
                  </span>
                </div>
              )}
              {data.protein !== undefined && data.protein > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.protein', 'Protein')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.protein}g
                  </span>
                </div>
              )}
              {data.carbohydrates !== undefined && data.carbohydrates > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.carbs', 'Carbs')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.carbohydrates}g
                  </span>
                </div>
              )}
              {data.fat !== undefined && data.fat > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.fat', 'Fat')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.fat}g
                  </span>
                </div>
              )}
              {data.fiber !== undefined && data.fiber > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.fiber', 'Fiber')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.fiber}g
                  </span>
                </div>
              )}
              {data.sugar !== undefined && data.sugar > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.sugar', 'Sugar')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.sugar}g
                  </span>
                </div>
              )}
              {data.sodium !== undefined && data.sodium > 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('nutrition.sodium', 'Sodium')}:
                  </span>
                  <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-300">
                    {data.sodium}mg
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">
                {t('contribute.nutritionTip', 'Tips for nutrition information')}:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  {t(
                    'contribute.nutritionTip1',
                    'All fields are optional but recommended'
                  )}
                </li>
                <li>
                  {t(
                    'contribute.nutritionTip2',
                    'Use online calculators or nutrition databases'
                  )}
                </li>
                <li>
                  {t(
                    'contribute.nutritionTip3',
                    'Values should be per serving, not for the entire recipe'
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onBack}>
            {t('common.back', 'Back')}
          </Button>

          <Button variant="primary" onClick={handleNext}>
            {t('common.next', 'Next')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

NutritionStep.displayName = 'NutritionStep';
