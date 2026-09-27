import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@contexts/LanguageContext';
import { useBeverages } from '@contexts/BeverageContext';
import { useTracking } from '@contexts/TrackingContext';
import { calculateBeverageNutrition } from '@utils/nutritionCalculator';
import { getCurrentTime } from '@utils/dateUtils';
import { Search, Droplet, AlertTriangle } from 'lucide-react';

interface BeverageTabProps {
  date: string;
  onSuccess: () => void;
}

export default function BeverageTab({ date, onSuccess }: BeverageTabProps) {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const { beverages } = useBeverages();
  const { logEntry } = useTracking();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBeverage, setSelectedBeverage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(250);
  const [unit, setUnit] = useState('ml');

  // Categories
  const categories = ['all', 'water', 'coffee', 'tea', 'juice', 'soda', 'alcohol', 'milk', 'other'];

  // Filter beverages
  const filteredBeverages = useMemo(() => {
    let filtered = beverages;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(b => b.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => {
        const name = getTranslated(b.name).toLowerCase();
        return name.includes(query);
      });
    }

    return filtered.slice(0, 30); // Limit to 30
  }, [beverages, selectedCategory, searchQuery, getTranslated]);

  const selectedBeverageData = selectedBeverage
    ? beverages.find(b => b.id === selectedBeverage)
    : null;

  const nutritionPreview = selectedBeverageData
    ? calculateBeverageNutrition(selectedBeverageData, quantity, unit)
    : null;

  const commonUnits = ['ml', 'oz', 'cup', 'L', 'glass', 'bottle', 'can'];

  const handleQuickWater = () => {
    const waterBeverage = beverages.find(b => b.id === 'bev_water');
    if (!waterBeverage) return;

    const nutrition = calculateBeverageNutrition(waterBeverage, 250, 'ml');

    logEntry({
      date,
      time: getCurrentTime(),
      mealType: 'beverage',
      beverageId: 'bev_water',
      quantity: 250,
      unit: 'ml',
      nutrition,
    });

    onSuccess();
  };

  const handleLogBeverage = () => {
    if (!selectedBeverageData || !nutritionPreview) return;

    logEntry({
      date,
      time: getCurrentTime(),
      mealType: 'beverage',
      beverageId: selectedBeverage!,
      quantity,
      unit,
      nutrition: nutritionPreview,
    });

    onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Quick Water Button */}
      <button
        onClick={handleQuickWater}
        className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 font-medium"
      >
        <Droplet className="h-5 w-5" />
        {t('tracking.quickLogWater')} (250ml)
      </button>

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

      {/* Beverage List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('tracking.beverage')}s
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
          {filteredBeverages.map((beverage) => {
            const isSelected = selectedBeverage === beverage.id;

            return (
              <button
                key={beverage.id}
                onClick={() => {
                  setSelectedBeverage(beverage.id);
                  setQuantity(beverage.defaultQuantity);
                  setUnit(beverage.defaultUnit);
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {getTranslated(beverage.name)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                  {beverage.category}
                  {beverage.isAlcoholic && <span className="text-orange-500">🍺</span>}
                  {beverage.caffeine && beverage.caffeine > 0 && <span className="text-amber-500">☕</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection Details */}
      {selectedBeverageData && nutritionPreview && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          {/* Warnings */}
          {(selectedBeverageData.isAlcoholic || (selectedBeverageData.caffeine && selectedBeverageData.caffeine > 0)) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                {selectedBeverageData.isAlcoholic && (
                  <div>Contains alcohol. Drink responsibly.</div>
                )}
                {selectedBeverageData.caffeine && selectedBeverageData.caffeine > 0 && (
                  <div>Contains {selectedBeverageData.caffeine}mg caffeine per {selectedBeverageData.defaultQuantity}{selectedBeverageData.defaultUnit}.</div>
                )}
              </div>
            </div>
          )}

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
              Nutrition Preview
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
            {nutritionPreview.sugar && nutritionPreview.sugar > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Contains {Math.round(nutritionPreview.sugar)}g sugar
              </div>
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={handleLogBeverage}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {t('tracking.logMeal')}
          </button>
        </div>
      )}
    </div>
  );
}
