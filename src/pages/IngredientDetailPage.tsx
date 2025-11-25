import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIngredients } from '@contexts/IngredientContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { IngredientDetail } from '@components/ingredient';
import { Card } from '@components/common';
import { ArrowLeft, ChefHat, Clock, Users, Star } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export default function IngredientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading: ingredientsLoading, getIngredientById } = useIngredients();
  const { recipes, loading: recipesLoading, initializeRecipes } = useRecipes();
  const { getTranslated } = useLanguage();

  // Initialize recipes when page loads
  useEffect(() => {
    initializeRecipes();
  }, [initializeRecipes]);

  const ingredient = id ? getIngredientById(id) : undefined;

  // Find recipes that use this ingredient
  const recipesUsingIngredient = useMemo(() => {
    if (!id || !recipes.length) return [];
    
    return recipes.filter(recipe => 
      recipe.ingredients.some(ing => ing.ingredientId === id)
    ).slice(0, 6); // Limit to 6 recipes
  }, [id, recipes]);

  const loading = ingredientsLoading || recipesLoading;

  if (loading) {
    return (
      <div className="container-custom py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="container-custom py-12">
        <Card padding="lg" className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('ingredient.notFound', 'Ingredient Not Found')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('ingredient.notFoundDescription', 'The ingredient you are looking for does not exist.')}
          </p>
          <Link 
            to="/ingredients" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('ingredient.backToIngredients', 'Back to Ingredients')}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back', 'Back')}
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <IngredientDetail ingredient={ingredient} />
        </div>

        {/* Sidebar - Recipes using this ingredient */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('ingredient.usedInRecipes', 'Used in Recipes')}
                </h2>
              </div>

              {recipesUsingIngredient.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t('ingredient.noRecipesUsing', 'No recipes currently use this ingredient.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {recipesUsingIngredient.map((recipe) => (
                    <Link
                      key={recipe.id}
                      to={`/recipes/${recipe.id}`}
                      className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Recipe Image */}
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={getTranslated(recipe.name)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              🍽️
                            </div>
                          )}
                        </div>

                        {/* Recipe Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {getTranslated(recipe.name)}
                          </h3>
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
                      </div>
                    </Link>
                  ))}

                  {recipes.filter(r => r.ingredients.some(ing => ing.ingredientId === id)).length > 6 && (
                    <Link
                      to={`/recipes?ingredient=${id}`}
                      className="block text-center text-sm text-emerald-600 dark:text-emerald-400 hover:underline mt-4"
                    >
                      {t('ingredient.viewAllRecipes', 'View all recipes →')}
                    </Link>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
