import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    // eslint-disable-next-line no-constant-binary-expression -- intentional: testing that cn() drops falsy values
    expect(cn('a', false && 'b', null, undefined, '')).toBe('a');
  });

  it('merges conflicting Tailwind utilities (tailwind-merge)', () => {
    // tailwind-merge keeps the last conflicting class
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('flattens arrays', () => {
    expect(cn(['a', 'b'], ['c'])).toBe('a b c');
  });

  it('handles object form', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c');
  });
});

// ── Roadmap Issue 014: legacy Foodie `tests/unit/utils/cn.test.ts` (12) ──────
// `@utils/cn` is gone; the template's `lib/utils` `cn` is the single helper.

describe('cn utility (legacy Foodie suite)', () => {
  it('merges class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const isActive = true as boolean;
    const isHidden = false as boolean;
    expect(cn('base', isActive && 'conditional', isHidden && 'hidden')).toBe('base conditional');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('handles objects with boolean values', () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
  });

  it('handles duplicate non-conflicting classes', () => {
    expect(cn('class1', 'class2', 'class1')).toBe('class1 class2 class1');
  });

  it('handles undefined and null values', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });

  it('handles empty strings', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });

  it('handles complex Tailwind merging', () => {
    expect(cn('px-4 py-2', 'px-8')).toBe('py-2 px-8');
    expect(cn('bg-red-500 hover:bg-red-600', 'bg-blue-500')).toBe('hover:bg-red-600 bg-blue-500');
  });

  it('combines multiple utility patterns', () => {
    const isVisible = true as boolean;
    const result = cn('base-class', isVisible && 'conditional', { active: true, disabled: false }, ['array1', 'array2'], 'final-class');
    for (const cls of ['base-class', 'conditional', 'active', 'array1', 'array2', 'final-class']) expect(result).toContain(cls);
    expect(result).not.toContain('disabled');
  });

  it('returns empty string when no classes provided', () => {
    expect(cn()).toBe('');
  });

  it('handles only falsy values', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
