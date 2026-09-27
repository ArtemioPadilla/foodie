import { useEffect, useState } from 'react';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, Users, Star, Filter, X } from 'lucide-react';
import { RecipeFilters } from '@components/recipe/RecipeFilters';
import { RecipeSorter } from '@components/recipe/RecipeSorter';
import { Button, Badge } from '@components/common';

export default function RecipesPage() {
  const { filteredRecipes, loading, initializeRecipes, searchRecipes, filters, sortBy, setFilters, setSortBy } = useRecipes();
  const { getTranslated } = useLanguage();
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  // Initialize recipes when page loads
  useEffect(() => {
    initializeRecipes();
  }, [initializeRecipes]);

  // Calculate active filter count
  const activeFilterCount =
    (filters.types?.length || 0) +
    (filters.cuisines?.length || 0) +
    (filters.difficulties?.length || 0) +
    (filters.dietaryLabels?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.maxTime ? 1 : 0);

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

        {/* Search and Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
          {/* Search */}
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder={t('recipe.search')}
              onChange={e => searchRecipes(e.target.value)}
              className="input w-full"
              data-testid="recipe-search"
            />
          </div>

          {/* Sort Dropdown */}
          <RecipeSorter
            value={sortBy}
            onChange={setSortBy}
            className="w-full sm:w-auto"
            data-testid="recipe-sorter"
          />

          {/* Filter Toggle (Mobile) */}
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden w-full flex items-center justify-center gap-2"
            data-testid="filter-toggle"
          >
            <Filter className="h-4 w-4" />
            {t('recipe.filters')}
            {activeFilterCount > 0 && (
              <Badge variant="info" size="sm">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar (Desktop) / Drawer (Mobile) */}
        <aside
          className={`
            lg:w-80 lg:flex-shrink-0 lg:block
            ${showFilters ? 'block' : 'hidden'}
            lg:sticky lg:top-24 lg:self-start
          `}
        >
          <div className="card p-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('recipe.filters')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <RecipeFilters
              filters={filters}
              onChange={setFilters}
              data-testid="recipe-filters"
            />
          </div>
        </aside>

        {/* Recipe Grid */}
        <div className="flex-1 min-w-0">
          {/* Desktop Filter Toggle */}
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden lg:flex items-center gap-2 mb-4"
            data-testid="filter-toggle-desktop"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? t('common.hideFilters', 'Hide Filters') : t('common.showFilters', 'Show Filters')}
            {activeFilterCount > 0 && (
              <Badge variant="info" size="sm">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            {t('recipe.resultsCount', { count: filteredRecipes.length })}
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700 dark:text-gray-300 text-lg">
                {t('recipe.noRecipes')}
              </p>
            </div>
          ) : (
            <>
              <h2 className="sr-only">{t('recipe.availableRecipes', 'Available Recipes')}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map(recipe => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="card overflow-hidden hover:shadow-card-hover transition-shadow"
                    data-testid="recipe-card"
                  >
                    {/* Recipe Image */}
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={getTranslated(recipe.name)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-700 dark:text-gray-500 text-4xl">🍽️</span>
                      )}
                    </div>

                    {/* Recipe Info */}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {getTranslated(recipe.name)}
                      </h3>

                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                        {getTranslated(recipe.description)}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
