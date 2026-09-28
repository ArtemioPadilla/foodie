// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeBadge } from './TimeBadge';

/** TimeBadge (roadmap Issue 021). */
describe('TimeBadge', () => {
  it('renders minutes with the localised abbreviation and a decorative icon', () => {
    const { container } = render(<TimeBadge minutes={25} lang="fr" />);
    const badge = screen.getByTestId('time-badge');
    expect(badge).toHaveTextContent('25 min');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives the number context through a title and a visually hidden label', () => {
    render(<TimeBadge minutes={40} lang="es" label="Tiempo total" />);
    const badge = screen.getByTestId('time-badge');
    expect(badge).toHaveAttribute('title', 'Tiempo total');
    expect(badge).toHaveTextContent('Tiempo total: 40 min');
    expect(screen.getByText('Tiempo total:', { exact: false })).toHaveClass('sr-only');
  });

  it('the badge appearance is an outline kit Badge', () => {
    render(<TimeBadge minutes={10} appearance="badge" iconClassName="size-3" />);
    const badge = screen.getByTestId('time-badge');
    expect(badge).toHaveClass('rounded-full', 'border-border');
    expect(badge.querySelector('svg')).toHaveClass('size-3');
  });
});
