import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '@components/common';
import { cn } from '@utils/cn';
import type { SortOption } from '@/types';

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
