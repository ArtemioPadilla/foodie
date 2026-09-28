// @vitest-environment jsdom
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServingsAdjuster } from './ServingsAdjuster';

/** ServingsAdjuster (roadmap Issue 018, port of legacy `RecipeScaler`). */
describe('ServingsAdjuster', () => {
  function Harness({ initial = 2, onChange }: { initial?: number; onChange?: (n: number) => void }) {
    const [servings, setServings] = React.useState(initial);
    return (
      <ServingsAdjuster
        servings={servings}
        originalServings={2}
        onChange={(n) => {
          setServings(n);
          onChange?.(n);
        }}
        lang="en"
        max={4}
      />
    );
  }

  it('is a labelled group with −/＋ buttons and the current value', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Servings' })).toBeInTheDocument();
    expect(screen.getByTestId('servings-value')).toHaveTextContent('2');
    expect(screen.queryByTestId('servings-factor')).not.toBeInTheDocument();
  });

  it('increments, shows the scale factor and resets to the recipe yield', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    expect(screen.getByTestId('servings-value')).toHaveTextContent('3');
    expect(screen.getByTestId('servings-factor')).toHaveTextContent('×1.5');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('servings-value')).toHaveTextContent('2');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('disables the buttons at the bounds', () => {
    render(<Harness initial={1} />);
    expect(screen.getByRole('button', { name: 'Decrease servings' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase servings' }));
    expect(screen.getByTestId('servings-value')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: 'Increase servings' })).toBeDisabled();
  });
});
