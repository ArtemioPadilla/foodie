import { describe, expect, it } from 'vitest';
import source from './InstallButton.tsx?raw';

describe('InstallButton', () => {
  it('uses $installPrompt store', () => {
    expect(source).toMatch(/\$installPrompt/);
    expect(source).toMatch(/useStore/);
  });

  it('returns null when no prompt is captured (and until hydrated — roadmap #045)', () => {
    expect(source).toMatch(/if\s*\(\s*!hydrated\s*\|\|\s*!prompt\s*\)\s*return\s*null/);
    expect(source).toContain('useHydrated()');
  });

  it('calls prompt() and userChoice', () => {
    expect(source).toMatch(/prompt\.prompt\(\)/);
    expect(source).toMatch(/userChoice/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });
});
