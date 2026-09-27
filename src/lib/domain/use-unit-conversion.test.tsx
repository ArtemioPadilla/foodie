// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { resetPreferences, setUnitSystem } from '@/stores/preferences';
import type { ResolvedUnitSystem } from './units';
import { useUnitConversion } from './use-unit-conversion';

function Fixture({ override }: { override?: ResolvedUnitSystem }) {
  const { convert, preferredSystem, unitSystemPreference, detectedSystem } =
    useUnitConversion(override);
  const lb = convert(1, 'lb');
  return (
    <output data-testid="out">
      {`${unitSystemPreference}|${detectedSystem}|${preferredSystem}|${lb.quantity}|${lb.unit}|${lb.formatted}`}
    </output>
  );
}

const read = () => screen.getByTestId('out').textContent!.split('|');

afterEach(() => {
  act(() => resetPreferences());
  localStorage.clear();
});

describe('useUnitConversion', () => {
  it('resolves `auto` from the browser locale after hydration (jsdom is en-US → imperial)', () => {
    render(<Fixture />);
    const [pref, detected, system, qty, unit] = read();
    expect(pref).toBe('auto');
    expect(detected).toBe('imperial');
    expect(system).toBe('imperial');
    expect(qty).toBe('1');
    expect(unit).toBe('lb');
  });

  it('follows the $preferences store reactively (no useAuth)', () => {
    render(<Fixture />);
    act(() => setUnitSystem('metric'));
    const [pref, , system, qty, unit, formatted] = read();
    expect(pref).toBe('metric');
    expect(system).toBe('metric');
    expect(unit).toBe('kg');
    expect(Number(qty)).toBeCloseTo(0.4536, 3);
    expect(formatted).toBe('½');
  });

  it('lets a per-view override win over the stored preference', () => {
    act(() => setUnitSystem('metric'));
    render(<Fixture override="imperial" />);
    const [pref, , system, , unit] = read();
    expect(pref).toBe('metric');
    expect(system).toBe('imperial');
    expect(unit).toBe('lb');
  });
});
