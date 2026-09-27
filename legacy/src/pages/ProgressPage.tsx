import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTracking } from '@contexts/TrackingContext';
import { getStartOfWeek } from '@utils/dateUtils';
import { TrendingUp, Award, Flame } from 'lucide-react';

export default function ProgressPage() {
  const { t } = useTranslation();
  const { calculateStreak, getAverageCalories, getWeeklySummary } = useTracking();
  const [view, setView] = useState<'week' | 'month'>('week');

  const streak = calculateStreak();
  const avgCalories = getAverageCalories(7);
  const weekStart = getStartOfWeek();
  const weeklySummary = getWeeklySummary(weekStart);

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('progress.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {t('progress.description')}
        </p>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('week')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            view === 'week'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('tracking.week')}
        </button>
        <button
          onClick={() => setView('month')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            view === 'month'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {t('tracking.month')}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('progress.averageCalories')}
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {avgCalories}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            cal/day (last 7 days)
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('progress.streakDays')}
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {streak}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            consecutive days
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Goals Met
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {weeklySummary.streakDays}/7
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            days this week
          </p>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('progress.dailyBreakdown')}
        </h2>

        {weeklySummary.days.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {t('progress.noData')}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t('progress.noDataDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklySummary.days.map((day) => {
              const percentage = day.goalProgress.calories.percentage;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                    <div className="font-medium">{dayName}</div>
                    <div className="text-xs">{dateStr}</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                      <div
                        className={`h-6 rounded-full transition-all ${
                          percentage < 80 ? 'bg-yellow-500' : percentage > 120 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900">
                        {day.totals.calories} / {day.goalProgress.calories.goal} cal
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
