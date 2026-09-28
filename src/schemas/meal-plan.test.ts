import { describe, expect, it } from 'vitest';
import { PLAN_TEMPLATE_NAME_MAX, PlanTemplateFormSchema, planTemplateFormSchema } from './index';

describe('PlanTemplateFormSchema (roadmap #025)', () => {
  it('trims the name and rejects blank or over-long names', () => {
    expect(PlanTemplateFormSchema.parse({ name: '  Busy week  ' })).toEqual({ name: 'Busy week' });
    expect(PlanTemplateFormSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(PlanTemplateFormSchema.safeParse({ name: 'x'.repeat(PLAN_TEMPLATE_NAME_MAX) }).success).toBe(true);
    expect(PlanTemplateFormSchema.safeParse({ name: 'x'.repeat(PLAN_TEMPLATE_NAME_MAX + 1) }).success).toBe(false);
  });

  it('carries the caller’s localised messages', () => {
    const schema = planTemplateFormSchema({ required: 'Ponle nombre', tooLong: 'Demasiado largo' });
    const blank = schema.safeParse({ name: '' });
    expect(blank.success ? '' : blank.error.issues[0]?.message).toBe('Ponle nombre');
    const long = schema.safeParse({ name: 'x'.repeat(PLAN_TEMPLATE_NAME_MAX + 1) });
    expect(long.success ? '' : long.error.issues[0]?.message).toBe('Demasiado largo');
  });
});
