import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@contexts/LanguageContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useTracking } from '@contexts/TrackingContext';
import { usePlanner } from '@contexts/PlannerContext';
import { calculateRecipeNutrition } from '@utils/nutritionCalculator';
import { getCurrentTime } from '@utils/dateUtils';
import { Search, Heart, Clock, Plus } from 'lucide-react';

interface RecipeTabProps {
  mealType: string;
  date: string;
  onSuccess: () => void;
}

export default function RecipeTab({ mealType, date, onSuccess }: RecipeTabProps) {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const { recipes, favoriteRecipes } = useRecipes();
  const { logEntry } = useTracking();
  const { currentPlan } = usePlanner();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [servings, setServings] = useState(2);

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show favorites first when no search
      const favs = recipes.filter(r => favoriteRecipes.includes(r.id));
      const others = recipes.filter(r => !favoriteRecipes.includes(r.id));
      return [...favs, ...others].slice(0, 20); // Limit to 20
    }

    const query = searchQuery.toLowerCase();
    return recipes
      .filter(r => {
        const name = getTranslated(r.name).toLowerCase();
        const description = getTranslated(r.description).toLowerCase();
        return name.includes(query) || description.includes(query);
      })
      .slice(0, 20);
  }, [recipes, searchQuery, favoriteRecipes, getTranslated]);

  // Get today's meals from planner
  const todaysMeals = useMemo(() => {
    if (!currentPlan) return [];

    const today = new Date();
    const dayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to Mon=0
    const day = currentPlan.days[dayIndex];

    if (!day) return [];

    const meals: Array<{ recipeId: string; mealType: string; servings: number }> = [];

    if (day.meals.breakfast) {
      meals.push({ ...day.meals.breakfast, mealType: 'breakfast' });
    }
    if (day.meals.lunch) {
      meals.push({ ...day.meals.lunch, mealType: 'lunch' });
    }
    if (day.meals.dinner) {
      meals.push({ ...day.meals.dinner, mealType: 'dinner' });
    }
    if (day.meals.snacks) {
      day.meals.snacks.forEach(snack => {
        meals.push({ ...snack, mealType: 'snack' });
      });
    }

    return meals;
  }, [currentPlan]);

  const handleLogRecipe = (recipeId: string, recipeServings: number) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const nutrition = calculateRecipeNutrition(recipe, recipeServings);

    logEntry({
      date,
      time: getCurrentTime(),
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      recipeId,
      quantity: recipeServings,
      unit: 'servings',
      servings: recipeServings,
      nutrition,
    });

    onSuccess();
  };

  const handleQuickLog = (recipeId: string, recipeServings: number) => {
    handleLogRecipe(recipeId, recipeServings);
  };

  const selectedRecipeData = selectedRecipe ? recipes.find(r => r.id === selectedRecipe) : null;
  const nutritionPreview = selectedRecipeData
    ? calculateRecipeNutrition(selectedRecipeData, servings)
    : null;

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

      {/* From Meal Plan Section */}
      {todaysMeals.length > 0 && !searchQuery && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('tracking.logFromPlan')}
          </h3>
          <div className="space-y-2">
            {todaysMeals.map((meal, index) => {
              const recipe = recipes.find(r => r.id === meal.recipeId);
              if (!recipe) return null;

              return (
                <div
                  key={`${meal.recipeId}-${index}`}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getTranslated(recipe.name)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {meal.servings} {t('common.servings')} • {recipe.nutrition.calories * meal.servings} cal
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickLog(meal.recipeId, meal.servings)}
                    className="px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {t('common.add')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipe List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {searchQuery ? t('common.search') + ' ' + t('nav.recipes') : t('nav.recipes')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
          {filteredRecipes.map((recipe) => {
            const isFavorite = favoriteRecipes.includes(recipe.id);
            const isSelected = selectedRecipe === recipe.id;

            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {getTranslated(recipe.name)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {recipe.totalTime} {t('common.minutesAbbr')}
                      <span>•</span>
                      {recipe.nutrition.calories} {t('common.caloriesAbbr')}
                    </div>
                  </div>
                  {isFavorite && (
                    <Heart className="h-4 w-4 text-red-500 fill-current ml-2 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection Details */}
      {selectedRecipeData && nutritionPreview && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('common.servings')}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                -
              </button>
              <span className="text-lg font-medium text-gray-900 dark:text-white">{servings}</span>
              <button
                onClick={() => setServings(servings + 1)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                +
              </button>
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
          </div>

          {/* Add Button */}
          <button
            onClick={() => handleLogRecipe(selectedRecipe!, servings)}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {t('tracking.logMeal')}
          </button>
        </div>
      )}
    </div>
  );
}
