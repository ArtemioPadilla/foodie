import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MealPlan } from '@/types';
import { useRecipes } from '@contexts/RecipeContext';
import { Card, Badge } from '@components/common';
import { cn } from '@utils/cn';

export interface PlanSummaryProps {
  plan: MealPlan;
  className?: string;
}

/**
 * Summary panel showing cost, nutrition, and ingredient totals for a meal plan
 */
export const PlanSummary: React.FC<PlanSummaryProps> = ({ plan, className }) => {
  const { t } = useTranslation();
  const { getRecipeById } = useRecipes();

  const summary = useMemo(() => {
    let totalMeals = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const uniqueIngredients = new Set<string>();

    plan.days.forEach((day) => {
      // Count breakfast
      if (day.meals.breakfast) {
        totalMeals++;
        const recipe = getRecipeById(day.meals.breakfast.recipeId);
        if (recipe?.nutrition) {
          const scaleFactor = day.meals.breakfast.servings / recipe.servings;
          totalCalories += recipe.nutrition.calories * scaleFactor;
          totalProtein += recipe.nutrition.protein * scaleFactor;
          totalCarbs += recipe.nutrition.carbs * scaleFactor;
          totalFat += recipe.nutrition.fat * scaleFactor;
          recipe.ingredients.forEach((ing) => uniqueIngredients.add(ing.ingredientId));
        }
      }

      // Count lunch
      if (day.meals.lunch) {
        totalMeals++;
        const recipe = getRecipeById(day.meals.lunch.recipeId);
        if (recipe?.nutrition) {
          const scaleFactor = day.meals.lunch.servings / recipe.servings;
          totalCalories += recipe.nutrition.calories * scaleFactor;
          totalProtein += recipe.nutrition.protein * scaleFactor;
          totalCarbs += recipe.nutrition.carbs * scaleFactor;
          totalFat += recipe.nutrition.fat * scaleFactor;
          recipe.ingredients.forEach((ing) => uniqueIngredients.add(ing.ingredientId));
        }
      }

      // Count dinner
      if (day.meals.dinner) {
        totalMeals++;
        const recipe = getRecipeById(day.meals.dinner.recipeId);
        if (recipe?.nutrition) {
          const scaleFactor = day.meals.dinner.servings / recipe.servings;
          totalCalories += recipe.nutrition.calories * scaleFactor;
          totalProtein += recipe.nutrition.protein * scaleFactor;
          totalCarbs += recipe.nutrition.carbs * scaleFactor;
          totalFat += recipe.nutrition.fat * scaleFactor;
          recipe.ingredients.forEach((ing) => uniqueIngredients.add(ing.ingredientId));
        }
      }

      // Count snacks
      if (day.meals.snacks) {
        day.meals.snacks.forEach((snack) => {
          totalMeals++;
          const recipe = getRecipeById(snack.recipeId);
          if (recipe?.nutrition) {
            const scaleFactor = snack.servings / recipe.servings;
            totalCalories += recipe.nutrition.calories * scaleFactor;
            totalProtein += recipe.nutrition.protein * scaleFactor;
            totalCarbs += recipe.nutrition.carbs * scaleFactor;
            totalFat += recipe.nutrition.fat * scaleFactor;
            recipe.ingredients.forEach((ing) => uniqueIngredients.add(ing.ingredientId));
          }
        });
      }
    });

    return {
      totalMeals,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      uniqueIngredients: uniqueIngredients.size,
      estimatedCost: plan.estimatedCost || 0,
    };
  }, [plan, getRecipeById]);

  return (
    <Card className={cn('', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Total Meals */}
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.totalMeals}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('planner.totalMeals', 'Total Meals')}
          </div>
        </div>

        {/* Calories */}
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {summary.totalCalories.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('nutrition.calories', 'Calories')}
          </div>
        </div>

        {/* Protein */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalProtein}g
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('nutrition.protein', 'Protein')}
          </div>
        </div>

        {/* Carbs */}
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {summary.totalCarbs}g
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('nutrition.carbs', 'Carbs')}
          </div>
        </div>

        {/* Fat */}
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {summary.totalFat}g
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('nutrition.fat', 'Fat')}
          </div>
        </div>

        {/* Ingredients */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {summary.uniqueIngredients}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('planner.ingredients', 'Ingredients')}
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${summary.estimatedCost.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('planner.estimatedCost', 'Est. Cost')}
          </div>
        </div>
      </div>

      {/* Dietary Restrictions */}
      {plan.dietaryRestrictions && plan.dietaryRestrictions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('planner.dietaryRestrictions', 'Dietary Restrictions')}:
            </span>
            {plan.dietaryRestrictions.map((restriction) => (
              <Badge key={restriction} variant="default" size="sm">
                {restriction}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

PlanSummary.displayName = 'PlanSummary';
