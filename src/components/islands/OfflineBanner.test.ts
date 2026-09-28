import { describe, expect, it } from 'vitest';
import source from './OfflineBanner.tsx?raw';

describe('OfflineBanner', () => {
  it('uses the $online Nano Store', () => {
    expect(source).toMatch(/\$online/);
    expect(source).toMatch(/useStore/);
  });

  it('returns null when online (and until hydrated — roadmap #045)', () => {
    expect(source).toMatch(/if\s*\(\s*!hydrated\s*\|\|\s*online\s*\)\s*return\s*null/);
    expect(source).toContain('useHydrated()');
  });

  it('sets aria-live="polite" + role="status"', () => {
    expect(source).toMatch(/role=["']status["']/);
    expect(source).toMatch(/aria-live=["']polite["']/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });
});
