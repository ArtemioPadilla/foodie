import React, { useState } from 'react';
import { ShoppingListItem as ShoppingListItemType } from '@/types';
import { ShoppingListItem } from './ShoppingListItem';
import { Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface CategoryGroupProps {
  category: string;
  items: ShoppingListItemType[];
  onToggleItem: (ingredientId: string) => void;
  onRemoveItem: (ingredientId: string) => void;
  onUpdateQuantity: (ingredientId: string, quantity: number) => void;
  onUpdateNotes: (ingredientId: string, notes: string) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

/**
 * Collapsible category group for shopping list items
 */
export const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  items,
  onToggleItem,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateNotes,
  className,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const allChecked = checkedCount === totalCount;

  return (
    <div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
      {/* Category Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors',
          'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          <svg
            className={cn(
              'w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform',
              !isCollapsed && 'transform rotate-90'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>

          {/* Category Name */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {category}
          </h3>

          {/* Item Count */}
          <Badge variant={allChecked ? 'success' : 'default'} size="sm">
            {checkedCount}/{totalCount}
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {allChecked && (
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </button>

      {/* Items List */}
      {!isCollapsed && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.ingredientId} className="px-4 py-2">
              <ShoppingListItem
                item={item}
                onToggle={() => onToggleItem(item.ingredientId)}
                onRemove={() => onRemoveItem(item.ingredientId)}
                onUpdateQuantity={(qty) => onUpdateQuantity(item.ingredientId, qty)}
                onUpdateNotes={(notes) => onUpdateNotes(item.ingredientId, notes)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

CategoryGroup.displayName = 'CategoryGroup';
