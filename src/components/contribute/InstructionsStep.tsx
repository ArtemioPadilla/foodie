import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@components/common';
import { cn } from '@utils/cn';

export interface InstructionsStepProps {
  data: {
    instructions: string[];
  };
  onChange: (field: string, value: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

/**
 * Fourth step of recipe contribution wizard - Step-by-step instructions editor
 */
export const InstructionsStep: React.FC<InstructionsStepProps> = ({
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

    // Must have at least one instruction
    if (data.instructions.length === 0) {
      newErrors.instructions = t(
        'contribute.instructionsRequired',
        'At least one instruction step is required'
      );
    }

    // Validate each instruction
    data.instructions.forEach((instruction, index) => {
      if (!instruction.trim()) {
        newErrors[`instruction-${index}`] = t(
          'contribute.instructionRequired',
          'Instruction cannot be empty'
        );
      } else if (instruction.trim().length < 10) {
        newErrors[`instruction-${index}`] = t(
          'contribute.instructionTooShort',
          'Instruction must be at least 10 characters'
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

  const handleAddInstruction = () => {
    onChange('instructions', [...data.instructions, '']);
  };

  const handleRemoveInstruction = (index: number) => {
    const updated = data.instructions.filter((_, i) => i !== index);
    onChange('instructions', updated);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const updated = data.instructions.map((instruction, i) => {
      if (i === index) {
        return value;
      }
      return instruction;
    });
    onChange('instructions', updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...data.instructions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange('instructions', updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === data.instructions.length - 1) return;
    const updated = [...data.instructions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange('instructions', updated);
  };

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('contribute.instructions', 'Instructions')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t(
                'contribute.instructionsDescription',
                'Provide step-by-step cooking instructions'
              )}
            </p>
          </div>
          <Button variant="primary" onClick={handleAddInstruction} size="sm">
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
            {t('contribute.addStep', 'Add Step')}
          </Button>
        </div>

        {/* Instructions List */}
        <div className="space-y-4">
          {data.instructions.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('contribute.noInstructionsYet', 'No instructions added yet')}
              </p>
              <Button variant="secondary" onClick={handleAddInstruction} size="sm">
                {t('contribute.addFirstStep', 'Add your first step')}
              </Button>
            </div>
          ) : (
            data.instructions.map((instruction, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-base font-semibold text-emerald-700 dark:text-emerald-300">
                    {index + 1}
                  </div>

                  {/* Instruction Textarea */}
                  <div className="flex-1">
                    <textarea
                      value={instruction}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      placeholder={t(
                        'contribute.instructionPlaceholder',
                        'Describe this step in detail...'
                      )}
                      rows={3}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-sm transition-colors resize-none',
                        'bg-white dark:bg-gray-900',
                        'border-gray-300 dark:border-gray-600',
                        'text-gray-900 dark:text-gray-100',
                        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600',
                        errors[`instruction-${index}`] &&
                          'border-red-500 dark:border-red-500 focus:ring-red-500'
                      )}
                    />
                    {errors[`instruction-${index}`] && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {errors[`instruction-${index}`]}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    {/* Move Up */}
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        index === 0
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                      aria-label={t('contribute.moveStepUp', 'Move step up')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === data.instructions.length - 1}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        index === data.instructions.length - 1
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                      aria-label={t('contribute.moveStepDown', 'Move step down')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(index)}
                      className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      aria-label={t('contribute.removeStep', 'Remove step')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
              </div>
            ))
          )}
        </div>

        {/* Error Message */}
        {errors.instructions && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{errors.instructions}</p>
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
                {t('contribute.instructionsTip', 'Tips for writing instructions')}:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  {t('contribute.instructionsTip1', 'Be clear and specific')}
                </li>
                <li>
                  {t(
                    'contribute.instructionsTip2',
                    'Include cooking times and temperatures'
                  )}
                </li>
                <li>
                  {t(
                    'contribute.instructionsTip3',
                    'Use the up/down arrows to reorder steps'
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

InstructionsStep.displayName = 'InstructionsStep';
