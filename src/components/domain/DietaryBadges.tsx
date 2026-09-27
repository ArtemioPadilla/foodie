import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { DietaryLabels } from '@/schemas';

/** Display order of the `Recipe.dietaryLabels` flags (most common first). */
export const DIETARY_LABEL_KEYS: ReadonlyArray<keyof DietaryLabels> = [
  'vegetarian',
  'vegan',
  'glutenFree',
  'dairyFree',
  'lowCarb',
  'keto',
  'paleo',
  'whole30',
];

export interface DietaryBadgesProps extends React.HTMLAttributes<HTMLUListElement> {
  labels: DietaryLabels;
  lang?: Locale;
  /** How many badges to show before collapsing the rest into a "+N" badge. */
  max?: number;
}

/**
 * DietaryBadges — the `true` flags of a recipe's `dietaryLabels` as compact
 * badges (`dietary.*` dictionary labels), roadmap Issue 017. Renders nothing
 * when no flag is set so cards never show an empty row.
 */
export function DietaryBadges({ labels, lang = 'en', max = 3, className, ...props }: DietaryBadgesProps) {
  const active = DIETARY_LABEL_KEYS.filter((key) => labels[key] === true);
  if (active.length === 0) return null;
  const shown = active.slice(0, max);
  const overflow = active.length - shown.length;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} data-testid="dietary-badges" {...props}>
      {shown.map((key) => (
        <li key={key}>
          <Badge variant="secondary" className="font-medium">
            {t(lang, `dietary.${key}`)}
          </Badge>
        </li>
      ))}
      {overflow > 0 && (
        <li>
          <Badge variant="outline" aria-label={active.slice(max).map((key) => t(lang, `dietary.${key}`)).join(', ')}>
            +{overflow}
          </Badge>
        </li>
      )}
    </ul>
  );
}
