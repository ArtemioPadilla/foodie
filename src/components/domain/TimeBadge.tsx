import * as React from 'react';
import { ClockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * TimeBadge — a duration in minutes with a clock icon (roadmap Issue 021;
 * replaces the inline clock + "25 min" spans of `RecipeCard`, the ingredient
 * detail's "used in" list and the "what can I make?" suggestions).
 *
 * - `appearance="inline"` (default) inherits the surrounding text colour and
 *   size (meta rows); `appearance="badge"` is an outline kit `Badge`.
 * - `label` (e.g. "Total Time") is exposed as `title` and as a visually hidden
 *   prefix, so the number is never announced without context.
 */
export interface TimeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  minutes: number;
  lang?: Locale;
  /** What the duration is ("Prep Time", "Total Time", …). */
  label?: string;
  appearance?: 'inline' | 'badge';
  /** Icon size classes (default `size-4`; `size-3.5`/`size-3` in dense rows). */
  iconClassName?: string;
}

export function TimeBadge({
  minutes,
  lang = 'en',
  label,
  appearance = 'inline',
  iconClassName = 'size-4',
  className,
  ...props
}: TimeBadgeProps) {
  const content = (
    <>
      <ClockIcon className={cn('shrink-0', iconClassName)} aria-hidden="true" />
      {label && <span className="sr-only">{label}: </span>}
      <span className="tabular-nums">
        {minutes} {t(lang, 'common.minutesAbbr')}
      </span>
    </>
  );
  if (appearance === 'badge') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-border font-medium', className)} title={label} data-testid="time-badge" {...props}>
        {content}
      </Badge>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={label} data-testid="time-badge" {...props}>
      {content}
    </span>
  );
}
