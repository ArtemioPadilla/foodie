// @vitest-environment jsdom
import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecipeTimer } from './RecipeTimer';

/** RecipeTimer (roadmap Issue 018): per-step countdown in a Dialog + notification. */
describe('RecipeTimer', () => {
  const NotificationMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    NotificationMock.mockClear();
    Object.assign(NotificationMock, { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') });
    vi.stubGlobal('Notification', NotificationMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders nothing while closed', () => {
    render(<RecipeTimer open={false} onOpenChange={() => {}} minutes={1} stepLabel="Step 1" lang="en" />);
    expect(screen.queryByTestId('recipe-timer')).not.toBeInTheDocument();
  });

  it('counts down, pauses, resets and notifies when time is up', () => {
    render(<RecipeTimer open onOpenChange={() => {}} minutes={0.05} stepLabel="Step 2" lang="en" tickMs={10} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Timer for Step 2')).toBeInTheDocument();
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:03');

    fireEvent.click(screen.getByTestId('timer-start'));
    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:02');

    fireEvent.click(screen.getByTestId('timer-toggle')); // pause
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:02');

    fireEvent.click(screen.getByTestId('timer-reset'));
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:03');

    fireEvent.click(screen.getByTestId('timer-start'));
    act(() => vi.advanceTimersByTime(10));
    act(() => vi.advanceTimersByTime(10));
    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByTestId('timer-display')).toHaveTextContent('00:00');
    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    expect(NotificationMock).toHaveBeenCalledWith("Time's up!", expect.objectContaining({ body: 'Step 2 is done.' }));
  });
});
