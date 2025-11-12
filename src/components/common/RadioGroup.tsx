import React from 'react';
import { cn } from '@utils/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      options,
      value,
      onChange,
      label,
      error,
      orientation = 'vertical',
      className,
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)}>
        {label && (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </span>
        )}
        <div
          className={cn(
            'flex gap-4',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-start gap-2">
              <input
                type="radio"
                id={`${name}-${option.value}`}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className={cn(
                  'mt-0.5 h-4 w-4 border-gray-300 dark:border-gray-600',
                  'text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0',
                  'bg-white dark:bg-gray-800',
                  'transition-colors cursor-pointer',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor={`${name}-${option.value}`}
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
