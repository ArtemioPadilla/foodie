import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Select, Button, Card, Checkbox } from '@components/common';
import { cn } from '@utils/cn';
import { RecipeIngredient } from '@/types';

export interface IngredientsStepProps {
  data: {
    ingredients: RecipeIngredient[];
  };
  onChange: (field: string, value: RecipeIngredient[]) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

/**
 * Third step of recipe contribution wizard - Ingredient list builder
 */
export const IngredientsStep: React.FC<IngredientsStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  className,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unitOptions = [
    { value: '', label: t('contribute.selectUnit', 'Select unit...') },
    { value: 'piece', label: t('unit.piece', 'piece') },
    { value: 'lb', label: t('unit.lb', 'lb') },
    { value: 'oz', label: t('unit.oz', 'oz') },
    { value: 'kg', label: t('unit.kg', 'kg') },
    { value: 'g', label: t('unit.g', 'g') },
    { value: 'cup', label: t('unit.cup', 'cup') },
    { value: 'tbsp', label: t('unit.tbsp', 'tbsp') },
    { value: 'tsp', label: t('unit.tsp', 'tsp') },
    { value: 'l', label: t('unit.l', 'L') },
    { value: 'ml', label: t('unit.ml', 'mL') },
    { value: 'whole', label: t('unit.whole', 'whole') },
    { value: 'clove', label: t('unit.clove', 'clove') },
    { value: 'bunch', label: t('unit.bunch', 'bunch') },
    { value: 'can', label: t('unit.can', 'can') },
    { value: 'package', label: t('unit.package', 'package') },
    { value: 'to taste', label: t('unit.toTaste', 'to taste') },
  ];

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Must have at least one ingredient
    if (data.ingredients.length === 0) {
      newErrors.ingredients = t(
        'contribute.ingredientsRequired',
        'At least one ingredient is required'
      );
    }

    // Validate each ingredient
    data.ingredients.forEach((ingredient, index) => {
      if (!ingredient.ingredientId.trim()) {
        newErrors[`ingredient-${index}-name`] = t(
          'contribute.ingredientNameRequired',
          'Ingredient name is required'
        );
      }

      if (!ingredient.quantity || ingredient.quantity <= 0) {
        newErrors[`ingredient-${index}-quantity`] = t(
          'contribute.ingredientQuantityRequired',
          'Quantity must be greater than 0'
        );
      }

      if (!ingredient.unit) {
        newErrors[`ingredient-${index}-unit`] = t(
          'contribute.ingredientUnitRequired',
          'Unit is required'
        );
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

  const handleAddIngredient = () => {
    const newIngredient: RecipeIngredient = {
      ingredientId: '',
      quantity: 1,
      unit: '',
      optional: false,
    };
    onChange('ingredients', [...data.ingredients, newIngredient]);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = data.ingredients.filter((_, i) => i !== index);
    onChange('ingredients', updated);
  };

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredient,
    value: string | number | boolean
  ) => {
    const updated = data.ingredients.map((ingredient, i) => {
      if (i === index) {
        return { ...ingredient, [field]: value };
      }
      return ingredient;
    });
    onChange('ingredients', updated);
  };

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('contribute.ingredients', 'Ingredients')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                'contribute.ingredientsDescription',
                'List all ingredients needed for your recipe'
              )}
            </p>
          </div>
          <Button variant="primary" onClick={handleAddIngredient} size="sm">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('contribute.addIngredient', 'Add Ingredient')}
          </Button>
        </div>

        {/* Ingredients List */}
        <div className="space-y-4">
          {data.ingredients.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('contribute.noIngredientsYet', 'No ingredients added yet')}
              </p>
              <Button variant="secondary" onClick={handleAddIngredient} size="sm">
                {t('contribute.addFirstIngredient', 'Add your first ingredient')}
              </Button>
            </div>
          ) : (
            data.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  {/* Ingredient Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                    {index + 1}
                  </div>

                  {/* Ingredient Fields */}
                  <div className="flex-1 space-y-3">
                    {/* Ingredient Name */}
                    <div>
                      <Input
                        type="text"
                        value={ingredient.ingredientId}
                        onChange={(e) =>
                          handleIngredientChange(index, 'ingredientId', e.target.value)
                        }
                        placeholder={t(
                          'contribute.ingredientNamePlaceholder',
                          'e.g., Chicken breast, Olive oil, Garlic'
                        )}
                        error={errors[`ingredient-${index}-name`]}
                      />
                    </div>

                    {/* Quantity and Unit Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) =>
                            handleIngredientChange(
                              index,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="1"
                          min="0"
                          step="0.1"
                          error={errors[`ingredient-${index}-quantity`]}
                        />
                      </div>
                      <div>
                        <Select
                          value={ingredient.unit}
                          onChange={(e) =>
                            handleIngredientChange(index, 'unit', e.target.value)
                          }
                          options={unitOptions}
                          error={errors[`ingredient-${index}-unit`]}
                        />
                      </div>
                    </div>

                    {/* Optional Checkbox */}
                    <div>
                      <Checkbox
                        checked={ingredient.optional || false}
                        onChange={(e) =>
                          handleIngredientChange(index, 'optional', e.target.checked)
                        }
                        label={t('contribute.optionalIngredient', 'Optional ingredient')}
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="flex-shrink-0 p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('contribute.removeIngredient', 'Remove ingredient')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error Message */}
        {errors.ingredients && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{errors.ingredients}</p>
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
                {t('contribute.ingredientsTip', 'Tips for listing ingredients')}:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  {t(
                    'contribute.ingredientsTip1',
                    'List ingredients in the order they are used'
                  )}
                </li>
                <li>
                  {t(
                    'contribute.ingredientsTip2',
                    'Be specific with quantities and units'
                  )}
                </li>
                <li>
                  {t(
                    'contribute.ingredientsTip3',
                    'Mark garnishes or optional items as "optional"'
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

IngredientsStep.displayName = 'IngredientsStep';
