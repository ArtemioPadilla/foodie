import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, RotateCcw, Search, X } from 'lucide-react';
import { useIngredients } from '@contexts/IngredientContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useToast } from './Toast';

interface PriceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PriceManagementModal({ isOpen, onClose }: PriceManagementModalProps) {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const toast = useToast();
  const {
    ingredients,
    getIngredientPrice,
    setIngredientPrice,
    resetIngredientPrice,
    resetAllPrices,
    isCustomPrice,
  } = useIngredients();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);

  // Filter and search ingredients
  const filteredIngredients = useMemo(() => {
    let filtered = ingredients;

    // Filter by custom prices only
    if (filterCustomOnly) {
      filtered = filtered.filter((ing) => isCustomPrice(ing.id));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((ing) => {
        const name = getTranslated(ing.name).toLowerCase();
        const category = ing.category?.toLowerCase() || '';
        return name.includes(term) || category.includes(term);
      });
    }

    return filtered;
  }, [ingredients, searchTerm, filterCustomOnly, isCustomPrice, getTranslated]);

  const handleStartEdit = (ingredientId: string) => {
    const currentPrice = getIngredientPrice(ingredientId);
    setEditingId(ingredientId);
    setEditValue(currentPrice !== undefined ? currentPrice.toString() : '');
  };

  const handleSaveEdit = (ingredientId: string) => {
    const price = parseFloat(editValue);
    if (!isNaN(price) && price > 0) {
      setIngredientPrice(ingredientId, price);
      setEditingId(null);
      setEditValue('');
    } else {
      toast.error(t('ingredients.invalidPrice', 'Please enter a valid price greater than 0'));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleResetAll = () => {
    if (window.confirm(t('ingredients.confirmResetAll', 'Reset all prices to defaults? This cannot be undone.'))) {
      resetAllPrices();
    }
  };

  const customPriceCount = ingredients.filter((ing) => isCustomPrice(ing.id)).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('ingredients.managePrices', 'Manage Ingredient Prices')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('ingredients.customPricesCount', {
                count: customPriceCount,
                defaultMessage: `${customPriceCount} custom prices set`,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('ingredients.searchIngredients', 'Search ingredients...')}
              className="input w-full pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterCustomOnly}
                onChange={(e) => setFilterCustomOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('ingredients.showCustomOnly', 'Show custom prices only')}
              </span>
            </label>

            {customPriceCount > 0 && (
              <button
                onClick={handleResetAll}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t('ingredients.resetAll', 'Reset All')}
              </button>
            )}
          </div>
        </div>

        {/* Ingredient List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? t('ingredients.noResults', 'No ingredients found')
                  : t('ingredients.noCustomPrices', 'No custom prices set')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIngredients.map((ingredient) => {
                const price = getIngredientPrice(ingredient.id);
                const isCustom = isCustomPrice(ingredient.id);
                const isEditing = editingId === ingredient.id;

                return (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getTranslated(ingredient.name)}
                        </span>
                        {isCustom && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            {t('ingredients.custom', 'Custom')}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {ingredient.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              min="0.01"
                              step="0.01"
                              className="input w-24"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(ingredient.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleSaveEdit(ingredient.id)}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            {t('common.save', 'Save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-secondary text-sm px-3 py-1"
                          >
                            {t('common.cancel', 'Cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            {price !== undefined ? (
                              <span className="font-semibold text-gray-900 dark:text-white">
                                ${price.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('ingredients.noPrice', 'No price')}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartEdit(ingredient.id)}
                            className="btn-secondary text-sm px-3 py-1"
                          >
                            {t('common.edit', 'Edit')}
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => resetIngredientPrice(ingredient.id)}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title={t('ingredients.resetToDefault', 'Reset to default')}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-primary w-full">
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
}
