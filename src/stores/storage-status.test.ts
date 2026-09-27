import { beforeEach, describe, expect, it, vi } from 'vitest';
import { $storageQuotaExceeded, clearStorageQuotaWarning, notifyQuotaExceeded } from './storage-status';

beforeEach(() => clearStorageQuotaWarning());

describe('$storageQuotaExceeded', () => {
  it('records the offending key and warns once per event', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    notifyQuotaExceeded({ key: 'trackingEntries' });
    expect($storageQuotaExceeded.get()).toMatchObject({ key: 'trackingEntries' });
    expect(warn).toHaveBeenCalledTimes(1);
    clearStorageQuotaWarning();
    expect($storageQuotaExceeded.get()).toBeNull();
    warn.mockRestore();
  });
});
