import { useParams, Link } from 'react-router-dom';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Clock, Users, ChefHat, ArrowLeft } from 'lucide-react';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const { getTranslated } = useLanguage();
  const { t } = useTranslation();

  const recipe = getRecipeById(id || '');

  if (!recipe) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Recipe Not Found
          </h1>
          <Link to="/recipes" className="btn-primary">
            Back to Recipes
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
        <span>Back to Recipes</span>
      </Link>

      {/* Recipe Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {getTranslated(recipe.name)}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {getTranslated(recipe.description)}
        </p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary-500" />
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('recipe.totalTime')}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {recipe.totalTime} {t('common.minutes')}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary-500" />
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('recipe.servings')}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {recipe.servings}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ChefHat className="h-5 w-5 text-primary-500" />
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('recipe.difficulty')}
            </div>
            <div className="font-semibold text-gray-900 dark:text-white capitalize">
              {recipe.difficulty}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('recipe.ingredients')}
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <span className="text-primary-500 mt-1">•</span>
                  <span>
                    {ing.quantity} {ing.unit} {ing.ingredientId}
                    {ing.preparation && ` (${ing.preparation})`}
                  </span>
                </li>
              ))}
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
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold">
                  {instruction.step}
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300">
                    {getTranslated(instruction.text)}
                  </p>
                  {instruction.time && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      ~{instruction.time} {t('common.minutes')}
                    </p>
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
                  <div className="text-sm text-gray-600 dark:text-gray-400">Calories</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.calories}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Protein</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.protein}g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Carbs</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.carbs}g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Fat</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {recipe.nutrition.fat}g
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
