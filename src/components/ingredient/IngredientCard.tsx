import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ingredient } from '@/types';
import { Card, Badge } from '@components/common';
import { useLanguage } from '@contexts/LanguageContext';
import { cn } from '@utils/cn';
import { Layers, Leaf, Milk, Wheat, Package } from 'lucide-react';

export interface IngredientCardProps {
  ingredient: Ingredient;
  onClick?: () => void;
  className?: string;
  showDetails?: boolean;
  linkToDetail?: boolean;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  onClick,
  className,
  showDetails = true,
  linkToDetail = true,
}) => {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();

  const name = getTranslated(ingredient.name);
  const storageInstructions = getTranslated(ingredient.storageInstructions);

  // Build dietary tags to display
  const dietaryTags: { key: string; label: string; icon?: React.ReactNode }[] = [];
  
  if (ingredient.tags.vegan) {
    dietaryTags.push({ key: 'vegan', label: t('dietary.vegan'), icon: <Leaf className="h-3 w-3" /> });
  } else if (ingredient.tags.vegetarian) {
    dietaryTags.push({ key: 'vegetarian', label: t('dietary.vegetarian'), icon: <Leaf className="h-3 w-3" /> });
  }
  
  if (ingredient.tags.glutenFree) {
    dietaryTags.push({ key: 'glutenFree', label: t('dietary.glutenFree'), icon: <Wheat className="h-3 w-3" /> });
  }
  
  if (ingredient.tags.dairyFree) {
    dietaryTags.push({ key: 'dairyFree', label: t('dietary.dairyFree'), icon: <Milk className="h-3 w-3" /> });
  }

  const content = (
    <Card
      hoverable={!!onClick || linkToDetail}
      onClick={onClick}
      className={cn('overflow-hidden', className)}
      padding="none"
    >
      <div className="p-4">
        {/* Header with name and composite indicator */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {name}
          </h3>
          {ingredient.isComposite && (
            <Badge variant="info" size="sm" className="flex items-center gap-1 ml-2 flex-shrink-0">
              <Layers className="h-3 w-3" />
              {t('ingredient.composite', 'Composite')}
            </Badge>
          )}
        </div>

        {/* Category */}
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {t(`category.${ingredient.category}`, ingredient.category)}
          </span>
        </div>

        {/* Dietary Tags */}
        {dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {dietaryTags.slice(0, 3).map((tag) => (
              <Badge key={tag.key} variant="success" size="sm" className="flex items-center gap-1">
                {tag.icon}
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Show composition info for composite ingredients */}
        {ingredient.isComposite && ingredient.components && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('ingredient.madeFrom', 'Made from {{count}} ingredients', { count: ingredient.components.length })}
            </p>
          </div>
        )}

        {/* Additional details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Price */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('ingredient.avgPrice', 'Avg. Price')}:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {ingredient.currency === 'USD' ? '$' : ingredient.currency}
                {ingredient.avgPrice.toFixed(2)}/{t(`units.${ingredient.unit}`, ingredient.unit)}
              </span>
            </div>

            {/* Storage Instructions */}
            {storageInstructions && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {storageInstructions}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  if (linkToDetail) {
    return (
      <Link to={`/ingredients/${ingredient.id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

IngredientCard.displayName = 'IngredientCard';
