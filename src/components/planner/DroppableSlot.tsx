import React from 'react';
import { useDrop } from 'react-dnd';
import { Recipe, MealSlot } from '@/types';
import { DayMealSlot } from './DayMealSlot';
import { DragItem } from './DraggableRecipe';
import { cn } from '@utils/cn';

export interface DroppableSlotProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  meal?: MealSlot;
  recipe?: Recipe;
  dayIndex: number;
  className?: string;
  onDrop: (recipe: Recipe, servings: number) => void;
  onRemove?: () => void;
  onClick?: () => void;
}

/**
 * Droppable slot wrapper for DayMealSlot with React DnD integration
 */
export const DroppableSlot: React.FC<DroppableSlotProps> = ({
  mealType,
  meal,
  recipe,
  dayIndex,
  className,
  onDrop,
  onRemove,
  onClick,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept: 'RECIPE',
      drop: (item) => {
        onDrop(item.recipe, item.servings);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onDrop]
  );

  return (
    <div
      ref={drop}
      className={cn(
        'relative transition-all duration-200',
        isOver && canDrop && 'ring-2 ring-emerald-500 ring-offset-2 rounded-lg',
        canDrop && !isOver && 'ring-1 ring-gray-300 dark:ring-gray-600 rounded-lg',
        className
      )}
    >
      {/* Drop indicator overlay */}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg z-10 pointer-events-none flex items-center justify-center">
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            Drop recipe here
          </div>
        </div>
      )}

      <DayMealSlot
        mealType={mealType}
        meal={meal}
        recipe={recipe}
        dayIndex={dayIndex}
        onRemove={onRemove}
        onClick={onClick}
      />
    </div>
  );
};

DroppableSlot.displayName = 'DroppableSlot';
