// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { t } from '@/i18n';
import { DIETARY_LABEL_KEYS, DietaryBadges } from './DietaryBadges';

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

  it('keeps DIETARY_LABEL_KEYS order regardless of the object key order', () => {
    const shuffled = { whole30: true, keto: true, dairyFree: true, vegan: true, paleo: false, lowCarb: false, glutenFree: true, vegetarian: false };
    render(<DietaryBadges labels={shuffled} max={8} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    const expected = DIETARY_LABEL_KEYS.filter((k) => shuffled[k]).map((k) => t('en', `dietary.${k}`));
    expect(items).toEqual(expected);
    expect(items[0]).toBe('Vegan');
  });

  it.each(['en', 'es', 'fr'] as const)('localises every label in %s (no raw keys)', (lang) => {
    const all = Object.fromEntries(DIETARY_LABEL_KEYS.map((k) => [k, true])) as Parameters<typeof DietaryBadges>[0]['labels'];
    render(<DietaryBadges labels={all} lang={lang} max={DIETARY_LABEL_KEYS.length} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items).toHaveLength(DIETARY_LABEL_KEYS.length);
    expect(items).toEqual(DIETARY_LABEL_KEYS.map((k) => t(lang, `dietary.${k}`)));
    for (const text of items) expect(text).not.toMatch(/^dietary\./);
  });

  it('uses Spanish labels in order with the overflow summary', () => {
    render(<DietaryBadges labels={{ ...none, glutenFree: true, vegetarian: true, dairyFree: true }} lang="es" max={2} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([t('es', 'dietary.vegetarian'), t('es', 'dietary.glutenFree'), '+1']);
    expect(screen.getByText('+1')).toHaveAttribute('aria-label', t('es', 'dietary.dairyFree'));
  });
});
