import * as React from 'react';
import { BellIcon, PauseIcon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t, type Locale } from '@/i18n';
import { formatCountdown } from '@/lib/domain/recipe-detail';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';

export interface RecipeTimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Duration in minutes (from `RecipeInstruction.time`). */
  minutes: number;
  /** Human label of the step, e.g. "Step 3"; falls back to "Cooking timer". */
  stepLabel?: string;
  lang?: Locale;
  /** Test hook: tick interval in ms (defaults to 1 s). */
  tickMs?: number;
}

/** Ask once for notification permission; resolves to whether we may notify. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Fire the "time's up" notification when the user allowed it (never throws). */
export function notifyTimerDone(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: withBase('/icons/pwa-192.png') });
  } catch {
    // Some browsers only allow notifications from a service worker; ignore.
  }
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * RecipeTimer — per-step countdown in a `Dialog` (roadmap Issue 018, port of
 * legacy `RecipeTimer`). Start / pause / resume / reset, an SVG progress ring,
 * a `role="timer"` live region and a Web Notification when the countdown
 * reaches zero (permission is requested on the first "Start", a user gesture).
 * Lives inside the `RecipeDetailActions` island: trigger and content share one
 * React root (Astro compound-component rule). The countdown state is
 * initialised from `minutes` on mount — give it a new `key` per step/opening
 * to start fresh.
 */
export function RecipeTimer({ open, onOpenChange, minutes, stepLabel, lang = 'en', tickMs = 1000 }: RecipeTimerProps) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const [secondsLeft, setSecondsLeft] = React.useState(totalSeconds);
  const [running, setRunning] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const title = stepLabel ? t(lang, 'recipe.timerFor', { step: stepLabel }) : t(lang, 'recipe.cookingTimer');
  const doneBody = t(lang, 'recipe.timerDoneBody', { step: stepLabel ?? t(lang, 'recipe.cookingTimer') });

  // One tick per `tickMs` while running; reaching zero stops the clock and
  // notifies once (side effects live in the timeout callback, never in a
  // state updater). The parent remounts the component (`key`) for a new step,
  // which is what resets the countdown.
  React.useEffect(() => {
    if (!running) return;
    const timeout = window.setTimeout(() => {
      const next = Math.max(0, secondsLeft - 1);
      setSecondsLeft(next);
      if (next === 0) {
        setRunning(false);
        notifyTimerDone(t(lang, 'recipe.timerDone'), doneBody);
      }
    }, tickMs);
    return () => window.clearTimeout(timeout);
  }, [running, secondsLeft, tickMs, lang, doneBody]);

  const complete = started && secondsLeft === 0;
  const progress = totalSeconds === 0 ? 1 : (totalSeconds - secondsLeft) / totalSeconds;

  const start = () => {
    if (!started) {
      setStarted(true);
      void ensureNotificationPermission();
    }
    if (secondsLeft === 0) setSecondsLeft(totalSeconds);
    setRunning(true);
  };
  const reset = () => {
    setSecondsLeft(totalSeconds);
    setRunning(false);
    setStarted(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="recipe-timer">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t(lang, 'recipe.timerTotal', { minutes })}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-2">
          <div className="relative size-40">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                className={cn('motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear', complete ? 'text-emerald-500' : 'text-primary')}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <output
                role="timer"
                aria-live={complete ? 'assertive' : 'off'}
                aria-atomic="true"
                className={cn('font-display text-4xl font-semibold tabular-nums', complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}
                data-testid="timer-display"
              >
                {formatCountdown(secondsLeft)}
              </output>
              <span className="sr-only">{running ? t(lang, 'recipe.timerRunning') : started ? t(lang, 'recipe.timerPaused') : ''}</span>
            </div>
          </div>

          {complete && (
            <p className="mt-3 flex items-center gap-2 text-center font-semibold text-emerald-600 dark:text-emerald-400" role="status">
              <BellIcon className="size-4" aria-hidden="true" />
              {t(lang, 'recipe.timerDone')}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {!started || complete ? (
              <Button type="button" size="lg" onClick={start} data-testid="timer-start">
                <PlayIcon className="size-4" aria-hidden="true" />
                {complete ? t(lang, 'recipe.startAgain') : t(lang, 'recipe.startTimer')}
              </Button>
            ) : (
              <>
                <Button type="button" size="lg" onClick={running ? () => setRunning(false) : start} data-testid="timer-toggle">
                  {running ? <PauseIcon className="size-4" aria-hidden="true" /> : <PlayIcon className="size-4" aria-hidden="true" />}
                  {running ? t(lang, 'recipe.pause') : t(lang, 'recipe.resume')}
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={reset} data-testid="timer-reset">
                  <RotateCcwIcon className="size-4" aria-hidden="true" />
                  {t(lang, 'recipe.reset')}
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t(lang, 'common.close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
