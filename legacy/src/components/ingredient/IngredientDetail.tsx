import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ingredient } from '@/types';
import { Card, Badge } from '@components/common';
import { useLanguage } from '@contexts/LanguageContext';
import { useIngredients } from '@contexts/IngredientContext';
import { cn } from '@utils/cn';
import {
  Layers,
  Leaf,
  Package,
  DollarSign,
  MapPin,
  Calendar,
  ChefHat,
  ArrowRight,
  Info,
  Scale
} from 'lucide-react';

export interface IngredientDetailProps {
  ingredient: Ingredient;
  className?: string;
}

export const IngredientDetail: React.FC<IngredientDetailProps> = ({
  ingredient,
  className,
}) => {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const { getIngredientById, getIngredientName } = useIngredients();

  const name = getTranslated(ingredient.name);
  const description = ingredient.description ? getTranslated(ingredient.description) : null;
  const storageInstructions = getTranslated(ingredient.storageInstructions);
  const preparationNotes = ingredient.preparationNotes
    ? getTranslated(ingredient.preparationNotes)
    : null;

  // Build dietary tags to display
  const dietaryTags: { key: string; label: string; color: 'success' | 'warning' | 'info' | 'default' }[] = [];

  if (ingredient.tags.vegan) {
    dietaryTags.push({ key: 'vegan', label: t('dietary.vegan'), color: 'success' });
  }
  if (ingredient.tags.vegetarian && !ingredient.tags.vegan) {
    dietaryTags.push({ key: 'vegetarian', label: t('dietary.vegetarian'), color: 'success' });
  }
  if (ingredient.tags.glutenFree) {
    dietaryTags.push({ key: 'glutenFree', label: t('dietary.glutenFree'), color: 'warning' });
  }
  if (ingredient.tags.dairyFree) {
    dietaryTags.push({ key: 'dairyFree', label: t('dietary.dairyFree'), color: 'info' });
  }
  if (ingredient.tags.nutFree) {
    dietaryTags.push({ key: 'nutFree', label: t('dietary.nutFree'), color: 'info' });
  }
  if (ingredient.tags.kosher) {
    dietaryTags.push({ key: 'kosher', label: t('dietary.kosher'), color: 'default' });
  }
  if (ingredient.tags.halal) {
    dietaryTags.push({ key: 'halal', label: t('dietary.halal'), color: 'default' });
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Card */}
      <Card className="overflow-hidden" padding="lg">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {name}
              </h1>
              {ingredient.isComposite && (
                <Badge variant="info" size="md" className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {t('ingredient.composite')}
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {description}
              </p>
            )}

            {/* Category and Region */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="capitalize">
                  {t(`category.${ingredient.category}`, ingredient.category)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{ingredient.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>
                  {ingredient.currency === 'USD' ? '$' : ingredient.currency}
                  {ingredient.avgPrice.toFixed(2)}/{t(`units.${ingredient.unit}`, ingredient.unit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dietary Tags */}
        {dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {dietaryTags.map((tag) => (
              <Badge
                key={tag.key}
                variant={tag.color}
                size="md"
              >
                {tag.label}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Composite Ingredient Components */}
      {ingredient.isComposite && ingredient.components && ingredient.components.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('ingredient.components')}
            </h2>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('ingredient.compositeDescription')}
          </p>

          <div className="space-y-3">
            {ingredient.components.map((component, index) => {
              const componentIngredient = getIngredientById(component.ingredientId);
              const componentName = componentIngredient
                ? getTranslated(componentIngredient.name)
                : getIngredientName(component.ingredientId);
              const componentNotes = component.notes ? getTranslated(component.notes) : null;

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {component.quantity} {t(`units.${component.unit}`, component.unit)}
                      </span>
                      <Link
                        to={`/ingredients/${component.ingredientId}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {componentName}
                      </Link>
                    </div>
                    {componentNotes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {componentNotes}
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/ingredients/${component.ingredientId}`}
                    className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    aria-label={t('ingredient.viewIngredient')}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Yield info */}
          {ingredient.yield && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Scale className="h-4 w-4 text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{t('ingredient.yield')}:</span>{' '}
                {ingredient.yield.quantity} {t(`units.${ingredient.yield.unit}`, ingredient.yield.unit)}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Preparation Notes for Composite Ingredients */}
      {ingredient.isComposite && preparationNotes && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('ingredient.preparation')}
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {preparationNotes}
          </p>
        </Card>
      )}

      {/* Storage Instructions */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('ingredient.storage')}
          </h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          {storageInstructions}
        </p>
      </Card>

      {/* Seasonality */}
      {ingredient.seasonality && ingredient.seasonality.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('ingredient.seasonality')}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ingredient.seasonality.map((season) => (
              <Badge key={season} variant="default" size="md" className="capitalize">
                {t(`season.${season}`, season)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Alternatives */}
      {ingredient.alternatives && ingredient.alternatives.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('ingredient.alternatives')}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ingredient.alternatives.map((alt) => (
              <Badge key={alt} variant="info" size="md" className="capitalize">
                {alt}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

IngredientDetail.displayName = 'IngredientDetail';
