import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/schemas';

/**
 * DifficultyBadge — a recipe's difficulty as a tinted kit `Badge` (roadmap
 * Issue 021; extracted from `RecipeCard`). Tints pair a -100/-950 surface with
 * -800/-200 text, so the label stays ≥ 4.5:1 in both themes; the text (not the
 * hue) carries the meaning.
 */
export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  medium: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  hard: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
};

export interface DifficultyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  difficulty: Difficulty;
  lang?: Locale;
}

export function DifficultyBadge({ difficulty, lang = 'en', className, ...props }: DifficultyBadgeProps) {
  return (
    <Badge className={cn(DIFFICULTY_CLASS[difficulty], className)} data-difficulty={difficulty} {...props}>
      {t(lang, `recipe.difficulty_${difficulty}`)}
    </Badge>
  );
}
