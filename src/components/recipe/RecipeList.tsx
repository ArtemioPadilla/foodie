import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Recipe } from '@/types';
import { Badge, EmptyState } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeListProps {
  recipes: Recipe[];
  isLoading?: boolean;
  className?: string;
  onRecipeClick?: (recipe: Recipe) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  isLoading = false,
  className,
  onRecipeClick,
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'es' | 'fr';

  const handleRecipeClick = (recipe: Recipe) => {
    if (onRecipeClick) {
      onRecipeClick(recipe);
    } else {
      navigate(`/recipes/${recipe.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <RecipeListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
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
        description="Try adjusting your filters or search criteria"
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {recipes.map((recipe) => {
        const name = recipe.name[currentLang] || recipe.name.en;
        const description = recipe.description[currentLang] || recipe.description.en;

        return (
          <div
            key={recipe.id}
            onClick={() => handleRecipeClick(recipe)}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
              <img
                src={
                  recipe.imageUrl ||
                  `https://via.placeholder.com/80/10b981/ffffff?text=${encodeURIComponent(
                    name.charAt(0)
                  )}`
                }
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                    {description}
                  </p>
                </div>

                {/* Rating */}
                {recipe.rating && (
                  <div className="flex items-center gap-1 text-sm shrink-0">
                    <svg
                      className="w-4 h-4 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {recipe.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{recipe.totalTime} min</span>
                </div>

                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>{recipe.servings} servings</span>
                </div>

                <Badge
                  variant={
                    recipe.difficulty === 'easy'
                      ? 'success'
                      : recipe.difficulty === 'medium'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {recipe.difficulty}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

RecipeList.displayName = 'RecipeList';

// Skeleton for loading state
const RecipeListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />
        </div>
      </div>
    </div>
  );
};
