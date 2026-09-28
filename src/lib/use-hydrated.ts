import { useClientPreference } from '@/lib/use-client-preference';

const subscribeNever = () => () => {};

/**
 * `true` once running in the browser after hydration; `false` on the server
 * and during the hydration render. Gate store-backed UI (`$favorites`,
 * `$pantry`…) on it so the SSR markup and the first client render always
 * agree, whatever `localStorage` holds.
 */
export function useHydrated(): boolean {
  return useClientPreference(() => true, false, subscribeNever);
}
