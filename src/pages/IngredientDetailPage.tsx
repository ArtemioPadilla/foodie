import { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIngredients } from '@contexts/IngredientContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { Card, Badge } from '@components/common';
import {
  ArrowLeft,
  Layers,
  Leaf,
  Wheat,
  Milk,
  Nut,
  MapPin,
  Clock,
  DollarSign,
  RefreshCw,
  ChefHat,
  Calendar,
  Info,
  Users,
  Star,
} from 'lucide-react';

export default function IngredientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loading: ingredientsLoading, getIngredientById } = useIngredients();
  const { recipes, loading: recipesLoading, initializeRecipes } = useRecipes();
  const { getTranslated } = useLanguage();

  // Initialize recipes when page loads
  useEffect(() => {
    initializeRecipes();
  }, [initializeRecipes]);

  const ingredient = useMemo(() => {
    if (!id) return null;
    return getIngredientById(id);
  }, [id, getIngredientById]);

  // Find recipes that use this ingredient
  const recipesUsingIngredient = useMemo(() => {
    if (!ingredient || !recipes.length) return [];
    return recipes.filter((recipe) =>
      recipe.ingredients.some((ing) => ing.ingredientId === ingredient.id)
    ).slice(0, 6);
  }, [ingredient, recipes]);

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
        <Card className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('ingredient.notFound', 'Ingredient Not Found')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('ingredient.notFoundDescription', 'The ingredient you are looking for does not exist.')}
          </p>
          <Link
            to="/ingredients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('ingredient.backToIngredients', 'Back to Ingredients')}
          </Link>
        </Card>
      </div>
    );
  }

  const name = getTranslated(ingredient.name);
  const description = ingredient.description ? getTranslated(ingredient.description) : null;
  const storageInstructions = getTranslated(ingredient.storageInstructions);
  const preparationNotes = ingredient.preparationNotes ? getTranslated(ingredient.preparationNotes) : null;

  return (
    <div className="container-custom py-12">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back', 'Back')}
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image or Placeholder */}
              <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 flex-shrink-0">
                {ingredient.imageUrl ? (
                  <img
                    src={ingredient.imageUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">
                      {ingredient.category === 'protein' && '🍖'}
                      {ingredient.category === 'vegetables' && '🥬'}
                      {ingredient.category === 'fruits' && '🍎'}
                      {ingredient.category === 'grains' && '🌾'}
                      {ingredient.category === 'dairy' && '🧀'}
                      {ingredient.category === 'pantry' && '🫙'}
                      {ingredient.category === 'spices' && '🌿'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="default">
                    {t(`category.${ingredient.category}`, ingredient.category)}
                  </Badge>
                  {ingredient.isComposite && (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {t('ingredient.composite', 'Composite')}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {name}
                </h1>

                {description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {description}
                  </p>
                )}

                {/* Dietary Tags */}
                <div className="flex flex-wrap gap-2">
                  {ingredient.tags.vegan && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                      <Leaf className="w-4 h-4" />
                      {t('dietary.vegan', 'Vegan')}
                    </span>
                  )}
                  {ingredient.tags.vegetarian && !ingredient.tags.vegan && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                      {t('dietary.vegetarian', 'Vegetarian')}
                    </span>
                  )}
                  {ingredient.tags.glutenFree && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
                      <Wheat className="w-4 h-4" />
                      {t('dietary.glutenFree', 'Gluten Free')}
                    </span>
                  )}
                  {ingredient.tags.dairyFree && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      <Milk className="w-4 h-4" />
                      {t('dietary.dairyFree', 'Dairy Free')}
                    </span>
                  )}
                  {ingredient.tags.nutFree && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full">
                      <Nut className="w-4 h-4" />
                      {t('dietary.nutFree', 'Nut Free')}
                    </span>
                  )}
                  {ingredient.tags.kosher && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                      {t('dietary.kosher', 'Kosher')}
                    </span>
                  )}
                  {ingredient.tags.halal && (
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full">
                      {t('dietary.halal', 'Halal')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Components Section (for composite ingredients) */}
          {ingredient.isComposite && ingredient.components && ingredient.components.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-500" />
                {t('ingredient.components', 'Components')}
              </h2>

              <div className="space-y-3">
                {ingredient.components.map((component, index) => {
                  const componentIngredient = getIngredientById(component.ingredientId);
                  const componentName = componentIngredient
                    ? getTranslated(componentIngredient.name)
                    : component.ingredientId;
                  const componentNotes = component.notes ? getTranslated(component.notes) : null;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">
                            {componentIngredient?.category === 'protein' && '🍖'}
                            {componentIngredient?.category === 'vegetables' && '🥬'}
                            {componentIngredient?.category === 'fruits' && '🍎'}
                            {componentIngredient?.category === 'grains' && '🌾'}
                            {componentIngredient?.category === 'dairy' && '🧀'}
                            {componentIngredient?.category === 'pantry' && '🫙'}
                            {componentIngredient?.category === 'spices' && '🌿'}
                            {!componentIngredient && '🥄'}
                          </span>
                        </div>
                        <div>
                          {componentIngredient ? (
                            <Link
                              to={`/ingredients/${component.ingredientId}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                            >
                              {componentName}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {componentName}
                            </span>
                          )}
                          {componentNotes && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {componentNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {component.quantity} {t(`units.${component.unit}`, component.unit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preparation Notes */}
              {preparationNotes && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t('ingredient.preparation', 'Preparation')}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {preparationNotes}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Recipes Using This Ingredient */}
          {recipesUsingIngredient.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary-500" />
                {t('ingredient.usedInRecipes', 'Used in Recipes')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {recipesUsingIngredient.map((recipe) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={getTranslated(recipe.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {getTranslated(recipe.name)}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {recipe.totalTime} {t('common.minutesAbbr', 'min')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {recipe.servings}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {recipe.rating}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {recipesUsingIngredient.length >= 6 && (
                <div className="mt-4 text-center">
                  <Link
                    to={`/recipes?ingredient=${ingredient.id}`}
                    className="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {t('ingredient.viewAllRecipes', 'View all recipes using this ingredient')}
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Info Card */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('ingredient.quickInfo', 'Quick Info')}
            </h2>

            <div className="space-y-4">
              {/* Region */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('ingredient.region', 'Region')}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ingredient.region}
                  </p>
                </div>
              </div>

              {/* Average Price */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('ingredient.avgPrice', 'Average Price')}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ingredient.currency} {ingredient.avgPrice.toFixed(2)} / {t(`units.${ingredient.unit}`, ingredient.unit)}
                  </p>
                </div>
              </div>

              {/* Seasonality */}
              {ingredient.seasonality && ingredient.seasonality.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('ingredient.seasonality', 'Seasonality')}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ingredient.seasonality.map(s => t(`season.${s}`, s)).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Storage Instructions */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              {t('ingredient.storage', 'Storage')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {storageInstructions}
            </p>
          </Card>

          {/* Alternatives */}
          {ingredient.alternatives && ingredient.alternatives.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary-500" />
                {t('ingredient.alternatives', 'Alternatives')}
              </h2>
              <ul className="space-y-2">
                {ingredient.alternatives.map((alt, index) => (
                  <li key={index} className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                    {alt}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
