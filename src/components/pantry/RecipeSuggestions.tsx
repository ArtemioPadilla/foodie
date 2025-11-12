import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePantry } from '@contexts/PantryContext';
import { useRecipes } from '@contexts/RecipeContext';
import { Recipe } from '@/types';
import { Card, Badge, EmptyState } from '@components/common';
import { RecipeCard } from '@components/recipe';
import { cn } from '@utils/cn';

export interface RecipeSuggestionsProps {
  minMatchPercentage?: number;
  maxResults?: number;
  className?: string;
  onRecipeClick?: (recipeId: string) => void;
}

interface RecipeMatch {
  recipe: Recipe;
  matchPercentage: number;
  matchedIngredients: number;
  totalIngredients: number;
  missingIngredients: string[];
}

/**
 * Suggests recipes based on available pantry items
 */
export const RecipeSuggestions: React.FC<RecipeSuggestionsProps> = ({
  minMatchPercentage = 50,
  maxResults = 6,
  className,
  onRecipeClick,
}) => {
  const { t } = useTranslation();
  const { pantryItems } = usePantry();
  const { recipes } = useRecipes();

  const suggestedRecipes = useMemo(() => {
    if (pantryItems.length === 0) return [];

    // Get set of pantry ingredient IDs (normalized)
    const pantryIngredientIds = new Set(
      pantryItems.map((item) => item.ingredientId.toLowerCase().trim())
    );

    const matches: RecipeMatch[] = [];

    recipes.forEach((recipe) => {
      let matchedCount = 0;
      const missing: string[] = [];

      recipe.ingredients.forEach((ingredient) => {
        const normalizedId = ingredient.ingredientId.toLowerCase().trim();

        if (pantryIngredientIds.has(normalizedId)) {
          matchedCount++;
        } else if (!ingredient.optional) {
          missing.push(ingredient.ingredientId);
        }
      });

      // Calculate match percentage (excluding optional ingredients)
      const requiredIngredients = recipe.ingredients.filter((i) => !i.optional).length;
      const matchPercentage =
        requiredIngredients > 0 ? (matchedCount / requiredIngredients) * 100 : 0;

      if (matchPercentage >= minMatchPercentage) {
        matches.push({
          recipe,
          matchPercentage,
          matchedIngredients: matchedCount,
          totalIngredients: requiredIngredients,
          missingIngredients: missing,
        });
      }
    });

    // Sort by match percentage (highest first)
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return matches.slice(0, maxResults);
  }, [pantryItems, recipes, minMatchPercentage, maxResults]);

  if (pantryItems.length === 0) {
    return (
      <Card className={cn('', className)}>
        <EmptyState
          title={t('pantry.noPantryItems', 'No Pantry Items')}
          description={t(
            'pantry.addItemsForSuggestions',
            'Add items to your pantry to get recipe suggestions'
          )}
        />
      </Card>
    );
  }

  if (suggestedRecipes.length === 0) {
    return (
      <Card className={cn('', className)}>
        <EmptyState
          title={t('pantry.noMatches', 'No Matches Found')}
          description={t(
            'pantry.noMatchesDescription',
            'Try adding more ingredients to your pantry or lower the match threshold'
          )}
        />
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('pantry.recipeSuggestions', 'Recipe Suggestions')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'pantry.basedOnPantry',
              'Based on {count} items in your pantry',
              { count: pantryItems.length }
            )}
          </p>
        </div>

        {/* Recipe Matches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestedRecipes.map(({ recipe, matchPercentage, matchedIngredients, totalIngredients, missingIngredients }) => (
            <div key={recipe.id} className="relative">
              {/* Match Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge
                  variant={
                    matchPercentage >= 90
                      ? 'success'
                      : matchPercentage >= 70
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  {Math.round(matchPercentage)}% {t('common.match', 'match')}
                </Badge>
              </div>

              <RecipeCard
                recipe={recipe}
                onClick={() => onRecipeClick?.(recipe.id)}
              />

              {/* Match Details */}
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('pantry.haveIngredients', 'You have')}:
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {matchedIngredients}/{totalIngredients}
                  </span>
                </div>

                {missingIngredients.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('pantry.missing', 'Missing')}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {missingIngredients.slice(0, 3).map((ing, idx) => (
                        <Badge key={idx} variant="default" size="sm">
                          {ing}
                        </Badge>
                      ))}
                      {missingIngredients.length > 3 && (
                        <Badge variant="default" size="sm">
                          +{missingIngredients.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t(
                'pantry.suggestionsTip',
                'Recipes are sorted by best match. Consider using expiring ingredients first!'
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

RecipeSuggestions.displayName = 'RecipeSuggestions';
