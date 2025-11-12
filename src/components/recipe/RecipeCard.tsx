import React from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '@/types';
import { Card, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  className?: string;
  showNutrition?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onClick,
  className,
  showNutrition = false,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'es' | 'fr';

  const name = recipe.name[currentLang] || recipe.name.en;
  const description = recipe.description[currentLang] || recipe.description.en;

  // Placeholder image if none provided
  const imageUrl = recipe.imageUrl || `https://via.placeholder.com/400x300/10b981/ffffff?text=${encodeURIComponent(name)}`;

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={cn('overflow-hidden', className)}
      padding="none"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
          loading="lazy"
        />

        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
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

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
            {description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="default" size="sm">
              {tag}
            </Badge>
          ))}
          {recipe.tags.length > 3 && (
            <Badge variant="default" size="sm">
              +{recipe.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            {/* Time */}
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

            {/* Servings */}
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{recipe.servings}</span>
            </div>
          </div>

          {/* Rating */}
          {recipe.rating && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {recipe.rating.toFixed(1)}
              </span>
              {recipe.reviewCount && (
                <span className="text-xs">({recipe.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Nutrition (optional) */}
        {showNutrition && recipe.nutrition && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.nutrition.calories}
                </div>
                <div className="text-gray-600 dark:text-gray-400">cal</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.nutrition.protein}g
                </div>
                <div className="text-gray-600 dark:text-gray-400">protein</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.nutrition.carbs}g
                </div>
                <div className="text-gray-600 dark:text-gray-400">carbs</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

RecipeCard.displayName = 'RecipeCard';
