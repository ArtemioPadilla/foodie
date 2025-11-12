import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PantryItem as PantryItemType } from '@/types';
import { Badge, Input } from '@components/common';
import { cn } from '@utils/cn';

export interface PantryItemProps {
  item: PantryItemType;
  onUpdate: (updates: Partial<PantryItemType>) => void;
  onRemove: () => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Individual pantry item display with inline editing
 */
export const PantryItem: React.FC<PantryItemProps> = ({
  item,
  onUpdate,
  onRemove,
  onClick,
  className,
}) => {
  const { t } = useTranslation();
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString());

  const handleQuantitySubmit = () => {
    const newQuantity = parseFloat(quantityInput);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onUpdate({ quantity: newQuantity });
    } else {
      setQuantityInput(item.quantity.toString());
    }
    setIsEditingQuantity(false);
  };

  // Calculate days until expiration
  const getDaysUntilExpiration = (): number | null => {
    if (!item.expirationDate) return null;

    const now = new Date();
    const expDate = new Date(item.expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration();
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const isLowStock = item.quantity <= 1;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors',
        'bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-700',
        'hover:border-gray-300 dark:hover:border-gray-600',
        isExpired && 'border-red-500 bg-red-50 dark:bg-red-900/10',
        isExpiringSoon && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Ingredient Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {item.ingredientId}
          </h4>

          {/* Status Badges */}
          {isExpired && (
            <Badge variant="danger" size="sm">
              {t('pantry.expired', 'Expired')}
            </Badge>
          )}
          {isExpiringSoon && !isExpired && (
            <Badge variant="warning" size="sm">
              {t('pantry.expiringSoon', 'Expiring Soon')}
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="warning" size="sm">
              {t('pantry.lowStock', 'Low Stock')}
            </Badge>
          )}
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {isEditingQuantity ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onBlur={handleQuantitySubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuantitySubmit();
                  if (e.key === 'Escape') {
                    setQuantityInput(item.quantity.toString());
                    setIsEditingQuantity(false);
                  }
                }}
                className="w-20 text-sm"
                autoFocus
              />
              <span>{item.unit}</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingQuantity(true);
              }}
              className="hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <span className="font-medium">{item.quantity}</span> {item.unit}
            </button>
          )}

          {item.location && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {item.location}
              </span>
            </>
          )}
        </div>

        {/* Expiration Date */}
        {item.expirationDate && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {daysUntilExpiration !== null && daysUntilExpiration >= 0 ? (
              <span>
                {t('pantry.expiresIn', 'Expires in')} {daysUntilExpiration}{' '}
                {daysUntilExpiration === 1 ? t('common.day', 'day') : t('common.days', 'days')}
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                {t('pantry.expiredOn', 'Expired on')}{' '}
                {new Date(item.expirationDate).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label={t('common.remove', 'Remove')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

PantryItem.displayName = 'PantryItem';
