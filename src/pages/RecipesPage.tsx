import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, Users, Star } from 'lucide-react';

export default function RecipesPage() {
  const { filteredRecipes, loading, searchRecipes } = useRecipes();
  const { getTranslated } = useLanguage();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="container-custom py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('recipe.title')}
        </h1>

        {/* Search */}
        <div className="max-w-2xl">
          <input
            type="text"
            placeholder={t('recipe.search')}
            onChange={e => searchRecipes(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t('recipe.noRecipes')}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipes/${recipe.id}`}
              className="card overflow-hidden hover:shadow-card-hover transition-shadow"
            >
              {/* Recipe Image */}
              <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={getTranslated(recipe.name)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 text-4xl">🍽️</span>
                )}
              </div>

              {/* Recipe Info */}
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {getTranslated(recipe.name)}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {getTranslated(recipe.description)}
                </p>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{recipe.totalTime} {t('common.minutes')}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{recipe.servings} {t('recipe.servings')}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-accent-500 fill-current" />
                    <span>{recipe.rating}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {recipe.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="badge badge-primary text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Difficulty */}
                <div className="mt-3">
                  <span className={`badge text-xs ${
                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {t(`recipe.difficulty_${recipe.difficulty}`)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
