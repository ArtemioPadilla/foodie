import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ingredient } from '@/types';
import { Card, Badge } from '@components/common';
import { useLanguage } from '@contexts/LanguageContext';
import { cn } from '@utils/cn';
import { Layers, Leaf, Wheat, Milk, Nut } from 'lucide-react';

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
  const description = ingredient.description ? getTranslated(ingredient.description) : null;

  const cardContent = (
    <Card
      hoverable={!!onClick || linkToDetail}
      onClick={onClick}
      className={cn('overflow-hidden', className)}
      padding="none"
    >
      {/* Image or Placeholder */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800">
        {ingredient.imageUrl ? (
          <img
            src={ingredient.imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">
              {ingredient.category === 'protein' && '🍖'}
              {ingredient.category === 'vegetables' && '🥬'}
              {ingredient.category === 'fruits' && '🍎'}
              {ingredient.category === 'grains' && '🌾'}
              {ingredient.category === 'dairy' && '🧀'}
              {ingredient.category === 'pantry' && '🫙'}
              {ingredient.category === 'spices' && '🌿'}
            </span>
          </div>
        )}

        {/* Composite Badge */}
        {ingredient.isComposite && (
          <div className="absolute top-2 right-2">
            <Badge variant="info" size="sm" className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {t('ingredient.composite', 'Composite')}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {name}
          </h3>
          {showDetails && description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Category Badge */}
        <div className="mb-2">
          <Badge variant="default" size="sm">
            {t(`category.${ingredient.category}`, ingredient.category)}
          </Badge>
        </div>

        {/* Dietary Tags */}
        {showDetails && (
          <div className="flex flex-wrap gap-1">
            {ingredient.tags.vegan && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded" title={t('dietary.vegan', 'Vegan')}>
                <Leaf className="w-3 h-3" />
                <span className="sr-only">{t('dietary.vegan', 'Vegan')}</span>
              </span>
            )}
            {ingredient.tags.vegetarian && !ingredient.tags.vegan && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded" title={t('dietary.vegetarian', 'Vegetarian')}>
                V
              </span>
            )}
            {ingredient.tags.glutenFree && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded" title={t('dietary.glutenFree', 'Gluten Free')}>
                <Wheat className="w-3 h-3" />
                <span className="sr-only">{t('dietary.glutenFree', 'Gluten Free')}</span>
              </span>
            )}
            {ingredient.tags.dairyFree && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded" title={t('dietary.dairyFree', 'Dairy Free')}>
                <Milk className="w-3 h-3" />
                <span className="sr-only">{t('dietary.dairyFree', 'Dairy Free')}</span>
              </span>
            )}
            {ingredient.tags.nutFree && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded" title={t('dietary.nutFree', 'Nut Free')}>
                <Nut className="w-3 h-3" />
                <span className="sr-only">{t('dietary.nutFree', 'Nut Free')}</span>
              </span>
            )}
          </div>
        )}

        {/* Components count for composite ingredients */}
        {ingredient.isComposite && ingredient.components && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('ingredient.componentCount', '{{count}} components', { count: ingredient.components.length })}
          </div>
        )}
      </div>
    </Card>
  );

  if (linkToDetail) {
    return (
      <Link to={`/ingredients/${ingredient.id}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

IngredientCard.displayName = 'IngredientCard';
