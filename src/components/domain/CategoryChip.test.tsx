// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryChip, FOOD_CATEGORY_CLASSES, FOOD_CATEGORY_IDS, categoryClasses } from './CategoryChip';

/** CategoryChip (roadmap Issue 021): identity colour + always-visible label. */
describe('CategoryChip', () => {
  it('maps every food category to its --color-food-* token classes', () => {
    for (const id of FOOD_CATEGORY_IDS) {
      expect(FOOD_CATEGORY_CLASSES[id]).toEqual({ dot: `bg-food-${id}`, stripe: `border-l-food-${id}` });
      expect(categoryClasses(id)).toBe(FOOD_CATEGORY_CLASSES[id]);
    }
  });

  it('falls back to neutral kit colours for unknown categories', () => {
    expect(categoryClasses('nope')).toEqual({ dot: 'bg-muted-foreground', stripe: 'border-l-border' });
  });

  it('renders a decorative dot next to the visible label (colour is never the only cue)', () => {
    const { container } = render(<CategoryChip category="dairy" label="Lácteos" />);
    const chip = screen.getByText('Lácteos');
    expect(chip).toHaveAttribute('data-category', 'dairy');
    expect(chip).toHaveAttribute('data-appearance', 'dot');
    const dot = container.querySelector('.bg-food-dairy');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('the chip appearance is a bordered pill with kit text colours', () => {
    render(<CategoryChip category="spices" label="Spices" appearance="chip" />);
    const chip = screen.getByText('Spices');
    expect(chip).toHaveAttribute('data-appearance', 'chip');
    expect(chip).toHaveClass('rounded-full', 'border-border', 'text-foreground');
  });
});
