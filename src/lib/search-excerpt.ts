/**
 * Plain text of a Pagefind excerpt (roadmap Issue 047, CodeQL
 * js/incomplete-multi-character-sanitization).
 *
 * Pagefind returns excerpts as HTML — escaped page text with `<mark>` around
 * the hits. The palette shows them as text, so instead of stripping tags with
 * a regex (which `<scr<script>ipt>`-style input defeats) the excerpt is parsed
 * by the browser's HTML parser into an inert document (DOMParser never runs
 * scripts or loads resources) and only its text content is kept. Entities
 * (`&amp;`, `&#39;`) come back decoded, which a tag-strip never did.
 */
export function excerptToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
