import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '@components/common';
import { cn } from '@utils/cn';

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'time-asc'
  | 'time-desc'
  | 'rating-desc'
  | 'rating-asc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'recent';

export interface RecipeSorterProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

export const RecipeSorter: React.FC<RecipeSorterProps> = ({
  value,
  onChange,
  className,
}) => {
  const { t } = useTranslation();

  const sortOptions: SelectOption[] = useMemo(() => [
    { value: 'name-asc', label: t('recipe.sortNameAsc') },
    { value: 'name-desc', label: t('recipe.sortNameDesc') },
    { value: 'time-asc', label: t('recipe.sortTimeAsc') },
    { value: 'time-desc', label: t('recipe.sortTimeDesc') },
    { value: 'rating-desc', label: t('recipe.sortRatingDesc') },
    { value: 'rating-asc', label: t('recipe.sortRatingAsc') },
    { value: 'difficulty-asc', label: t('recipe.sortDifficultyAsc') },
    { value: 'difficulty-desc', label: t('recipe.sortDifficultyDesc') },
    { value: 'recent', label: t('recipe.sortRecent') },
  ], [t]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        htmlFor="recipe-sort"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        {t('common.sortBy')}
      </label>
      <Select
        id="recipe-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        options={sortOptions}
      />
    </div>
  );
};

RecipeSorter.displayName = 'RecipeSorter';

/**
 * Helper function to sort recipes based on sort option
 */
// eslint-disable-next-line react-refresh/only-export-components
export function sortRecipes<T extends {
  name?: { en?: string; es?: string; fr?: string };
  totalTime?: number;
  rating?: number;
  difficulty?: string;
  dateAdded?: string;
}>(
  recipes: T[],
  sortBy: SortOption,
  langKey: 'en' | 'es' | 'fr' = 'en'
): T[] {
  const sorted = [...recipes];

  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => {
        const nameA = a.name?.[langKey] || a.name?.en || '';
        const nameB = b.name?.[langKey] || b.name?.en || '';
        return nameA.localeCompare(nameB);
      });

    case 'name-desc':
      return sorted.sort((a, b) => {
        const nameA = a.name?.[langKey] || a.name?.en || '';
        const nameB = b.name?.[langKey] || b.name?.en || '';
        return nameB.localeCompare(nameA);
      });

    case 'time-asc':
      return sorted.sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0));

    case 'time-desc':
      return sorted.sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0));

    case 'rating-desc':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    case 'rating-asc':
      return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    case 'difficulty-asc': {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      return sorted.sort(
        (a, b) =>
          (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) -
          (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0)
      );
    }

    case 'difficulty-desc': {
      const difficultyOrderDesc = { hard: 1, medium: 2, easy: 3 };
      return sorted.sort(
        (a, b) =>
          (difficultyOrderDesc[a.difficulty as keyof typeof difficultyOrderDesc] || 0) -
          (difficultyOrderDesc[b.difficulty as keyof typeof difficultyOrderDesc] || 0)
      );
    }

    case 'recent':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.dateAdded || 0).getTime();
        const dateB = new Date(b.dateAdded || 0).getTime();
        return dateB - dateA;
      });

    default:
      return sorted;
  }
}
