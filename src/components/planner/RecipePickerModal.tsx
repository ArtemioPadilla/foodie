import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { Modal, Button } from '@components/common';
import { Recipe } from '@/types';
import { Search, X, Clock, Users, Star } from 'lucide-react';
import { cn } from '@utils/cn';

export interface RecipePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe, servings: number) => void;
  mealType: string;
  dayName?: string;
}

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  mealType,
  dayName,
}) => {
  const { t } = useTranslation();
  const { recipes, loading, initializeRecipes } = useRecipes();
  const { getTranslated } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);

  // Initialize recipes when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeRecipes();
    }
  }, [isOpen, initializeRecipes]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedRecipe(null);
      setServings(2);
    }
  }, [isOpen]);

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter((recipe) => {
      const name = getTranslated(recipe.name).toLowerCase();
      const description = getTranslated(recipe.description).toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [recipes, searchQuery, getTranslated]);

  const handleSelect = () => {
    if (selectedRecipe) {
      onSelect(selectedRecipe, servings);
      onClose();
    }
  };

  const mealTypeLabel = t(`planner.${mealType}`, mealType);
  const title = dayName
    ? t('planner.addRecipeToSlot', 'Add recipe to {{day}} - {{meal}}', { day: dayName, meal: mealTypeLabel })
    : t('planner.selectRecipe', 'Select a recipe');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={t('planner.browseAndSelect', 'Browse recipes and add one to your meal plan')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('recipe.search', 'Search recipes...')}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recipe List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-700 dark:text-gray-300">
              {t('common.noResults', 'No results found')}
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className={cn(
                  'w-full p-3 rounded-lg border-2 text-left transition-all flex gap-3',
                  selectedRecipe?.id === recipe.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                )}
              >
                {/* Recipe Image */}
                <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={getTranslated(recipe.name)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {getTranslated(recipe.name)}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                    {getTranslated(recipe.description)}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.totalTime} {t('common.minutesAbbr', 'min')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {recipe.servings}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {recipe.rating}
                    </span>
                  </div>
                </div>

                {/* Selected indicator */}
                {selectedRecipe?.id === recipe.id && (
                  <div className="flex items-center">
                    <svg
                      className="w-6 h-6 text-primary-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Servings Selection */}
        {selectedRecipe && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('recipe.servings', 'Servings')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label={t('recipe.decreaseServings', 'Decrease servings')}
                >
                  -
                </button>
                <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                  {servings}
                </span>
                <button
                  onClick={() => setServings(servings + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label={t('recipe.increaseServings', 'Increase servings')}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSelect}
            disabled={!selectedRecipe}
          >
            {t('planner.addRecipe', 'Add Recipe')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

RecipePickerModal.displayName = 'RecipePickerModal';
