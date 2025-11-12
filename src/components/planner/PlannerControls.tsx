import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanner } from '@contexts/PlannerContext';
import { Button, Modal } from '@components/common';
import { ServingsAdjuster } from './ServingsAdjuster';
import { PlanTemplates } from './PlanTemplates';
import { cn } from '@utils/cn';

export interface PlannerControlsProps {
  startDate?: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
}

/**
 * Control toolbar for meal planner with save, share, and date navigation
 */
export const PlannerControls: React.FC<PlannerControlsProps> = ({
  startDate = new Date(),
  onDateChange,
  className,
}) => {
  const { t } = useTranslation();
  const { currentPlan, savePlan, clearPlan } = usePlanner();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handlePrevWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange?.(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange?.(newDate);
  };

  const handleToday = () => {
    onDateChange?.(new Date());
  };

  const handleSave = () => {
    savePlan();
    // Could show toast notification
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyShareLink = () => {
    if (currentPlan?.shareToken) {
      const shareUrl = `${window.location.origin}/plans/${currentPlan.shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      // Could show toast notification
    }
  };

  const handleClear = () => {
    if (window.confirm(t('planner.confirmClear', 'Are you sure you want to clear this plan?'))) {
      clearPlan();
    }
  };

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-4', className)}>
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrevWeek}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleToday}>
            {t('common.today', 'Today')}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleNextWeek}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>

          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {startDate.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex-1" />

        {/* Servings Adjuster */}
        {currentPlan && <ServingsAdjuster />}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTemplates(true)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          >
            {t('planner.templates', 'Templates')}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            }
          >
            {t('common.share', 'Share')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            }
          >
            {t('common.save', 'Save')}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClear}>
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      </div>

      {/* Templates Modal */}
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} size="lg">
        <PlanTemplates onSelect={() => setShowTemplates(false)} />
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('planner.shareTitle', 'Share Meal Plan')}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              'planner.shareDescription',
              'Generate a shareable link that others can use to view or copy your meal plan.'
            )}
          </p>

          {currentPlan?.shareToken ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <code className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {`${window.location.origin}/plans/${currentPlan.shareToken}`}
                </code>
              </div>

              <Button variant="primary" fullWidth onClick={handleCopyShareLink}>
                {t('common.copyLink', 'Copy Link')}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('planner.noShareToken', 'No share link generated yet. Save your plan first.')}
              </p>
              <Button variant="primary" onClick={handleSave}>
                {t('common.save', 'Save Plan')}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

PlannerControls.displayName = 'PlannerControls';
