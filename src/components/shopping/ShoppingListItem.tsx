import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingListItem as ShoppingListItemType } from '@/types';
import { Checkbox, Input, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onUpdateNotes: (notes: string) => void;
  className?: string;
}

/**
 * Individual shopping list item with checkbox, quantity editing, and notes
 */
export const ShoppingListItem: React.FC<ShoppingListItemProps> = ({
  item,
  onToggle,
  onRemove,
  onUpdateQuantity,
  onUpdateNotes,
  className,
}) => {
  const { t } = useTranslation();
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString());
  const [notesInput, setNotesInput] = useState(item.notes || '');

  const handleQuantitySubmit = () => {
    const newQuantity = parseFloat(quantityInput);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onUpdateQuantity(newQuantity);
    } else {
      setQuantityInput(item.quantity.toString());
    }
    setIsEditingQuantity(false);
  };

  const handleNotesSubmit = () => {
    onUpdateNotes(notesInput);
    setIsEditingNotes(false);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        item.checked && 'bg-gray-100 dark:bg-gray-800 opacity-70',
        !item.checked && 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800',
        className
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={item.checked}
        onChange={onToggle}
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Quantity and Ingredient */}
        <div className="flex items-center gap-2 flex-wrap">
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
            </div>
          ) : (
            <button
              onClick={() => setIsEditingQuantity(true)}
              className={cn(
                'font-semibold text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400',
                item.checked && 'line-through'
              )}
            >
              {item.quantity} {item.unit}
            </button>
          )}

          <span
            className={cn(
              'text-gray-700 dark:text-gray-300',
              item.checked && 'line-through'
            )}
          >
            {item.ingredientId}
          </span>

          {item.category && (
            <Badge variant="default" size="sm">
              {item.category}
            </Badge>
          )}
        </div>

        {/* Used In */}
        {item.usedIn && item.usedIn.length > 0 && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('shopping.usedIn', 'Used in')}: {item.usedIn.join(', ')}
          </div>
        )}

        {/* Notes */}
        {isEditingNotes ? (
          <div className="mt-2">
            <Input
              type="text"
              placeholder={t('shopping.addNotes', 'Add notes...')}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={handleNotesSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNotesSubmit();
                if (e.key === 'Escape') {
                  setNotesInput(item.notes || '');
                  setIsEditingNotes(false);
                }
              }}
              className="text-sm"
              autoFocus
            />
          </div>
        ) : item.notes ? (
          <div
            onClick={() => setIsEditingNotes(true)}
            className="mt-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
          >
            📝 {item.notes}
          </div>
        ) : (
          <button
            onClick={() => setIsEditingNotes(true)}
            className="mt-1 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
          >
            + {t('shopping.addNotes', 'Add notes')}
          </button>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        aria-label={t('common.remove', 'Remove')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

ShoppingListItem.displayName = 'ShoppingListItem';
