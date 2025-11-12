import React from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '@/types';
import { Card, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeDetailProps {
  recipe: Recipe;
  className?: string;
  onServingsChange?: (servings: number) => void;
  children?: React.ReactNode;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  className,
  children,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'es' | 'fr';

  const name = recipe.name[currentLang] || recipe.name.en;
  const description = recipe.description[currentLang] || recipe.description.en;
  const tips = recipe.tips?.[currentLang] || recipe.tips?.en;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero Section */}
      <Card padding="none" className="overflow-hidden">
        {/* Image */}
        <div className="relative h-96 bg-gray-200 dark:bg-gray-700">
          <img
            src={
              recipe.imageUrl ||
              `https://via.placeholder.com/1200x400/10b981/ffffff?text=${encodeURIComponent(
                name
              )}`
            }
            alt={name}
            className="w-full h-full object-cover"
          />

          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{name}</h1>
            <p className="text-lg text-gray-200">{description}</p>
          </div>
        </div>

        {/* Meta Info Bar */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-6">
            {/* Prep Time */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Prep</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.prepTime} min
                </div>
              </div>
            </div>

            {/* Cook Time */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Cook</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.cookTime} min
                </div>
              </div>
            </div>

            {/* Total Time */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.totalTime} min
                </div>
              </div>
            </div>

            {/* Servings */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Servings</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.servings}
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Difficulty</div>
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

            {/* Rating */}
            {recipe.rating && (
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rating</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {recipe.rating.toFixed(1)}
                    {recipe.reviewCount && (
                      <span className="text-sm text-gray-500 ml-1">
                        ({recipe.reviewCount})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="default" size="md">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Cuisine & Type */}
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-medium">Cuisine:</span>{' '}
          {recipe.cuisine.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
        </div>
        <div>
          <span className="font-medium">Type:</span>{' '}
          {recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1)}
        </div>
      </div>

      {/* Tips */}
      {tips && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Pro Tip
              </h3>
              <p className="text-blue-800 dark:text-blue-200">{tips}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Children content (ingredients, instructions, nutrition tabs) */}
      {children}
    </div>
  );
};

RecipeDetail.displayName = 'RecipeDetail';
