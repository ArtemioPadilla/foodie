import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MealPlan } from '@/types';
import { Card, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface MonthViewProps {
  plan?: MealPlan;
  startDate?: Date;
  className?: string;
  onDayClick?: (dayIndex: number) => void;
}

/**
 * Month overview calendar showing meal plan coverage
 */
export const MonthView: React.FC<MonthViewProps> = ({
  plan,
  startDate = new Date(),
  className,
  onDayClick,
}) => {
  const { t } = useTranslation();

  const { monthName, daysInMonth, firstDayOfWeek, weeksInMonth } = useMemo(() => {
    const date = new Date(startDate);
    const monthName = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);

    return { monthName, daysInMonth, firstDayOfWeek, weeksInMonth };
  }, [startDate]);

  const weekDays = useMemo(() => {
    return [
      t('days.short.sun', 'Sun'),
      t('days.short.mon', 'Mon'),
      t('days.short.tue', 'Tue'),
      t('days.short.wed', 'Wed'),
      t('days.short.thu', 'Thu'),
      t('days.short.fri', 'Fri'),
      t('days.short.sat', 'Sat'),
    ];
  }, [t]);

  const getMealCount = (dayNumber: number): number => {
    if (!plan || !plan.days[dayNumber - 1]) return 0;

    const day = plan.days[dayNumber - 1];
    let count = 0;

    if (day.meals.breakfast) count++;
    if (day.meals.lunch) count++;
    if (day.meals.dinner) count++;
    if (day.meals.snacks && day.meals.snacks.length > 0) count++;

    return count;
  };

  const renderDay = (dayNumber: number | null, weekIndex: number, dayIndex: number) => {
    if (dayNumber === null) {
      return (
        <div
          key={`empty-${weekIndex}-${dayIndex}`}
          className="aspect-square p-2 bg-gray-50 dark:bg-gray-800/50"
        />
      );
    }

    const mealCount = getMealCount(dayNumber);
    const isToday =
      new Date().toDateString() ===
      new Date(startDate.getFullYear(), startDate.getMonth(), dayNumber).toDateString();
    const hasMeals = mealCount > 0;

    return (
      <button
        key={dayNumber}
        onClick={() => onDayClick?.(dayNumber - 1)}
        className={cn(
          'aspect-square p-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          'border border-gray-200 dark:border-gray-700',
          isToday && 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500',
          hasMeals && !isToday && 'bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        <div className="flex flex-col h-full">
          <span
            className={cn(
              'text-sm font-medium',
              isToday
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {dayNumber}
          </span>

          {hasMeals && (
            <div className="mt-auto">
              <Badge variant="default" size="sm">
                {mealCount} {mealCount === 1 ? 'meal' : 'meals'}
              </Badge>
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderCalendar = () => {
    const calendar: JSX.Element[] = [];
    let dayCounter = 1;

    for (let week = 0; week < weeksInMonth; week++) {
      const weekDays: JSX.Element[] = [];

      for (let day = 0; day < 7; day++) {
        const isEmptySlot = (week === 0 && day < firstDayOfWeek) || dayCounter > daysInMonth;

        weekDays.push(renderDay(isEmptySlot ? null : dayCounter, week, day));

        if (!isEmptySlot) dayCounter++;
      }

      calendar.push(
        <div key={week} className="grid grid-cols-7 gap-0">
          {weekDays}
        </div>
      );
    }

    return calendar;
  };

  return (
    <Card className={cn('space-y-4', className)}>
      {/* Month Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{monthName}</h2>
        {plan && (
          <Badge variant="default">
            {plan.days.length} {t('planner.daysPlanned', 'days planned')}
          </Badge>
        )}
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-0">{renderCalendar()}</div>

      {/* Legend */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">{t('common.today', 'Today')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border border-gray-200 dark:border-gray-700 rounded" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('planner.hasMeals', 'Has meals')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

MonthView.displayName = 'MonthView';
