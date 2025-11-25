import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIngredients } from '@contexts/IngredientContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { IngredientDetail } from '@components/ingredient';
import { Card, Badge } from '@components/common';
import { ArrowLeft, ChefHat, ExternalLink } from 'lucide-react';

const IngredientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getIngredientById, loading } = useIngredients();
  const { recipes } = useRecipes();
  const { getTranslated } = useLanguage();

  const ingredient = id ? getIngredientById(id) : undefined;

  // Find recipes that use this ingredient
  const recipesUsingIngredient = React.useMemo(() => {
    if (!id) return [];
    return recipes.filter(recipe =>
      recipe.ingredients.some(ing => ing.ingredientId === id)
    );
  }, [id, recipes]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('ingredient.notFound')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('ingredient.notFoundDescription')}
          </p>
          <Link
            to="/ingredients"
            className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('ingredient.backToIngredients')}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </button>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredient Detail - Main Column */}
        <div className="lg:col-span-2">
          <IngredientDetail ingredient={ingredient} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Used in Recipes */}
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('ingredient.usedInRecipes')}
              </h2>
            </div>

            {recipesUsingIngredient.length > 0 ? (
              <div className="space-y-3">
                {recipesUsingIngredient.slice(0, 5).map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {getTranslated(recipe.name)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {recipe.totalTime} {t('common.minutesAbbr')} • {t(`recipe.difficulty_${recipe.difficulty}`)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}

                {recipesUsingIngredient.length > 5 && (
                  <Link
                    to={`/recipes?ingredient=${id}`}
                    className="block text-center text-sm text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
                  >
                    {t('ingredient.viewAllRecipes')} ({recipesUsingIngredient.length})
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('ingredient.noRecipesUsing')}
              </p>
            )}
          </Card>

          {/* Quick Info Card */}
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('ingredient.quickInfo')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('ingredient.region')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">{ingredient.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('ingredient.avgPrice')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {ingredient.currency === 'USD' ? '$' : ingredient.currency}
                  {ingredient.avgPrice.toFixed(2)}/{t(`units.${ingredient.unit}`, ingredient.unit)}
                </span>
              </div>
              {ingredient.yield && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('ingredient.yield')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {ingredient.yield.quantity} {t(`units.${ingredient.yield.unit}`, ingredient.yield.unit)}
                  </span>
                </div>
              )}
              {ingredient.isComposite && ingredient.components && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('ingredient.components')}:</span>
                  <Badge variant="info" size="sm">
                    {ingredient.components.length}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IngredientDetailPage;
