import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Badge } from '@components/common';
import { cn } from '@utils/cn';
import { RecipeIngredient } from '@/types';

export interface PreviewStepProps {
  data: {
    nameEn: string;
    nameEs: string;
    nameFr: string;
    descriptionEn: string;
    descriptionEs: string;
    descriptionFr: string;
    cuisine: string;
    difficulty: 'easy' | 'medium' | 'hard';
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
    imageUrl?: string;
    prepTime: number;
    cookTime: number;
    restTime?: number;
    servings: number;
    ingredients: RecipeIngredient[];
    instructions: string[];
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  onSubmit: () => void;
  onBack: () => void;
  onEdit: (step: number) => void;
  className?: string;
}

/**
 * Final preview step - Review all recipe information before submission
 */
export const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  onSubmit,
  onBack,
  onEdit,
  className,
}) => {
  const { t } = useTranslation();

  const totalTime = data.prepTime + data.cookTime + (data.restTime || 0);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return t('contribute.minutesFormat', '{{count}} min', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return t('contribute.hoursFormat', '{{count}} hr', { count: hours });
    }
    return t('contribute.hoursMinutesFormat', '{{hours}} hr {{minutes}} min', {
      hours,
      minutes: mins,
    });
  };

  const hasNutritionData = Object.entries({
    calories: data.calories,
    protein: data.protein,
    carbohydrates: data.carbohydrates,
    fat: data.fat,
    fiber: data.fiber,
    sodium: data.sodium,
    sugar: data.sugar,
  }).some(([_, value]) => value !== undefined && value !== null && value > 0);

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('contribute.preview', 'Preview & Submit')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'contribute.previewDescription',
              'Review your recipe before submitting. Click "Edit" to make changes to any section.'
            )}
          </p>
        </div>

        {/* Recipe Preview */}
        <div className="space-y-6">
          {/* Basic Info Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('contribute.basicInfo', 'Basic Information')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEdit(0)}>
                {t('common.edit', 'Edit')}
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.recipeName', 'Recipe Name')}
                </p>
                <p className="text-base text-gray-900 dark:text-gray-100">{data.nameEn}</p>
                {data.nameEs && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">ES: {data.nameEs}</p>
                )}
                {data.nameFr && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">FR: {data.nameFr}</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.recipeDescription', 'Description')}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{data.descriptionEn}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{data.cuisine}</Badge>
                <Badge variant={data.difficulty === 'easy' ? 'success' : data.difficulty === 'medium' ? 'warning' : 'danger'}>
                  {t(`difficulty.${data.difficulty}`, data.difficulty)}
                </Badge>
                <Badge variant="default">{t(`mealType.${data.mealType}`, data.mealType)}</Badge>
              </div>

              {data.imageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {t('contribute.image', 'Image')}
                  </p>
                  <img
                    src={data.imageUrl}
                    alt={data.nameEn}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Timing Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('contribute.timingsInfo', 'Timing & Servings')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
                {t('common.edit', 'Edit')}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.prepTime', 'Prep Time')}
                </p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {formatTime(data.prepTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.cookTime', 'Cook Time')}
                </p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {formatTime(data.cookTime)}
                </p>
              </div>
              {data.restTime !== undefined && data.restTime > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('contribute.restTime', 'Rest Time')}
                  </p>
                  <p className="text-base text-gray-900 dark:text-gray-100">
                    {formatTime(data.restTime)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.totalTime', 'Total Time')}
                </p>
                <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatTime(totalTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('contribute.servings', 'Servings')}
                </p>
                <p className="text-base text-gray-900 dark:text-gray-100">{data.servings}</p>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('contribute.ingredients', 'Ingredients')} ({data.ingredients.length})
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
                {t('common.edit', 'Edit')}
              </Button>
            </div>

            <ul className="space-y-2">
              {data.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-emerald-600 dark:text-emerald-400">•</span>
                  <span>
                    {ingredient.quantity} {ingredient.unit} {ingredient.ingredientId}
                    {ingredient.optional && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({t('common.optional', 'optional')})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('contribute.instructions', 'Instructions')} ({data.instructions.length})
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
                {t('common.edit', 'Edit')}
              </Button>
            </div>

            <ol className="space-y-3">
              {data.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {instruction}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Nutrition Section */}
          {hasNutritionData && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('contribute.nutritionInfo', 'Nutrition Information')}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
                  {t('common.edit', 'Edit')}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.calories !== undefined && data.calories > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.calories', 'Calories')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {data.calories} kcal
                    </p>
                  </div>
                )}
                {data.protein !== undefined && data.protein > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.protein', 'Protein')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{data.protein}g</p>
                  </div>
                )}
                {data.carbohydrates !== undefined && data.carbohydrates > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.carbs', 'Carbs')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">
                      {data.carbohydrates}g
                    </p>
                  </div>
                )}
                {data.fat !== undefined && data.fat > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.fat', 'Fat')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{data.fat}g</p>
                  </div>
                )}
                {data.fiber !== undefined && data.fiber > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.fiber', 'Fiber')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{data.fiber}g</p>
                  </div>
                )}
                {data.sugar !== undefined && data.sugar > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.sugar', 'Sugar')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{data.sugar}g</p>
                  </div>
                )}
                {data.sodium !== undefined && data.sodium > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('nutrition.sodium', 'Sodium')}
                    </p>
                    <p className="text-base text-gray-900 dark:text-gray-100">{data.sodium}mg</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              {t(
                'contribute.previewTip',
                'Everything looks good? Click "Submit Recipe" to create a pull request on GitHub. Your recipe will be reviewed before being added to the app.'
              )}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onBack}>
            {t('common.back', 'Back')}
          </Button>

          <Button variant="primary" onClick={onSubmit}>
            {t('contribute.submitRecipe', 'Submit Recipe')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

PreviewStep.displayName = 'PreviewStep';
