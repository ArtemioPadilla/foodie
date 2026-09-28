// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { excerptToText } from './search-excerpt';

describe('excerptToText', () => {
  it('keeps the text of a Pagefind excerpt and drops the <mark> tags', () => {
    expect(excerptToText('Whisk the <mark>eggs</mark> with sugar')).toBe('Whisk the eggs with sugar');
  });

  it('decodes entities instead of showing them raw', () => {
    expect(excerptToText('Salt &amp; pepper, chef&#39;s choice')).toBe("Salt & pepper, chef's choice");
  });

  it('leaves no markup behind for nested or split tags', () => {
    const text = excerptToText('<scr<script>ipt>alert(1)</script> ok <img src=x onerror=alert(1)>');
    expect(text).not.toMatch(/<\s*script/i);
    expect(text).not.toContain('<img');
    expect(text).toContain('ok');
  });

  it('collapses whitespace', () => {
    expect(excerptToText('  a\n\n  <mark>b</mark>\t c ')).toBe('a b c');
  });
});
