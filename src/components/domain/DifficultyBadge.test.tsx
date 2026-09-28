// @vitest-environment jsdom
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DIFFICULTY_CLASS, DifficultyBadge } from './DifficultyBadge';

/** DifficultyBadge (roadmap Issue 021). */
describe('DifficultyBadge', () => {
  it.each([
    ['easy', 'en', 'Easy'],
    ['medium', 'es', 'Media'],
    ['hard', 'fr', 'Difficile'],
  ] as const)('%s in %s reads "%s"', (difficulty, lang, label) => {
    render(<DifficultyBadge difficulty={difficulty} lang={lang} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveAttribute('data-difficulty', difficulty);
    for (const cls of DIFFICULTY_CLASS[difficulty].split(' ')) expect(badge).toHaveClass(cls);
  });
});
