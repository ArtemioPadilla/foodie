import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Checkbox,
  RadioGroup,
  Button,
  Badge,
} from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeFilterOptions {
  types?: string[];
  cuisines?: string[];
  difficulties?: string[];
  dietaryLabels?: string[];
  maxTime?: number;
  tags?: string[];
}

export interface RecipeFiltersProps {
  filters: RecipeFilterOptions;
  onChange: (filters: RecipeFilterOptions) => void;
  availableTypes?: string[];
  availableCuisines?: string[];
  availableTags?: string[];
  className?: string;
}

export const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  filters,
  onChange,
  availableTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'],
  availableCuisines = [
    'american',
    'mediterranean',
    'mexican',
    'italian',
    'asian',
    'french',
    'greek',
  ],
  availableTags = ['vegetarian', 'vegan', 'gluten-free', 'quick', 'healthy'],
  className,
}) => {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const handleTypeToggle = (type: string) => {
    const current = filters.types || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ ...filters, types: updated });
  };

  const handleCuisineToggle = (cuisine: string) => {
    const current = filters.cuisines || [];
    const updated = current.includes(cuisine)
      ? current.filter((c) => c !== cuisine)
      : [...current, cuisine];
    onChange({ ...filters, cuisines: updated });
  };

  const handleTagToggle = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onChange({ ...filters, tags: updated });
  };

  const handleDifficultyChange = (difficulty: string) => {
    const current = filters.difficulties || [];
    const updated = current.includes(difficulty)
      ? current.filter((d) => d !== difficulty)
      : [...current, difficulty];
    onChange({ ...filters, difficulties: updated });
  };

  const handleDietaryLabelToggle = (label: string) => {
    const current = filters.dietaryLabels || [];
    const updated = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label];
    onChange({ ...filters, dietaryLabels: updated });
  };

  const handleTimeChange = (time: string) => {
    onChange({ ...filters, maxTime: time === 'any' ? undefined : parseInt(time) });
  };

  const handleClearAll = () => {
    onChange({});
  };

  const activeFilterCount =
    (filters.types?.length || 0) +
    (filters.cuisines?.length || 0) +
    (filters.difficulties?.length || 0) +
    (filters.dietaryLabels?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.maxTime ? 1 : 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('recipe.filters')}</h3>
          {activeFilterCount > 0 && (
            <Badge variant="info" size="sm">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            {t('common.clearAll')}
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={['type', 'cuisine']}>
        {/* Meal Type */}
        <AccordionItem value="type">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.mealType')}
              {filters.types && filters.types.length > 0 && (
                <Badge variant="success" size="sm">
                  {filters.types.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {availableTypes.map((type) => (
                <Checkbox
                  key={type}
                  label={t(`planner.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                  checked={filters.types?.includes(type) || false}
                  onChange={() => handleTypeToggle(type)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cuisine */}
        <AccordionItem value="cuisine">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.cuisine')}
              {filters.cuisines && filters.cuisines.length > 0 && (
                <Badge variant="success" size="sm">
                  {filters.cuisines.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {availableCuisines.slice(0, showAll ? undefined : 5).map((cuisine) => (
                <Checkbox
                  key={cuisine}
                  label={t(`cuisine.${cuisine}`, cuisine.charAt(0).toUpperCase() + cuisine.slice(1))}
                  checked={filters.cuisines?.includes(cuisine) || false}
                  onChange={() => handleCuisineToggle(cuisine)}
                />
              ))}
              {availableCuisines.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? t('common.showLess') : t('common.showMore', { count: availableCuisines.length - 5 })}
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Difficulty */}
        <AccordionItem value="difficulty">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.difficulty')}
              {filters.difficulties && filters.difficulties.length > 0 && (
                <Badge variant="success" size="sm">
                  {filters.difficulties.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {['easy', 'medium', 'hard'].map((difficulty) => (
                <Checkbox
                  key={difficulty}
                  label={t(`recipe.difficulty_${difficulty}`)}
                  checked={filters.difficulties?.includes(difficulty) || false}
                  onChange={() => handleDifficultyChange(difficulty)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Prep Time */}
        <AccordionItem value="time">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.prepTime')}
              {filters.maxTime && (
                <Badge variant="success" size="sm">
                  {t('recipe.maxTimeFormat', { time: filters.maxTime })}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <RadioGroup
              name="maxTime"
              value={filters.maxTime?.toString() || 'any'}
              onChange={handleTimeChange}
              options={[
                { value: 'any', label: t('recipe.anyTime') },
                { value: '15', label: t('recipe.fifteenMinutesOrLess') },
                { value: '30', label: t('recipe.thirtyMinutesOrLess') },
                { value: '60', label: t('recipe.oneHourOrLess') },
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Dietary Labels */}
        <AccordionItem value="dietary">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.dietary')}
              {filters.dietaryLabels && filters.dietaryLabels.length > 0 && (
                <Badge variant="success" size="sm">
                  {filters.dietaryLabels.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'lowCarb', 'keto'].map(
                (label) => (
                  <Checkbox
                    key={label}
                    label={t(`dietary.${label}`, label === 'glutenFree' ? 'Gluten Free' : label === 'dairyFree' ? 'Dairy Free' : label === 'lowCarb' ? 'Low Carb' : label.charAt(0).toUpperCase() + label.slice(1))}
                    checked={filters.dietaryLabels?.includes(label) || false}
                    onChange={() => handleDietaryLabelToggle(label)}
                  />
                )
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Tags */}
        <AccordionItem value="tags">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              {t('recipe.tags')}
              {filters.tags && filters.tags.length > 0 && (
                <Badge variant="success" size="sm">
                  {filters.tags.length}
                </Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {availableTags.map((tag) => (
                <Checkbox
                  key={tag}
                  label={t(`tags.${tag}`, tag.charAt(0).toUpperCase() + tag.slice(1))}
                  checked={filters.tags?.includes(tag) || false}
                  onChange={() => handleTagToggle(tag)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

RecipeFilters.displayName = 'RecipeFilters';
