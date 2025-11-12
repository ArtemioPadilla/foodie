import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MealPlan } from '@/types';
import { usePlanner } from '@contexts/PlannerContext';
import { Button, Input, Card, Badge, EmptyState } from '@components/common';
import { cn } from '@utils/cn';

export interface PlanTemplatesProps {
  className?: string;
  onSelect?: () => void;
}

/**
 * Template manager for saving and loading meal plan templates
 */
export const PlanTemplates: React.FC<PlanTemplatesProps> = ({ className, onSelect }) => {
  const { t } = useTranslation();
  const { currentPlan, loadPlan } = usePlanner();
  const [templates, setTemplates] = useState<MealPlan[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    // Load saved templates from localStorage
    const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
    setTemplates(savedPlans);
  }, []);

  const handleSaveAsTemplate = () => {
    if (!currentPlan || !templateName.trim()) return;

    // Create a copy of the current plan with the new name
    const template: MealPlan = {
      ...currentPlan,
      id: `template_${Date.now()}`,
      name: {
        en: templateName,
        es: templateName,
        fr: templateName,
      },
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
    savedPlans.push(template);
    localStorage.setItem('savedMealPlans', JSON.stringify(savedPlans));

    // Update state
    setTemplates(savedPlans);
    setTemplateName('');
    setShowSaveForm(false);
  };

  const handleLoadTemplate = (planId: string) => {
    loadPlan(planId);
    onSelect?.();
  };

  const handleDeleteTemplate = (planId: string) => {
    if (window.confirm(t('planner.confirmDeleteTemplate', 'Delete this template?'))) {
      const savedPlans = templates.filter((p) => p.id !== planId);
      localStorage.setItem('savedMealPlans', JSON.stringify(savedPlans));
      setTemplates(savedPlans);
    }
  };

  const getMealCount = (plan: MealPlan): number => {
    let count = 0;
    plan.days.forEach((day) => {
      if (day.meals.breakfast) count++;
      if (day.meals.lunch) count++;
      if (day.meals.dinner) count++;
      if (day.meals.snacks) count += day.meals.snacks.length;
    });
    return count;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('planner.templates', 'Meal Plan Templates')}
        </h2>

        {currentPlan && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowSaveForm(!showSaveForm)}
          >
            {showSaveForm
              ? t('common.cancel', 'Cancel')
              : t('planner.saveAsTemplate', 'Save as Template')}
          </Button>
        )}
      </div>

      {/* Save Template Form */}
      {showSaveForm && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder={t('planner.templateNamePlaceholder', 'Template name...')}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim()}
            >
              {t('common.save', 'Save Template')}
            </Button>
          </div>
        </Card>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <EmptyState
          title={t('planner.noTemplates', 'No Templates')}
          description={t(
            'planner.noTemplatesDescription',
            'Save your current meal plan as a template to reuse it later.'
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="space-y-3">
              {/* Template Info */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {template.name.en || template.name.es || template.name.fr}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.description.en || template.description.es || template.description.fr}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{template.days.length} days</span>
                </div>

                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>{getMealCount(template)} meals</span>
                </div>

                <Badge variant="default" size="sm">
                  {template.servings} servings
                </Badge>
              </div>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="default" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="default" size="sm">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => handleLoadTemplate(template.id)}
                >
                  {t('planner.loadTemplate', 'Load')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  {t('common.delete', 'Delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

PlanTemplates.displayName = 'PlanTemplates';
