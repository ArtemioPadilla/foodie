import React from 'react';
import { useDrag } from 'react-dnd';
import { Recipe } from '@/types';
import { RecipeCard } from '@components/recipe';
import { cn } from '@utils/cn';

export interface DraggableRecipeProps {
  recipe: Recipe;
  defaultServings?: number;
  className?: string;
  onClick?: () => void;
}

export interface DragItem {
  type: string;
  recipe: Recipe;
  servings: number;
}

/**
 * Draggable recipe card for meal planning drag-and-drop
 */
export const DraggableRecipe: React.FC<DraggableRecipeProps> = ({
  recipe,
  defaultServings = recipe.servings,
  className,
  onClick,
}) => {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: 'RECIPE',
    item: {
      type: 'RECIPE',
      recipe,
      servings: defaultServings,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [recipe, defaultServings]);

  return (
    <div
      ref={drag}
      className={cn(
        'transition-opacity duration-200 cursor-move',
        isDragging && 'opacity-50',
        className
      )}
      style={{ touchAction: 'none' }}
    >
      <RecipeCard
        recipe={recipe}
        onClick={onClick}
        className={cn(
          'hover:shadow-lg transition-shadow',
          isDragging && 'shadow-2xl'
        )}
      />
    </div>
  );
};

DraggableRecipe.displayName = 'DraggableRecipe';
