import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils/cn';

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

export interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  className?: string;
}

/**
 * Multi-step wizard progress indicator
 */
export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn('', className)}>
      {/* Steps */}
      <nav aria-label={t('contribute.wizardProgress', 'Recipe contribution progress')}>
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;

            return (
              <li key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                      'relative z-10',
                      isCompleted &&
                        'bg-emerald-500 text-white',
                      isCurrent &&
                        'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-900',
                      isUpcoming &&
                        'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-5 left-1/2 w-full h-0.5 -ml-2',
                      isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile Step Counter */}
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400 md:hidden">
        {t('contribute.stepCounter', 'Step {{current}} of {{total}}', {
          current: currentStep + 1,
          total: steps.length,
        })}
      </div>
    </div>
  );
};

WizardProgress.displayName = 'WizardProgress';
