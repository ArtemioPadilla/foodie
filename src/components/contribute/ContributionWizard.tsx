import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils/cn';
import { RecipeIngredient } from '@/types';
import { WizardProgress, WizardStep } from './WizardProgress';
import { BasicInfoStep } from './BasicInfoStep';
import { TimingsStep } from './TimingsStep';
import { IngredientsStep } from './IngredientsStep';
import { InstructionsStep } from './InstructionsStep';
import { NutritionStep } from './NutritionStep';
import { PreviewStep } from './PreviewStep';
import { SubmitStep } from './SubmitStep';

export interface ContributionWizardProps {
  onSubmit: (recipeData: RecipeFormData) => void;
  onCancel?: () => void;
  className?: string;
}

export interface RecipeFormData {
  // Basic Info
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

  // Timings
  prepTime: number;
  cookTime: number;
  restTime?: number;
  servings: number;

  // Ingredients
  ingredients: RecipeIngredient[];

  // Instructions
  instructions: string[];

  // Nutrition
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

const initialFormData: RecipeFormData = {
  nameEn: '',
  nameEs: '',
  nameFr: '',
  descriptionEn: '',
  descriptionEs: '',
  descriptionFr: '',
  cuisine: '',
  difficulty: 'medium',
  mealType: 'dinner',
  imageUrl: '',
  prepTime: 0,
  cookTime: 0,
  restTime: undefined,
  servings: 4,
  ingredients: [],
  instructions: [],
  calories: undefined,
  protein: undefined,
  carbohydrates: undefined,
  fat: undefined,
  fiber: undefined,
  sodium: undefined,
  sugar: undefined,
};

/**
 * Multi-step wizard for contributing recipes
 */
export const ContributionWizard: React.FC<ContributionWizardProps> = ({
  onSubmit,
  onCancel,
  className,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RecipeFormData>(initialFormData);

  const steps: WizardStep[] = [
    {
      id: 'basic',
      label: t('contribute.basicInfo', 'Basic Info'),
      description: t('contribute.basicInfoShort', 'Name & details'),
    },
    {
      id: 'timings',
      label: t('contribute.timings', 'Timings'),
      description: t('contribute.timingsShort', 'Times & servings'),
    },
    {
      id: 'ingredients',
      label: t('contribute.ingredients', 'Ingredients'),
      description: t('contribute.ingredientsShort', 'Ingredient list'),
    },
    {
      id: 'instructions',
      label: t('contribute.instructions', 'Instructions'),
      description: t('contribute.instructionsShort', 'Cooking steps'),
    },
    {
      id: 'nutrition',
      label: t('contribute.nutrition', 'Nutrition'),
      description: t('contribute.nutritionShort', 'Optional info'),
    },
    {
      id: 'preview',
      label: t('contribute.preview', 'Preview'),
      description: t('contribute.previewShort', 'Review'),
    },
    {
      id: 'submit',
      label: t('contribute.submit', 'Submit'),
      description: t('contribute.submitShort', 'Create PR'),
    },
  ];

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEdit = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <WizardProgress steps={steps} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 0 && (
          <BasicInfoStep
            data={{
              nameEn: formData.nameEn,
              nameEs: formData.nameEs,
              nameFr: formData.nameFr,
              descriptionEn: formData.descriptionEn,
              descriptionEs: formData.descriptionEs,
              descriptionFr: formData.descriptionFr,
              cuisine: formData.cuisine,
              difficulty: formData.difficulty,
              mealType: formData.mealType,
              imageUrl: formData.imageUrl,
            }}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={onCancel}
          />
        )}

        {currentStep === 1 && (
          <TimingsStep
            data={{
              prepTime: formData.prepTime,
              cookTime: formData.cookTime,
              restTime: formData.restTime,
              servings: formData.servings,
            }}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 2 && (
          <IngredientsStep
            data={{
              ingredients: formData.ingredients,
            }}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <InstructionsStep
            data={{
              instructions: formData.instructions,
            }}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <NutritionStep
            data={{
              calories: formData.calories,
              protein: formData.protein,
              carbohydrates: formData.carbohydrates,
              fat: formData.fat,
              fiber: formData.fiber,
              sodium: formData.sodium,
              sugar: formData.sugar,
            }}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 5 && (
          <PreviewStep
            data={formData}
            onSubmit={handleNext}
            onBack={handleBack}
            onEdit={handleEdit}
          />
        )}

        {currentStep === 6 && (
          <SubmitStep
            data={formData}
            onBack={handleBack}
            onSuccess={(prUrl, prNumber) => {
              console.log('PR created:', prUrl, prNumber);
              // Call the parent onSubmit callback
              onSubmit(formData);
            }}
          />
        )}
      </div>

      {/* Cancel Button (always visible) */}
      {onCancel && currentStep > 0 && currentStep < 6 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      )}
    </div>
  );
};

ContributionWizard.displayName = 'ContributionWizard';
