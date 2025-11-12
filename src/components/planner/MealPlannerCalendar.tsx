import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { usePlanner } from '@contexts/PlannerContext';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { PlannerControls } from './PlannerControls';
import { PlanSummary } from './PlanSummary';
import { Tabs, TabsList, TabsTrigger, TabsContent, EmptyState } from '@components/common';
import { cn } from '@utils/cn';

export interface MealPlannerCalendarProps {
  className?: string;
  onRecipeClick?: (recipeId: string) => void;
}

/**
 * Main meal planner calendar component with week and month views
 */
export const MealPlannerCalendar: React.FC<MealPlannerCalendarProps> = ({
  className,
  onRecipeClick,
}) => {
  const { t } = useTranslation();
  const { currentPlan, createPlan } = usePlanner();
  const [activeView, setActiveView] = useState<'week' | 'month'>('week');
  const [startDate, setStartDate] = useState(new Date());

  const handleSlotClick = (_dayIndex: number, _mealType: string, recipeId?: string) => {
    if (recipeId && onRecipeClick) {
      onRecipeClick(recipeId);
    }
  };

  const handleDayClick = (dayIndex: number) => {
    // Could navigate to specific day or show day details
    console.log('Day clicked:', dayIndex);
  };

  const handleCreatePlan = () => {
    createPlan({
      name: { en: 'My Meal Plan', es: 'Mi Plan de Comidas', fr: 'Mon Plan de Repas' },
      description: { en: '', es: '', fr: '' },
      servings: 2,
      difficulty: 'easy',
    });
  };

  // No plan exists
  if (!currentPlan) {
    return (
      <div className={cn('', className)}>
        <EmptyState
          title={t('planner.noPlan', 'No Meal Plan')}
          description={t(
            'planner.noPlanDescription',
            'Create a meal plan to start organizing your weekly meals.'
          )}
          action={{
            label: t('planner.createPlan', 'Create Meal Plan'),
            onClick: handleCreatePlan,
          }}
        />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn('space-y-6', className)}>
        {/* Controls */}
        <PlannerControls startDate={startDate} onDateChange={setStartDate} />

        {/* Summary */}
        <PlanSummary plan={currentPlan} />

        {/* Calendar Views */}
        <Tabs defaultValue="week" value={activeView} onValueChange={(v) => setActiveView(v as 'week' | 'month')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {currentPlan.name.en || currentPlan.name.es || currentPlan.name.fr}
            </h2>
            <TabsList>
              <TabsTrigger value="week">{t('planner.weekView', 'Week View')}</TabsTrigger>
              <TabsTrigger value="month">{t('planner.monthView', 'Month View')}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="week">
            <WeekView
              plan={currentPlan}
              startDate={startDate}
              onSlotClick={handleSlotClick}
            />
          </TabsContent>

          <TabsContent value="month">
            <MonthView
              plan={currentPlan}
              startDate={startDate}
              onDayClick={handleDayClick}
            />
          </TabsContent>
        </Tabs>

        {/* Help Text */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
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
              <p className="font-medium mb-1">{t('planner.helpTitle', 'How to use')}</p>
              <p>
                {t(
                  'planner.helpText',
                  'Drag recipes from the recipe list to meal slots. Click on a meal to view recipe details. Use the controls above to save, share, or adjust your plan.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

MealPlannerCalendar.displayName = 'MealPlannerCalendar';
