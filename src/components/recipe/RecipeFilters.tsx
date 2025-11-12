import React, { useState } from 'react';
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
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="info" size="sm">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={['type', 'cuisine']}>
        {/* Meal Type */}
        <AccordionItem value="type">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              Meal Type
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
                  label={type.charAt(0).toUpperCase() + type.slice(1)}
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
              Cuisine
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
                  label={cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
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
                  {showAll ? 'Show less' : `Show ${availableCuisines.length - 5} more`}
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Difficulty */}
        <AccordionItem value="difficulty">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              Difficulty
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
                  label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
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
              Prep Time
              {filters.maxTime && (
                <Badge variant="success" size="sm">
                  ≤{filters.maxTime}m
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
                { value: 'any', label: 'Any time' },
                { value: '15', label: '15 minutes or less' },
                { value: '30', label: '30 minutes or less' },
                { value: '60', label: '1 hour or less' },
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Dietary Labels */}
        <AccordionItem value="dietary">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              Dietary
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
                    label={
                      label === 'glutenFree'
                        ? 'Gluten Free'
                        : label === 'dairyFree'
                        ? 'Dairy Free'
                        : label === 'lowCarb'
                        ? 'Low Carb'
                        : label.charAt(0).toUpperCase() + label.slice(1)
                    }
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
              Tags
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
                  label={tag.charAt(0).toUpperCase() + tag.slice(1)}
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
