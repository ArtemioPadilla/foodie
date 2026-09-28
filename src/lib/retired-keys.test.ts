// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_GITHUB_TOKEN_KEY, RETIRED_KEYS, purgeRetiredKeys } from './retired-keys';

beforeEach(() => localStorage.clear());

describe('purgeRetiredKeys (ADR 0002 §3, roadmap #039)', () => {
  it('removes the v1 GitHub token and nothing else', () => {
    localStorage.setItem(LEGACY_GITHUB_TOKEN_KEY, 'gho_fixture');
    localStorage.setItem('favoriteRecipes', '["r1"]');
    expect(purgeRetiredKeys()).toEqual([LEGACY_GITHUB_TOKEN_KEY]);
    expect(localStorage.getItem(LEGACY_GITHUB_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('favoriteRecipes')).toBe('["r1"]');
    expect(purgeRetiredKeys()).toEqual([]);
  });

  it('never throws when storage is unavailable', () => {
    const broken = {
      getItem() {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(purgeRetiredKeys(broken)).toEqual([]);
    expect(purgeRetiredKeys(null)).toEqual([]);
  });

  it('runs on every page: BaseLayout calls it', () => {
    const layout = readFileSync(resolve(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf-8');
    expect(layout).toMatch(/import \{ purgeRetiredKeys \} from '@\/lib\/retired-keys';\s*[\s\S]*purgeRetiredKeys\(\);/);
    expect(RETIRED_KEYS).toContain(LEGACY_GITHUB_TOKEN_KEY);
  });
});
