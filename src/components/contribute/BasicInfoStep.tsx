import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Select, Button, Card } from '@components/common';
import { cn } from '@utils/cn';

export interface BasicInfoStepProps {
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
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  className?: string;
}

/**
 * First step of recipe contribution wizard - Basic recipe information
 */
export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  className,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cuisineOptions = [
    { value: '', label: t('contribute.selectCuisine', 'Select cuisine...') },
    { value: 'american', label: t('cuisine.american', 'American') },
    { value: 'asian', label: t('cuisine.asian', 'Asian') },
    { value: 'chinese', label: t('cuisine.chinese', 'Chinese') },
    { value: 'french', label: t('cuisine.french', 'French') },
    { value: 'greek', label: t('cuisine.greek', 'Greek') },
    { value: 'indian', label: t('cuisine.indian', 'Indian') },
    { value: 'italian', label: t('cuisine.italian', 'Italian') },
    { value: 'japanese', label: t('cuisine.japanese', 'Japanese') },
    { value: 'mediterranean', label: t('cuisine.mediterranean', 'Mediterranean') },
    { value: 'mexican', label: t('cuisine.mexican', 'Mexican') },
    { value: 'middle-eastern', label: t('cuisine.middleEastern', 'Middle Eastern') },
    { value: 'spanish', label: t('cuisine.spanish', 'Spanish') },
    { value: 'thai', label: t('cuisine.thai', 'Thai') },
    { value: 'other', label: t('cuisine.other', 'Other') },
  ];

  const difficultyOptions = [
    { value: '', label: t('contribute.selectDifficulty', 'Select difficulty...') },
    { value: 'easy', label: t('difficulty.easy', 'Easy') },
    { value: 'medium', label: t('difficulty.medium', 'Medium') },
    { value: 'hard', label: t('difficulty.hard', 'Hard') },
  ];

  const mealTypeOptions = [
    { value: '', label: t('contribute.selectMealType', 'Select meal type...') },
    { value: 'breakfast', label: t('mealType.breakfast', 'Breakfast') },
    { value: 'lunch', label: t('mealType.lunch', 'Lunch') },
    { value: 'dinner', label: t('mealType.dinner', 'Dinner') },
    { value: 'snack', label: t('mealType.snack', 'Snack') },
    { value: 'dessert', label: t('mealType.dessert', 'Dessert') },
  ];

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation (at least English required)
    if (!data.nameEn.trim()) {
      newErrors.nameEn = t('contribute.nameRequired', 'Recipe name (English) is required');
    }

    // Description validation (at least English required)
    if (!data.descriptionEn.trim()) {
      newErrors.descriptionEn = t(
        'contribute.descriptionRequired',
        'Recipe description (English) is required'
      );
    } else if (data.descriptionEn.length < 20) {
      newErrors.descriptionEn = t(
        'contribute.descriptionTooShort',
        'Description must be at least 20 characters'
      );
    }

    // Cuisine validation
    if (!data.cuisine) {
      newErrors.cuisine = t('contribute.cuisineRequired', 'Cuisine is required');
    }

    // Difficulty validation
    if (!data.difficulty) {
      newErrors.difficulty = t('contribute.difficultyRequired', 'Difficulty is required');
    }

    // Meal type validation
    if (!data.mealType) {
      newErrors.mealType = t('contribute.mealTypeRequired', 'Meal type is required');
    }

    // Image URL validation (optional, but must be valid if provided)
    if (data.imageUrl && data.imageUrl.trim()) {
      try {
        new URL(data.imageUrl);
      } catch {
        newErrors.imageUrl = t('contribute.invalidImageUrl', 'Invalid image URL');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('contribute.basicInfo', 'Basic Information')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'contribute.basicInfoDescription',
              'Enter the basic details about your recipe'
            )}
          </p>
        </div>

        {/* Recipe Name - Multilingual */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('contribute.recipeName', 'Recipe Name')} *
          </label>

          <div className="space-y-2">
            <Input
              type="text"
              value={data.nameEn}
              onChange={(e) => onChange('nameEn', e.target.value)}
              placeholder={t('contribute.recipeNameEn', 'Recipe name in English')}
              error={errors.nameEn}
            />
            <Input
              type="text"
              value={data.nameEs}
              onChange={(e) => onChange('nameEs', e.target.value)}
              placeholder={t('contribute.recipeNameEs', 'Recipe name in Spanish (optional)')}
            />
            <Input
              type="text"
              value={data.nameFr}
              onChange={(e) => onChange('nameFr', e.target.value)}
              placeholder={t('contribute.recipeNameFr', 'Recipe name in French (optional)')}
            />
          </div>
        </div>

        {/* Recipe Description - Multilingual */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('contribute.recipeDescription', 'Recipe Description')} *
          </label>

          <div className="space-y-2">
            <div>
              <textarea
                value={data.descriptionEn}
                onChange={(e) => onChange('descriptionEn', e.target.value)}
                placeholder={t(
                  'contribute.recipeDescriptionEn',
                  'Describe your recipe in English (minimum 20 characters)'
                )}
                rows={3}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600',
                  errors.descriptionEn &&
                    'border-red-500 dark:border-red-500 focus:ring-red-500'
                )}
              />
              {errors.descriptionEn && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.descriptionEn}
                </p>
              )}
            </div>

            <textarea
              value={data.descriptionEs}
              onChange={(e) => onChange('descriptionEs', e.target.value)}
              placeholder={t(
                'contribute.recipeDescriptionEs',
                'Describe your recipe in Spanish (optional)'
              )}
              rows={3}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600'
              )}
            />

            <textarea
              value={data.nameFr}
              onChange={(e) => onChange('descriptionFr', e.target.value)}
              placeholder={t(
                'contribute.recipeDescriptionFr',
                'Describe your recipe in French (optional)'
              )}
              rows={3}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                'bg-white dark:bg-gray-800',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600'
              )}
            />
          </div>
        </div>

        {/* Cuisine, Difficulty, Meal Type - Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.cuisine', 'Cuisine')} *
            </label>
            <Select
              value={data.cuisine}
              onChange={(e) => onChange('cuisine', e.target.value)}
              options={cuisineOptions}
              error={errors.cuisine}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.difficulty', 'Difficulty')} *
            </label>
            <Select
              value={data.difficulty}
              onChange={(e) => onChange('difficulty', e.target.value)}
              options={difficultyOptions}
              error={errors.difficulty}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.mealType', 'Meal Type')} *
            </label>
            <Select
              value={data.mealType}
              onChange={(e) => onChange('mealType', e.target.value)}
              options={mealTypeOptions}
              error={errors.mealType}
            />
          </div>
        </div>

        {/* Image URL - Optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('contribute.imageUrl', 'Image URL')} ({t('common.optional', 'Optional')})
          </label>
          <Input
            type="url"
            value={data.imageUrl || ''}
            onChange={(e) => onChange('imageUrl', e.target.value)}
            placeholder="https://example.com/my-recipe-image.jpg"
            error={errors.imageUrl}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'contribute.imageUrlHint',
              'Provide a URL to an image of your finished dish'
            )}
          </p>
        </div>

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
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t(
                'contribute.basicInfoTip',
                'Fields marked with * are required. Providing translations helps make your recipe accessible to more users!'
              )}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          {onBack ? (
            <Button variant="secondary" onClick={onBack}>
              {t('common.back', 'Back')}
            </Button>
          ) : (
            <div />
          )}

          <Button variant="primary" onClick={handleNext}>
            {t('common.next', 'Next')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

BasicInfoStep.displayName = 'BasicInfoStep';
