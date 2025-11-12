import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Card } from '@components/common';
import { cn } from '@utils/cn';

export interface TimingsStepProps {
  data: {
    prepTime: number;
    cookTime: number;
    restTime?: number;
    servings: number;
  };
  onChange: (field: string, value: number | undefined) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

/**
 * Second step of recipe contribution wizard - Timing and servings information
 */
export const TimingsStep: React.FC<TimingsStepProps> = ({
  data,
  onChange,
  onNext,
  onBack,
  className,
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalTime = useMemo(() => {
    return data.prepTime + data.cookTime + (data.restTime || 0);
  }, [data.prepTime, data.cookTime, data.restTime]);

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Prep time validation
    if (!data.prepTime || data.prepTime <= 0) {
      newErrors.prepTime = t(
        'contribute.prepTimeRequired',
        'Prep time must be greater than 0'
      );
    } else if (data.prepTime > 1440) {
      newErrors.prepTime = t(
        'contribute.prepTimeTooLong',
        'Prep time must be less than 24 hours (1440 minutes)'
      );
    }

    // Cook time validation
    if (!data.cookTime || data.cookTime <= 0) {
      newErrors.cookTime = t(
        'contribute.cookTimeRequired',
        'Cook time must be greater than 0'
      );
    } else if (data.cookTime > 1440) {
      newErrors.cookTime = t(
        'contribute.cookTimeTooLong',
        'Cook time must be less than 24 hours (1440 minutes)'
      );
    }

    // Rest time validation (optional, but must be valid if provided)
    if (data.restTime !== undefined && data.restTime !== null) {
      if (data.restTime < 0) {
        newErrors.restTime = t(
          'contribute.restTimeInvalid',
          'Rest time cannot be negative'
        );
      } else if (data.restTime > 1440) {
        newErrors.restTime = t(
          'contribute.restTimeTooLong',
          'Rest time must be less than 24 hours (1440 minutes)'
        );
      }
    }

    // Servings validation
    if (!data.servings || data.servings <= 0) {
      newErrors.servings = t(
        'contribute.servingsRequired',
        'Servings must be at least 1'
      );
    } else if (data.servings > 100) {
      newErrors.servings = t(
        'contribute.servingsTooMany',
        'Servings must be less than 100'
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      onChange(field, numValue);
    }
  };

  const formatTimeDisplay = (minutes: number): string => {
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

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('contribute.timingsInfo', 'Timing & Servings')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'contribute.timingsInfoDescription',
              'Specify how long your recipe takes and how many servings it makes'
            )}
          </p>
        </div>

        {/* Timing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prep Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.prepTime', 'Prep Time')} *
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="number"
                  value={data.prepTime || ''}
                  onChange={(e) => handleNumberChange('prepTime', e.target.value)}
                  placeholder="15"
                  min="1"
                  max="1440"
                  error={errors.prepTime}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                  {t('contribute.minutes', 'minutes')}
                </div>
              </div>
              {data.prepTime > 0 && !errors.prepTime && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatTimeDisplay(data.prepTime)}
                </p>
              )}
            </div>
          </div>

          {/* Cook Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.cookTime', 'Cook Time')} *
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="number"
                  value={data.cookTime || ''}
                  onChange={(e) => handleNumberChange('cookTime', e.target.value)}
                  placeholder="30"
                  min="1"
                  max="1440"
                  error={errors.cookTime}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                  {t('contribute.minutes', 'minutes')}
                </div>
              </div>
              {data.cookTime > 0 && !errors.cookTime && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatTimeDisplay(data.cookTime)}
                </p>
              )}
            </div>
          </div>

          {/* Rest Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.restTime', 'Rest Time')} ({t('common.optional', 'Optional')})
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="number"
                  value={data.restTime || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange('restTime', val === '' ? undefined : parseInt(val, 10));
                  }}
                  placeholder="0"
                  min="0"
                  max="1440"
                  error={errors.restTime}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 pointer-events-none">
                  {t('contribute.minutes', 'minutes')}
                </div>
              </div>
              {data.restTime !== undefined && data.restTime > 0 && !errors.restTime && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatTimeDisplay(data.restTime)}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t(
                'contribute.restTimeHint',
                'Time to cool, set, marinate, or rest before serving'
              )}
            </p>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contribute.servings', 'Servings')} *
            </label>
            <div className="space-y-2">
              <Input
                type="number"
                value={data.servings || ''}
                onChange={(e) => handleNumberChange('servings', e.target.value)}
                placeholder="4"
                min="1"
                max="100"
                error={errors.servings}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('contribute.servingsHint', 'Number of people this recipe serves')}
            </p>
          </div>
        </div>

        {/* Total Time Display */}
        {totalTime > 0 && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {t('contribute.totalTime', 'Total Time')}:
                </span>
              </div>
              <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                {formatTimeDisplay(totalTime)}
              </span>
            </div>
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
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t(
                'contribute.timingsTip',
                'Be realistic with timing estimates. Include time for ingredient prep in prep time. Rest time is for cooling, setting, or marinating.'
              )}
            </p>
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

TimingsStep.displayName = 'TimingsStep';
