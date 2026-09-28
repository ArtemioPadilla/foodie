import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { describeModules, describeSchema, collectSchemaNames } from './schema-reference';

// The same glob the /docs/reference/api/ page uses (roadmap Issue 043).
const modules = import.meta.glob<Record<string, unknown>>(
  ['../../schemas/*.ts', '!../../schemas/*.test.ts'],
  { eager: true },
);

describe('schema reference (roadmap #043)', () => {
  const docs = describeModules(modules);
  const all = docs.flatMap((m) => m.schemas);
  const byName = new Map(all.map((s) => [s.name, s]));

  it('documents every module of src/schemas except the barrel', () => {
    const names = docs.map((m) => m.module);
    expect(names).not.toContain('index');
    for (const mod of ['recipe', 'ingredient', 'meal-plan', 'shopping', 'pantry', 'tracking', 'preferences']) {
      expect(names).toContain(mod);
    }
  });

  it('documents every exported *Schema exactly once', () => {
    const exported = new Set<string>();
    for (const [path, exports] of Object.entries(modules)) {
      if (path.endsWith('/index.ts')) continue;
      for (const [name, value] of Object.entries(exports)) {
        if (name.endsWith('Schema') && typeof value === 'object' && value !== null && '_zod' in value) exported.add(name);
      }
    }
    expect(all.map((s) => s.name).sort()).toEqual([...exported].sort());
  });

  it('renders RecipeSchema as a field table with references to nested schemas', () => {
    const recipe = byName.get('RecipeSchema')!;
    expect(recipe.kind).toBe('object');
    const field = (n: string) => recipe.fields.find((f) => f.name === n)!;
    expect(field('id')).toMatchObject({ type: 'string', required: true });
    expect(field('id').constraints).toContain('min length 1');
    expect(field('nutrition')).toMatchObject({ type: 'NutritionInfoSchema', refs: ['NutritionInfoSchema'] });
    expect(field('type').type).toBe('MealTypeSchema');
    expect(field('ingredients').type).toBe('RecipeIngredientSchema[]');
    expect(field('tips').required).toBe(false);
    expect(field('dateAdded').constraints).toContain('format date');
    expect(field('servings').type).toBe('integer');
  });

  it('lists enum values', () => {
    expect(byName.get('MealTypeSchema')).toMatchObject({
      kind: 'enum',
      values: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'],
    });
  });

  it('summarises arrays, records and tuples', () => {
    expect(byName.get('SavedMealPlansSchema')).toMatchObject({ kind: 'array', type: 'MealPlanSchema[]' });
    expect(byName.get('CustomPricesSchema')).toMatchObject({ kind: 'record', type: 'Record<string, CustomPriceSchema>' });
    expect(byName.get('SharedSlotSchema')?.kind).toBe('tuple');
  });

  it('marks fields with a default as optional on input and shows the default', () => {
    const S = z.object({ unit: z.enum(['metric', 'imperial']).default('metric') });
    const doc = describeSchema('S', S, collectSchemaNames({ m: { S } }));
    expect(doc.fields[0]).toMatchObject({ name: 'unit', required: false, type: '"metric" | "imperial"' });
    expect(doc.fields[0]?.constraints).toContain('default "metric"');
  });
});
