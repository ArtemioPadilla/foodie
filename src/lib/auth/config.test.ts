import { describe, expect, it } from 'vitest';
import { readAuthConfig } from './config';

const FULL = {
  PUBLIC_FIREBASE_API_KEY: 'test-key',
  PUBLIC_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  PUBLIC_FIREBASE_PROJECT_ID: 'example',
  PUBLIC_FIREBASE_APP_ID: '1:1:web:1',
};

describe('readAuthConfig', () => {
  it('enables Firebase only when all four PUBLIC_FIREBASE_* are set', () => {
    const cfg = readAuthConfig({ ...FULL, PROD: true });
    expect(cfg).toMatchObject({ mode: 'firebase', authEnabled: true });
    expect(cfg.firebase?.projectId).toBe('example');
  });

  it('is disabled in a production build with any value missing', () => {
    const cfg = readAuthConfig({ ...FULL, PUBLIC_FIREBASE_APP_ID: '  ', PROD: true, DEV: false });
    expect(cfg).toEqual({ mode: 'disabled', authEnabled: false, firebase: null });
  });

  it('falls back to the mock in dev/test without credentials', () => {
    expect(readAuthConfig({ DEV: true }).mode).toBe('mock');
    expect(readAuthConfig({ MODE: 'test' }).mode).toBe('mock');
  });

  it('PUBLIC_AUTH_MOCK forces the mock even when Firebase is configured', () => {
    expect(readAuthConfig({ ...FULL, PUBLIC_AUTH_MOCK: '1' }).mode).toBe('mock');
    expect(readAuthConfig({ PUBLIC_AUTH_MOCK: 'true', PROD: true }).mode).toBe('mock');
    expect(readAuthConfig({ PUBLIC_AUTH_MOCK: '0', PROD: true }).mode).toBe('disabled');
  });
});
