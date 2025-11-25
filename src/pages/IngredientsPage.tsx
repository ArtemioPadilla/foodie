import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useIngredients } from '@contexts/IngredientContext';
import { useRecipes } from '@contexts/RecipeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Search, X, ChefHat, Clock, Users, Star } from 'lucide-react';
import { cn } from '@utils/cn';
import { Recipe, Ingredient } from '@/types';

interface RecipeMatch {
  recipe: Recipe;
  matchPercentage: number;
  matchedIngredients: number;
  totalIngredients: number;
}

export default function IngredientsPage() {
  const { t } = useTranslation();
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const { recipes, loading: recipesLoading, initializeRecipes } = useRecipes();
  const { getTranslated } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  // Initialize recipes when page loads
  useEffect(() => {
    initializeRecipes();
  }, [initializeRecipes]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ingredients.map((ing) => ing.category));
    return Array.from(cats).sort();
  }, [ingredients]);

  // Filter ingredients by search and category
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const name = getTranslated(ing.name).toLowerCase();
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || ing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, searchQuery, selectedCategory, getTranslated]);

  // Group ingredients by category
  const ingredientsByCategory = useMemo(() => {
    const grouped: Record<string, Ingredient[]> = {};
    filteredIngredients.forEach((ing) => {
      if (!grouped[ing.category]) {
        grouped[ing.category] = [];
      }
      grouped[ing.category].push(ing);
    });
    return grouped;
  }, [filteredIngredients]);

  // Find recipes that match selected ingredients
  const matchingRecipes = useMemo(() => {
    if (selectedIngredients.size === 0) return [];

    const matches: RecipeMatch[] = [];

    recipes.forEach((recipe) => {
      let matchedCount = 0;
      const requiredIngredients = recipe.ingredients.filter((i) => !i.optional);

      requiredIngredients.forEach((ingredient) => {
        if (selectedIngredients.has(ingredient.ingredientId)) {
          matchedCount++;
        }
      });

      if (matchedCount > 0) {
        const matchPercentage = (matchedCount / requiredIngredients.length) * 100;
        matches.push({
          recipe,
          matchPercentage,
          matchedIngredients: matchedCount,
          totalIngredients: requiredIngredients.length,
        });
      }
    });

    // Sort by match percentage
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
    return matches.slice(0, 12);
  }, [selectedIngredients, recipes]);

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedIngredients(new Set());
  };

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

  return (
    <div className="container-custom py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('ingredients.title', 'Browse Ingredients')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {t('ingredients.description', 'Select ingredients to find recipes you can make')}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ingredients.search', 'Search ingredients...')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{t('ingredients.allCategories', 'All Categories')}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {t(`category.${cat}`, cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Ingredients Bar */}
      {selectedIngredients.size > 0 && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {t('ingredients.selected', 'Selected')} ({selectedIngredients.size}):
            </span>
            {Array.from(selectedIngredients).map((ingId) => {
              const ing = ingredients.find((i) => i.id === ingId);
              return (
                <span
                  key={ingId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full text-sm"
                >
                  {ing ? getTranslated(ing.name) : ingId}
                  <button
                    onClick={() => toggleIngredient(ingId)}
                    className="hover:text-emerald-600 dark:hover:text-emerald-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={clearSelection}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline ml-2"
            >
              {t('ingredients.clearSelection', 'Clear all')}
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Ingredients Grid */}
        <div className="lg:col-span-2">
          {Object.keys(ingredientsByCategory).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700 dark:text-gray-300">
                {t('common.noResults', 'No results found')}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(ingredientsByCategory).map(([category, ings]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                    {t(`category.${category}`, category)}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {ings.map((ingredient) => {
                      const isSelected = selectedIngredients.has(ingredient.id);
                      return (
                        <button
                          key={ingredient.id}
                          onClick={() => toggleIngredient(ingredient.id)}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-all',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isSelected
                                ? 'text-emerald-800 dark:text-emerald-200'
                                : 'text-gray-900 dark:text-white'
                            )}
                          >
                            {getTranslated(ingredient.name)}
                          </span>
                          {/* Dietary Tags */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ingredient.tags.vegan && (
                              <span className="text-xs px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                V
                              </span>
                            )}
                            {ingredient.tags.glutenFree && (
                              <span className="text-xs px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                                GF
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matching Recipes Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {t('ingredients.recipesWithSelected', 'Recipes You Can Make')}
            </h2>

            {selectedIngredients.size === 0 ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {t('ingredients.selectToFindRecipes', 'Select ingredients to find recipes')}
                </p>
              </div>
            ) : matchingRecipes.length === 0 ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {t('ingredients.noMatchingRecipes', 'No recipes match your selection')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {matchingRecipes.map(({ recipe, matchPercentage, matchedIngredients, totalIngredients }) => (
                  <Link
                    key={recipe.id}
                    to={`/recipes/${recipe.id}`}
                    className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Recipe Image */}
                      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={getTranslated(recipe.name)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🍽️
                          </div>
                        )}
                      </div>

                      {/* Recipe Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {getTranslated(recipe.name)}
                        </h3>

                        {/* Match Badge */}
                        <div className="mt-1">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              matchPercentage >= 80
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : matchPercentage >= 50
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            )}
                          >
                            {matchedIngredients}/{totalIngredients} {t('ingredients.ingredientsMatch', 'ingredients')}
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
