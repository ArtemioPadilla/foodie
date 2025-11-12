import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select, Modal } from '@components/common';
import { ExportOptions } from './ExportOptions';
import { cn } from '@utils/cn';

export interface ListControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showChecked: boolean;
  onToggleShowChecked: () => void;
  sortBy: 'category' | 'name' | 'checked';
  onSortChange: (sort: 'category' | 'name' | 'checked') => void;
  onClearAll: () => void;
  onClearChecked: () => void;
  totalItems: number;
  checkedItems: number;
  className?: string;
}

/**
 * Control toolbar for shopping list with search, filters, and actions
 */
export const ListControls: React.FC<ListControlsProps> = ({
  searchQuery,
  onSearchChange,
  showChecked,
  onToggleShowChecked,
  sortBy,
  onSortChange,
  onClearAll,
  onClearChecked,
  totalItems,
  checkedItems,
  className,
}) => {
  const { t } = useTranslation();
  const [showExportModal, setShowExportModal] = useState(false);

  const handleClearAll = () => {
    if (window.confirm(t('shopping.confirmClearAll', 'Clear entire shopping list?'))) {
      onClearAll();
    }
  };

  const handleClearChecked = () => {
    if (checkedItems === 0) return;

    if (
      window.confirm(
        t('shopping.confirmClearChecked', `Remove ${checkedItems} checked items?`)
      )
    ) {
      onClearChecked();
    }
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Search and Sort Row */}
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Input
              type="search"
              placeholder={t('shopping.searchPlaceholder', 'Search items...')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Sort */}
          <div className="w-48">
            <Select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'category' | 'name' | 'checked')}
              options={[
                { value: 'category', label: t('shopping.sortByCategory', 'By Category') },
                { value: 'name', label: t('shopping.sortByName', 'By Name') },
                { value: 'checked', label: t('shopping.sortByChecked', 'By Status') },
              ]}
              className="w-full"
            />
          </div>

          {/* Show/Hide Checked */}
          <Button
            variant={showChecked ? 'secondary' : 'ghost'}
            size="md"
            onClick={onToggleShowChecked}
            leftIcon={
              showChecked ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              )
            }
          >
            {showChecked
              ? t('shopping.hideChecked', 'Hide Checked')
              : t('shopping.showChecked', 'Show Checked')}
          </Button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExportModal(true)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            }
          >
            {t('common.export', 'Export')}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearChecked}
            disabled={checkedItems === 0}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          >
            {t('shopping.clearChecked', 'Clear Checked')} ({checkedItems})
          </Button>

          <div className="flex-1" />

          <Button
            variant="danger"
            size="sm"
            onClick={handleClearAll}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          >
            {t('common.clearAll', 'Clear All')}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            {t('shopping.totalItems', 'Total items')}: <span className="font-semibold">{totalItems}</span>
          </div>
          <div>
            {t('shopping.checked', 'Checked')}: <span className="font-semibold">{checkedItems}</span>
          </div>
          <div>
            {t('shopping.remaining', 'Remaining')}:{' '}
            <span className="font-semibold">{totalItems - checkedItems}</span>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} size="md">
        <ExportOptions onClose={() => setShowExportModal(false)} />
      </Modal>
    </>
  );
};

ListControls.displayName = 'ListControls';
