import React from 'react';
import { Button } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeScalerProps {
  servings: number;
  originalServings: number;
  onChange: (servings: number) => void;
  className?: string;
  min?: number;
  max?: number;
}

export const RecipeScaler: React.FC<RecipeScalerProps> = ({
  servings,
  originalServings,
  onChange,
  className,
  min = 1,
  max = 20,
}) => {
  const handleDecrease = () => {
    if (servings > min) {
      onChange(servings - 1);
    }
  };

  const handleIncrease = () => {
    if (servings < max) {
      onChange(servings + 1);
    }
  };

  const handleReset = () => {
    onChange(originalServings);
  };

  const scaleFactor = servings / originalServings;
  const isModified = servings !== originalServings;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Servings:
      </span>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDecrease}
          disabled={servings <= min}
          aria-label="Decrease servings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </Button>

        <div className="flex items-center justify-center min-w-[60px] h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {servings}
          </span>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleIncrease}
          disabled={servings >= max}
          aria-label="Increase servings"
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

      {isModified && (
        <>
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            ×{scaleFactor.toFixed(2)}
          </div>
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        </>
      )}
    </div>
  );
};

RecipeScaler.displayName = 'RecipeScaler';
