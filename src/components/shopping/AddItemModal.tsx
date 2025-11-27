import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShoppingListItem } from '@/types';
import {
  SHOPPING_CATEGORIES,
  getAllCategories,
  type ShoppingCategory
} from '@constants/categories';
import { useToast } from '@components/common/Toast';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<ShoppingListItem, 'checked'>) => void;
}

export function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('piece');
  const [category, setCategory] = useState<ShoppingCategory>(SHOPPING_CATEGORIES.OTHER);
  const [notes, setNotes] = useState('');

  const categoryOptions = getAllCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ingredientId.trim()) return;

    // Validate quantity
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.error(t('shopping.invalidQuantity', 'Please enter a valid quantity greater than 0'));
      return;
    }

    // Generate unique ID using crypto.randomUUID if available, fallback to timestamp
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    onAdd({
      ingredientId: `custom_${uniqueId}_${ingredientId.toLowerCase().replace(/\s+/g, '_')}`,
      quantity: parsedQuantity,
      unit,
      category,
      usedIn: [],
      notes: notes.trim() || undefined,
    });

    // Reset form
    setIngredientId('');
    setQuantity('1');
    setUnit('piece');
    setCategory(SHOPPING_CATEGORIES.OTHER);
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('shopping.addCustomItem')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shopping.itemName')}
            </label>
            <input
              type="text"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className="input w-full"
              required
              data-testid="item-name-input"
              placeholder={t('shopping.itemNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shopping.quantity')}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.01"
                step="0.01"
                className="input w-full"
                required
                data-testid="item-quantity-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('shopping.unit')}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input w-full"
                data-testid="item-unit-select"
              >
                <option value="piece">{t('units.piece')}</option>
                <option value="lb">{t('units.lb')}</option>
                <option value="oz">{t('units.oz')}</option>
                <option value="cup">{t('units.cup')}</option>
                <option value="tbsp">{t('units.tbsp')}</option>
                <option value="tsp">{t('units.tsp')}</option>
                <option value="ml">{t('units.ml')}</option>
                <option value="l">{t('units.l')}</option>
                <option value="g">{t('units.g')}</option>
                <option value="kg">{t('units.kg')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shopping.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
              className="input w-full"
              data-testid="item-category-select"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {t(cat.label)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('shopping.notes')} ({t('common.optional')})
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              rows={2}
              data-testid="item-notes-input"
              placeholder={t('shopping.notesPlaceholder')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              data-testid="submit-add-item"
            >
              {t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
