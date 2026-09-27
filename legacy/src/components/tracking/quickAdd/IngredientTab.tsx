import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@contexts/LanguageContext';
import { useIngredients } from '@contexts/IngredientContext';
import { useTracking } from '@contexts/TrackingContext';
import { estimateIngredientNutrition } from '@utils/nutritionCalculator';
import { getCurrentTime } from '@utils/dateUtils';
import { Search } from 'lucide-react';

interface IngredientTabProps {
  mealType: string;
  date: string;
  onSuccess: () => void;
}

export default function IngredientTab({ mealType, date, onSuccess }: IngredientTabProps) {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const { ingredients } = useIngredients();
  const { logEntry } = useTracking();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(ingredients.map(i => i.category)));
    return ['all', ...cats];
  }, [ingredients]);

  // Filter ingredients
  const filteredIngredients = useMemo(() => {
    let filtered = ingredients;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => {
        const name = getTranslated(i.name).toLowerCase();
        return name.includes(query);
      });
    }

    return filtered.slice(0, 30); // Limit to 30
  }, [ingredients, selectedCategory, searchQuery, getTranslated]);

  const selectedIngredientData = selectedIngredient
    ? ingredients.find(i => i.id === selectedIngredient)
    : null;

  const nutritionPreview = selectedIngredientData
    ? estimateIngredientNutrition(selectedIngredientData, quantity, unit)
    : null;

  const commonUnits = ['g', 'kg', 'lb', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];

  const handleLogIngredient = () => {
    if (!selectedIngredientData || !nutritionPreview) return;

    logEntry({
      date,
      time: getCurrentTime(),
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      ingredientId: selectedIngredient!,
      quantity,
      unit,
      nutrition: nutritionPreview,
    });

    onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('common.filter')} by Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? t('common.all') : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Ingredient List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('nav.ingredients')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
          {filteredIngredients.map((ingredient) => {
            const isSelected = selectedIngredient === ingredient.id;

            return (
              <button
                key={ingredient.id}
                onClick={() => setSelectedIngredient(ingredient.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {getTranslated(ingredient.name)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {ingredient.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection Details */}
      {selectedIngredientData && nutritionPreview && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tracking.quantity')}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0.1"
                step="0.1"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tracking.unit')}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                {commonUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nutrition Preview */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nutrition Estimate
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Calories</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {nutritionPreview.calories}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">{t('goals.protein')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {Math.round(nutritionPreview.protein)}g
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">{t('goals.carbs')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {Math.round(nutritionPreview.carbs)}g
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">{t('goals.fat')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {Math.round(nutritionPreview.fat)}g
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              * Estimates based on USDA database averages
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleLogIngredient}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {t('tracking.logMeal')}
          </button>
        </div>
      )}
    </div>
  );
}
