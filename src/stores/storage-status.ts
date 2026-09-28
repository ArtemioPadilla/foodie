import { atom } from 'nanostores';

/**
 * Cross-island signal for persistence problems. `persistentAtom` calls
 * `notifyQuotaExceeded` when `localStorage` is full; an island (e.g. the
 * layout's toaster) subscribes and shows `toast()` — stores stay UI-free.
 */
export interface StorageQuotaEvent {
  key: string;
  at: number;
}

export const $storageQuotaExceeded = atom<StorageQuotaEvent | null>(null);

export function notifyQuotaExceeded({ key }: { key: string }): void {
  console.warn(`[persist] localStorage quota exceeded while saving "${key}"; the change stays in memory only.`);
  $storageQuotaExceeded.set({ key, at: Date.now() });
}

export function clearStorageQuotaWarning(): void {
  $storageQuotaExceeded.set(null);
}
