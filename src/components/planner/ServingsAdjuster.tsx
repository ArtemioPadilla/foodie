import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanner } from '@contexts/PlannerContext';
import { Button } from '@components/common';
import { cn } from '@utils/cn';

export interface ServingsAdjusterProps {
  className?: string;
  min?: number;
  max?: number;
}

/**
 * Global servings adjuster for meal plans
 */
export const ServingsAdjuster: React.FC<ServingsAdjusterProps> = ({
  className,
  min = 1,
  max = 12,
}) => {
  const { t } = useTranslation();
  const { currentPlan, adjustGlobalServings } = usePlanner();

  if (!currentPlan) return null;

  const servings = currentPlan.servings;

  const handleDecrease = () => {
    if (servings > min) {
      adjustGlobalServings(servings - 1);
    }
  };

  const handleIncrease = () => {
    if (servings < max) {
      adjustGlobalServings(servings + 1);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {t('planner.servings', 'Servings')}:
      </span>

      <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecrease}
          disabled={servings <= min}
          className="px-2 py-1 rounded-r-none border-r border-gray-300 dark:border-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </Button>

        <span className="px-4 py-1 font-semibold text-gray-900 dark:text-gray-100 min-w-[3rem] text-center">
          {servings}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleIncrease}
          disabled={servings >= max}
          className="px-2 py-1 rounded-l-none border-l border-gray-300 dark:border-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Button>
      </div>

      <span className="text-xs text-gray-500 dark:text-gray-500">
        ({min}-{max})
      </span>
    </div>
  );
};

ServingsAdjuster.displayName = 'ServingsAdjuster';
