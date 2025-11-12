import React, { useState } from 'react';
import { Card, Button } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showReviews?: boolean;
}

export const RecipeRating: React.FC<RecipeRatingProps> = ({
  rating,
  reviewCount = 0,
  className,
  interactive = false,
  onRate,
  showReviews = true,
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);

  const handleClick = (value: number) => {
    if (!interactive || !onRate) return;
    setUserRating(value);
    onRate(value);
  };

  const displayRating = hoverRating || userRating || rating;

  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Rating & Reviews
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {rating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">out of 5</div>
        </div>
      </div>

      {/* Star Rating */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => handleClick(value)}
            onMouseEnter={() => interactive && setHoverRating(value)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
            className={cn(
              'transition-all',
              interactive && 'cursor-pointer hover:scale-110'
            )}
            aria-label={`Rate ${value} stars`}
          >
            <svg
              className={cn(
                'w-8 h-8 transition-colors',
                value <= displayRating
                  ? 'text-yellow-500 fill-current'
                  : 'text-gray-300 dark:text-gray-600'
              )}
              fill={value <= displayRating ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>

      {userRating > 0 && (
        <div className="text-center mb-4 text-sm text-emerald-600 dark:text-emerald-400">
          Thanks for rating! You gave {userRating} stars.
        </div>
      )}

      {/* Rating Distribution */}
      {showReviews && reviewCount > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Rating Distribution
          </div>
          {[5, 4, 3, 2, 1].map((stars) => {
            // Mock distribution - in real app this would come from data
            const percentage = Math.max(0, Math.min(100, (stars / 5) * rating * 20));
            const count = Math.round((percentage / 100) * reviewCount);

            return (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{stars}</span>
                  <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Write Review Button */}
      {interactive && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" fullWidth>
            Write a Review
          </Button>
        </div>
      )}
    </Card>
  );
};

RecipeRating.displayName = 'RecipeRating';
