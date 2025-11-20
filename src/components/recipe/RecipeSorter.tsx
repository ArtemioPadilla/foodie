import React from 'react';
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

const sortOptions: SelectOption[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'time-asc', label: 'Time (Shortest first)' },
  { value: 'time-desc', label: 'Time (Longest first)' },
  { value: 'rating-desc', label: 'Rating (Highest first)' },
  { value: 'rating-asc', label: 'Rating (Lowest first)' },
  { value: 'difficulty-asc', label: 'Difficulty (Easy first)' },
  { value: 'difficulty-desc', label: 'Difficulty (Hard first)' },
  { value: 'recent', label: 'Recently added' },
];

export const RecipeSorter: React.FC<RecipeSorterProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        htmlFor="recipe-sort"
        className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
      >
        Sort by:
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
