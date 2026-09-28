import { useStore } from '@nanostores/react';
import { t, type Locale } from '@/i18n';
import { $online } from '@/stores/online';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Renders a fixed bottom banner when the browser goes offline.
 *
 * Mounted with `client:idle` in BaseLayout so the event listener is live as
 * soon as the main thread is idle — not gated on visibility. The banner is
 * visually absent until needed, so there is no layout cost when online.
 *
 * Accessibility:
 * - role="status" + aria-live="polite" announces the message to screen readers
 *   without interrupting ongoing speech.
 */
export default function OfflineBanner({ lang = 'en' }: { lang?: Locale }) {
  const online = useStore($online);
  // Offline is known before hydration; the server rendered nothing, so wait
  // for hydration before showing the banner (roadmap Issue 045).
  const hydrated = useHydrated();
  if (!hydrated || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive shadow-lg backdrop-blur-sm motion-preset-slide-up-md motion-duration-300"
    >
      <span aria-hidden="true">●</span>{' '}
      <span>{t(lang, 'offline.banner')}</span>
    </div>
  );
}
