import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '@/types';
import { Card, Button, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeInstructionsProps {
  recipe: Recipe;
  className?: string;
  showTimers?: boolean;
  onTimerStart?: (stepIndex: number, duration: number) => void;
}

export const RecipeInstructions: React.FC<RecipeInstructionsProps> = ({
  recipe,
  className,
  showTimers = true,
  onTimerStart,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'es' | 'fr';
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleStepToggle = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  const totalTime = recipe.instructions.reduce((sum, inst) => sum + (inst.time || 0), 0);

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Instructions
        </h2>
        {totalTime > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Total: {totalTime} min</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {recipe.instructions.map((instruction, index) => {
          const text =
            instruction.text[currentLang] || instruction.text.en;
          const isCompleted = completedSteps.has(index);

          return (
            <div
              key={instruction.step}
              className={cn(
                'relative pl-12 pb-6',
                index !== recipe.instructions.length - 1 &&
                  'border-l-2 border-gray-200 dark:border-gray-700 ml-6'
              )}
            >
              {/* Step Number Circle */}
              <div
                className={cn(
                  'absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all',
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  instruction.step
                )}
              </div>

              {/* Content */}
              <div className={cn(isCompleted && 'opacity-60')}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p
                    className={cn(
                      'text-gray-900 dark:text-gray-100 leading-relaxed',
                      isCompleted && 'line-through'
                    )}
                  >
                    {text}
                  </p>
                  {instruction.time && instruction.time > 0 && (
                    <Badge variant="info" size="sm" className="shrink-0">
                      {instruction.time}m
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={isCompleted ? 'secondary' : 'primary'}
                    onClick={() => handleStepToggle(index)}
                  >
                    {isCompleted ? 'Undo' : 'Mark Complete'}
                  </Button>

                  {showTimers && instruction.time && instruction.time > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onTimerStart?.(index, instruction.time!)}
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      }
                    >
                      Start Timer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      {completedSteps.size > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {completedSteps.size} / {recipe.instructions.length} steps completed
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${(completedSteps.size / recipe.instructions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

RecipeInstructions.displayName = 'RecipeInstructions';
