import { describe, expect, it } from 'vitest';
import {
  cleanIngredientId,
  CUSTOM_ID_PREFIX,
  isCustomIngredient,
  makeCustomIngredientId,
  slugifyItemName,
} from './ingredient-id';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('makeCustomIngredientId', () => {
  it('builds custom-<uuid>-<slug>', () => {
    expect(makeCustomIngredientId('Oat Milk', UUID)).toBe(`custom-${UUID}-oat-milk`);
  });

  it('mints a distinct id per call for the same name', () => {
    const a = makeCustomIngredientId('milk');
    const b = makeCustomIngredientId('milk');
    expect(a).not.toBe(b);
    expect(a.startsWith(CUSTOM_ID_PREFIX)).toBe(true);
    expect(cleanIngredientId(a)).toBe('milk');
  });
});

describe('slugifyItemName', () => {
  it('drops accents and punctuation', () => {
    expect(slugifyItemName('  Crème fraîche (bio)! ')).toBe('creme-fraiche-bio');
  });

  it('never returns an empty slug', () => {
    expect(slugifyItemName('¡¿!?')).toBe('item');
  });
});

describe('isCustomIngredient', () => {
  it('recognises both the Issue 026 and the PR #28 shapes', () => {
    expect(isCustomIngredient(`custom-${UUID}-milk`)).toBe(true);
    expect(isCustomIngredient(`custom_${UUID}_milk`)).toBe(true);
    expect(isCustomIngredient('ing_001')).toBe(false);
    expect(isCustomIngredient('tomato')).toBe(false);
  });
});

describe('cleanIngredientId (PR #28 ingredientUtils)', () => {
  it('removes the custom prefix and the unique part', () => {
    expect(cleanIngredientId(`custom-${UUID}-oat-milk`)).toBe('oat-milk');
    expect(cleanIngredientId(`custom_${UUID}_milk`)).toBe('milk');
    expect(cleanIngredientId('custom_1700000000000_k3j4h5g_bread')).toBe('bread');
  });

  it('leaves regular ids untouched', () => {
    expect(cleanIngredientId('tomato')).toBe('tomato');
    expect(cleanIngredientId('ing_001')).toBe('ing_001');
  });
});
