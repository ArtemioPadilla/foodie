/**
 * Cross-tab `storage` events for jsdom tests.
 *
 * Builds `new StorageEvent('storage', init)` — the DOM constructor signature —
 * through `Reflect.construct`. CodeQL's DOM model declares `StorageEvent` with
 * no parameters and reported every direct `new StorageEvent(type, init)` as
 * "superfluous trailing arguments" (roadmap Issue 047); the event built here
 * is the same native `StorageEvent`, so `key`, `newValue`, `oldValue` and
 * `storageArea` read exactly as a browser's would.
 */
export function storageEvent(init: StorageEventInit): StorageEvent {
  const event: unknown = Reflect.construct(StorageEvent, ['storage', init]);
  if (!(event instanceof StorageEvent)) throw new TypeError('StorageEvent is not constructible here');
  return event;
}

/** Dispatch a `storage` event on `window`, as another tab's write would. */
export function fireStorage(init: StorageEventInit): void {
  window.dispatchEvent(storageEvent(init));
}
