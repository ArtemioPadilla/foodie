import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useIngredients } from '@contexts/IngredientContext';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, ArrowLeft, Heart, Timer, DollarSign } from 'lucide-react';
import { RecipeScaler } from '@components/recipe/RecipeScaler';
import { RecipeTimer } from '@components/recipe/RecipeTimer';
import { Button } from '@components/common';
import { PriceManagementModal } from '@components/common/PriceManagementModal';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getRecipeById, loading, initialized, initializeRecipes, favoriteRecipes, toggleFavorite } = useRecipes();
  const { getTranslated } = useLanguage();
  const { getIngredientName } = useIngredients();
  const { t } = useTranslation();
  const [currentServings, setCurrentServings] = useState<number | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [activeTimerDuration, setActiveTimerDuration] = useState(0);
  const [activeTimerStep, setActiveTimerStep] = useState('');
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  // Initialize recipes when page loads
  useEffect(() => {
    initializeRecipes();
  }, [initializeRecipes]);

  const recipe = getRecipeById(id || '');

  // Initialize servings when recipe loads
  useEffect(() => {
    if (recipe && currentServings === null) {
      setCurrentServings(recipe.servings);
    }
  }, [recipe, currentServings]);

  // Show loading while initializing
  if (loading || !initialized) {
    return (
      <div className="container-custom py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('recipe.notFound')}
          </h1>
          <Link to="/recipes" className="btn-primary">
            {t('recipe.backToRecipes')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Back Button */}
      <Link
        to="/recipes"
        className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('recipe.backToRecipes')}</span>
      </Link>

      {/* Recipe Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {getTranslated(recipe.name)}
          </h1>
          <Button
            variant={favoriteRecipes.includes(recipe.id) ? 'primary' : 'secondary'}
            size="md"
            onClick={() => toggleFavorite(recipe.id)}
            className="flex-shrink-0"
            aria-label={favoriteRecipes.includes(recipe.id) ? t('recipe.removeFromFavorites', 'Remove from favorites') : t('recipe.addToFavorites')}
            data-testid="favorite-button"
          >
            <Heart
              className={`h-5 w-5 ${favoriteRecipes.includes(recipe.id) ? 'fill-current' : ''}`}
            />
            <span className="ml-2 hidden sm:inline">
              {favoriteRecipes.includes(recipe.id) ? t('recipe.favorited', 'Favorited') : t('recipe.addToFavorites')}
            </span>
          </Button>
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          {getTranslated(recipe.description)}
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary-500" />
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t('recipe.totalTime')}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {recipe.totalTime} {t('common.minutes')}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ChefHat className="h-5 w-5 text-primary-500" />
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {t('recipe.difficulty')}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white capitalize">
              {recipe.difficulty}
            </div>
          </div>
        </div>

        {/* Recipe Scaler */}
        <div className="sm:ml-auto">
          {currentServings !== null && (
            <RecipeScaler
              servings={currentServings}
              originalServings={recipe.servings}
              onChange={setCurrentServings}
              data-testid="recipe-scaler"
            />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('recipe.ingredients')}
              </h2>
              {currentServings !== null && currentServings !== recipe.servings && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  {t('recipe.scaledForServings', { servings: currentServings })}
                </span>
              )}
            </div>

            {/* Price Management Button */}
            <div className="mb-4">
              <button
                onClick={() => setPriceModalOpen(true)}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                {t('ingredients.managePrices', 'Manage Prices')}
              </button>
            </div>
            <ul className="space-y-2" data-testid="ingredients-list">
              {recipe.ingredients.map((ing, index) => {
                const scaleFactor = currentServings !== null ? currentServings / recipe.servings : 1;
                const scaledQuantity = (ing.quantity * scaleFactor).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

                return (
                  <li
                    key={index}
                    className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-primary-500 mt-1">•</span>
                    <span>
                      {scaledQuantity} {t(`units.${ing.unit}`, ing.unit)} {getIngredientName(ing.ingredientId)}
                      {ing.preparation && ` (${ing.preparation})`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('recipe.instructions')}
          </h2>
          <div className="space-y-6">
            {recipe.instructions.map(instruction => (
              <div key={instruction.step} className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold">
                  {instruction.step}
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300">
                    {getTranslated(instruction.text)}
                  </p>
                  {instruction.time && (
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        ~{instruction.time} {t('common.minutes')}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveTimerDuration(instruction.time || 0);
                          setActiveTimerStep(`Step ${instruction.step}`);
                          setTimerOpen(true);
                        }}
                        className="flex items-center gap-1"
                        data-testid={`timer-button-step-${instruction.step}`}
                      >
                        <Timer className="h-4 w-4" />
                        <span className="text-xs">{t('recipe.startTimer', 'Start Timer')}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Nutrition */}
          {recipe.nutrition && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('recipe.nutrition')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t('nutrition.calories')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.calories}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t('nutrition.protein')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.protein}g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t('nutrition.carbs')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.carbs}g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{t('nutrition.fat')}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.fat}g
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Timer Modal */}
      <RecipeTimer
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
        duration={activeTimerDuration}
        stepName={activeTimerStep}
        data-testid="recipe-timer"
      />

      {/* Price Management Modal */}
      <PriceManagementModal
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
      />
    </div>
  );
}
