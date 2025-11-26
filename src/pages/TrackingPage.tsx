import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@contexts/LanguageContext';
import { useTracking } from '@contexts/TrackingContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useIngredients } from '@contexts/IngredientContext';
import { useBeverages } from '@contexts/BeverageContext';
import QuickAddModal from '@components/tracking/QuickAddModal';
import { Plus, Trash2 } from 'lucide-react';
import type { TrackingEntry } from '@/types';

export default function TrackingPage() {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const { getEntriesByDate, getDailySummary, goals, deleteEntry } = useTracking();
  const { recipes } = useRecipes();
  const { ingredients } = useIngredients();
  const { beverages } = useBeverages();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('breakfast');

  // Get entries for selected date
  const selectedEntries = getEntriesByDate(selectedDate);
  const dailySummary = getDailySummary(selectedDate);
  const { totals: selectedTotals, goalProgress: selectedProgress } = dailySummary;

  // Group entries by meal type
  const breakfastEntries = selectedEntries.filter(e => e.mealType === 'breakfast');
  const lunchEntries = selectedEntries.filter(e => e.mealType === 'lunch');
  const dinnerEntries = selectedEntries.filter(e => e.mealType === 'dinner');
  const snackEntries = selectedEntries.filter(e => e.mealType === 'snack');
  const beverageEntries = selectedEntries.filter(e => e.mealType === 'beverage');

  const calculateMealCalories = (entries: typeof selectedEntries) => {
    return entries.reduce((sum, entry) => sum + entry.nutrition.calories, 0);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 80) return 'bg-yellow-500';
    if (percentage > 120) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getEntryDisplayName = (entry: TrackingEntry): string => {
    if (entry.recipeId) {
      const recipe = recipes.find(r => r.id === entry.recipeId);
      return recipe ? getTranslated(recipe.name) : 'Recipe';
    }
    if (entry.ingredientId) {
      const ingredient = ingredients.find(i => i.id === entry.ingredientId);
      return ingredient ? getTranslated(ingredient.name) : 'Ingredient';
    }
    if (entry.beverageId) {
      const beverage = beverages.find(b => b.id === entry.beverageId);
      return beverage ? getTranslated(beverage.name) : 'Beverage';
    }
    return entry.customName ? getTranslated(entry.customName) : 'Food Item';
  };

  const handleOpenModal = (mealType: string) => {
    setSelectedMealType(mealType);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = (id: string, entryName: string) => {
    if (window.confirm(`Are you sure you want to delete "${entryName}"?`)) {
      deleteEntry(id);
    }
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('tracking.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {t('tracking.description')}
        </p>
      </div>

      {/* Date Selector and Quick Add */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {t('tracking.today')}
        </button>
        <button
          onClick={() => handleOpenModal('breakfast')}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-2 ml-auto"
        >
          <Plus className="h-5 w-5" />
          {t('tracking.quickAdd')}
        </button>
      </div>

      {/* Nutrition Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedTotals.calories} / {goals.calories}
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedProgress.calories.remaining} {t('tracking.caloriesRemaining')}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getProgressColor(selectedProgress.calories.percentage)}`}
              style={{ width: `${Math.min(selectedProgress.calories.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('goals.protein')}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Math.round(selectedTotals.protein)}g / {goals.protein}g
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(selectedProgress.protein.percentage, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('goals.carbs')}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Math.round(selectedTotals.carbs)}g / {goals.carbs}g
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-orange-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(selectedProgress.carbs.percentage, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('goals.fat')}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Math.round(selectedTotals.fat)}g / {goals.fat}g
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-yellow-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(selectedProgress.fat.percentage, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('goals.fiber')}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {Math.round(selectedTotals.fiber)}g / {goals.fiber}g
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(selectedProgress.fiber.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meal Sections */}
      <div className="space-y-4">
        {/* Breakfast */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('tracking.breakfast')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {calculateMealCalories(breakfastEntries)} cal
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('breakfast')}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {t('common.add')}
            </button>
          </div>
          {breakfastEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              {t('tracking.noEntries')}
            </p>
          ) : (
            <div className="space-y-2">
              {breakfastEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getEntryDisplayName(entry)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, getEntryDisplayName(entry))}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('tracking.deleteEntry')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lunch */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('tracking.lunch')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {calculateMealCalories(lunchEntries)} cal
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('lunch')}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {t('common.add')}
            </button>
          </div>
          {lunchEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              {t('tracking.noEntries')}
            </p>
          ) : (
            <div className="space-y-2">
              {lunchEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getEntryDisplayName(entry)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, getEntryDisplayName(entry))}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('tracking.deleteEntry')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dinner */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('tracking.dinner')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {calculateMealCalories(dinnerEntries)} cal
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('dinner')}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {t('common.add')}
            </button>
          </div>
          {dinnerEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              {t('tracking.noEntries')}
            </p>
          ) : (
            <div className="space-y-2">
              {dinnerEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getEntryDisplayName(entry)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, getEntryDisplayName(entry))}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('tracking.deleteEntry')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snacks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('tracking.snack')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {calculateMealCalories(snackEntries)} cal
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('snack')}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {t('common.add')}
            </button>
          </div>
          {snackEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              {t('tracking.noEntries')}
            </p>
          ) : (
            <div className="space-y-2">
              {snackEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getEntryDisplayName(entry)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, getEntryDisplayName(entry))}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('tracking.deleteEntry')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Beverages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('tracking.beverage')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {calculateMealCalories(beverageEntries)} cal
              </p>
            </div>
            <button
              onClick={() => handleOpenModal('beverage')}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {t('common.add')}
            </button>
          </div>
          {beverageEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              {t('tracking.noEntries')}
            </p>
          ) : (
            <div className="space-y-2">
              {beverageEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getEntryDisplayName(entry)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id, getEntryDisplayName(entry))}
                    className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={t('tracking.deleteEntry')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedMealType={selectedMealType}
        date={selectedDate}
      />
    </div>
  );
}
