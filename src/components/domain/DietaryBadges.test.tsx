// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DietaryBadges } from './DietaryBadges';

const none = { glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false };

describe('DietaryBadges', () => {
  it('renders nothing when no flag is set', () => {
    const { container } = render(<DietaryBadges labels={none} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the true flags in display order, localised, collapsing the overflow', () => {
    render(<DietaryBadges labels={{ ...none, vegan: true, vegetarian: true, keto: true, paleo: true }} lang="fr" max={2} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Végétarien', 'Végétalien', '+2']);
    expect(screen.getByText('+2')).toHaveAttribute('aria-label', 'Keto, Paleo');
  });
});
