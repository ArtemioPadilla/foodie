import { describe, expect, it } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('uses the legacy <prefix>_<timestamp>_<random> shape', () => {
    expect(generateId('pantry', 1700000000000)).toMatch(/^pantry_1700000000000_[a-z0-9]{1,7}$/);
  });

  it('is unique across calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId('tracking')));
    expect(ids.size).toBe(50);
  });
});
