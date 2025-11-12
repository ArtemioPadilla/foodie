import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePantry } from '@contexts/PantryContext';
import { Card, Badge, EmptyState } from '@components/common';
import { PantryItem } from './PantryItem';
import { cn } from '@utils/cn';

export interface ExpirationTrackerProps {
  daysThreshold?: number;
  className?: string;
  onItemClick?: (itemId: string) => void;
}

/**
 * Tracks and displays pantry items that are expiring soon
 */
export const ExpirationTracker: React.FC<ExpirationTrackerProps> = ({
  daysThreshold = 7,
  className,
  onItemClick,
}) => {
  const { t } = useTranslation();
  const { pantryItems, removeItem, updateItem } = usePantry();

  const { expiringItems, expiredItems } = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const expiring: typeof pantryItems = [];
    const expired: typeof pantryItems = [];

    pantryItems.forEach((item) => {
      if (!item.expirationDate) return;

      const expDate = new Date(item.expirationDate);

      if (expDate < now) {
        expired.push(item);
      } else if (expDate <= threshold) {
        expiring.push(item);
      }
    });

    // Sort by expiration date (soonest first)
    expiring.sort((a, b) => {
      const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
      const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
      return dateA - dateB;
    });

    expired.sort((a, b) => {
      const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
      const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
      return dateB - dateA; // Most recently expired first
    });

    return { expiringItems: expiring, expiredItems: expired };
  }, [pantryItems, daysThreshold]);

  const totalItems = expiringItems.length + expiredItems.length;

  if (totalItems === 0) {
    return (
      <Card className={cn('', className)}>
        <EmptyState
          title={t('pantry.noExpiringItems', 'All Good!')}
          description={t(
            'pantry.noExpiringDescription',
            'No items are expiring in the next {days} days',
            { days: daysThreshold }
          )}
        />
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('pantry.expirationTracker', 'Expiration Tracker')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('pantry.trackingNext', 'Tracking items expiring in the next {days} days', {
                days: daysThreshold,
              })}
            </p>
          </div>

          <Badge
            variant={expiredItems.length > 0 ? 'danger' : 'warning'}
            size="md"
          >
            {totalItems} {totalItems === 1 ? t('common.item', 'item') : t('common.items', 'items')}
          </Badge>
        </div>

        {/* Expired Items */}
        {expiredItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="font-semibold text-red-600 dark:text-red-400">
                {t('pantry.expired', 'Expired')} ({expiredItems.length})
              </h3>
            </div>

            <div className="space-y-2">
              {expiredItems.map((item) => (
                <PantryItem
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onRemove={() => removeItem(item.id)}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expiring Soon Items */}
        {expiringItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
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
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400">
                {t('pantry.expiringSoon', 'Expiring Soon')} ({expiringItems.length})
              </h3>
            </div>

            <div className="space-y-2">
              {expiringItems.map((item) => (
                <PantryItem
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onRemove={() => removeItem(item.id)}
                  onClick={() => onItemClick?.(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
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
                'pantry.expirationTip',
                'Use expiring ingredients first when planning meals to reduce food waste.'
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

ExpirationTracker.displayName = 'ExpirationTracker';
