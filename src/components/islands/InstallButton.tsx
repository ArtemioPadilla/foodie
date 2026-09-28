import { useStore } from '@nanostores/react';
import { t, type Locale } from '@/i18n';
import { $installPrompt } from '@/stores/install';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Floating install button that appears only when the browser fires
 * `beforeinstallprompt` (Chromium-based browsers only). On Safari/Firefox
 * the store stays null and this component renders nothing — no conditional
 * logic needed beyond the null-check.
 *
 * Mounted with `client:idle` in BaseLayout. The install flow:
 *   1. User clicks the button
 *   2. We call `prompt.prompt()` — shows the native install dialog
 *   3. We await `prompt.userChoice` — if accepted, we clear the store so
 *      the button disappears; if dismissed, it stays visible for next time.
 */
export default function InstallButton({ lang = 'en' }: { lang?: Locale }) {
  const prompt = useStore($installPrompt);
  // `beforeinstallprompt` can fire before this idle island hydrates; render
  // the server's nothing first so hydration matches (roadmap Issue 045 —
  // React #418 in Lighthouse's errors-in-console).
  const hydrated = useHydrated();
  if (!hydrated || !prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          $installPrompt.set(null);
        }
      }}
      className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-preset-slide-right-md motion-duration-300"
    >
      <span aria-hidden="true">&#11015;</span>
      <span>{t(lang, 'offline.install')}</span>
    </button>
  );
}
