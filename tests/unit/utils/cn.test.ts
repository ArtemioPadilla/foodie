import { describe, it, expect } from 'vitest';
import { cn } from '@utils/cn';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isHidden = false;
    expect(cn('base', isActive && 'conditional', isHidden && 'hidden')).toBe('base conditional');
  });

  it('merges Tailwind classes correctly', () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('handles objects with boolean values', () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe('class1 class3');
  });

  it('removes duplicate classes', () => {
    expect(cn('class1', 'class2', 'class1')).toBe('class2 class1');
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
    const isVisible = true;
    const result = cn(
      'base-class',
      isVisible && 'conditional',
      { active: true, disabled: false },
      ['array1', 'array2'],
      'final-class'
    );
    expect(result).toContain('base-class');
    expect(result).toContain('conditional');
    expect(result).toContain('active');
    expect(result).toContain('array1');
    expect(result).toContain('array2');
    expect(result).toContain('final-class');
    expect(result).not.toContain('disabled');
  });

  it('returns empty string when no classes provided', () => {
    expect(cn()).toBe('');
  });

  it('handles only falsy values', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
