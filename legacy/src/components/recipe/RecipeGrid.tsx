import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '@/types';
import { RecipeCard } from './RecipeCard';
import { EmptyState, NoResultsState } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeGridProps {
  recipes: Recipe[];
  isLoading?: boolean;
  showNutrition?: boolean;
  className?: string;
  emptyMessage?: string;
  onRecipeClick?: (recipe: Recipe) => void;
}

export const RecipeGrid: React.FC<RecipeGridProps> = ({
  recipes,
  isLoading = false,
  showNutrition = false,
  className,
  emptyMessage,
  onRecipeClick,
}) => {
  const navigate = useNavigate();

  const handleRecipeClick = (recipe: Recipe) => {
    if (onRecipeClick) {
      onRecipeClick(recipe);
    } else {
      navigate(`/recipes/${recipe.id}`);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return emptyMessage ? (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        }
        title="No recipes found"
        description={emptyMessage}
      />
    ) : (
      <NoResultsState />
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
        className
      )}
    >
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={() => handleRecipeClick(recipe)}
          showNutrition={showNutrition}
        />
      ))}
    </div>
  );
};

RecipeGrid.displayName = 'RecipeGrid';

// Skeleton for loading state
const RecipeCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
};
