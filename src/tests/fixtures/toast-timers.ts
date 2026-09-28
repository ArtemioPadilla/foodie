/**
 * Close every toast an island test opened before RTL unmounts it.
 *
 * Base UI's `ToastProvider` schedules each toast's auto-dismiss with a real
 * `setTimeout` and does not clear it on unmount. When a test file finishes
 * within that window, the timer fires after Vitest has torn down jsdom and
 * React throws `ReferenceError: window is not defined` as an unhandled error —
 * which fails `npm run check` intermittently, under load (roadmap Issue 029).
 * `toastManager.close(id)` clears the timer while the provider is still mounted.
 *
 * Call once at the top level of a jsdom test file. Vitest runs `afterEach`
 * hooks in reverse registration order, so this runs before RTL's cleanup.
 */
import { act } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { toastManager } from '@/components/ui/toast';

export function closeToastsAfterEach(): void {
  const opened: string[] = [];
  beforeEach(() => {
    opened.length = 0;
    const add = toastManager.add.bind(toastManager);
    vi.spyOn(toastManager, 'add').mockImplementation((options) => {
      const id = add(options);
      opened.push(id);
      return id;
    });
  });
  afterEach(() => {
    act(() => {
      for (const id of opened) toastManager.close(id);
    });
    vi.mocked(toastManager.add).mockRestore();
  });
}
