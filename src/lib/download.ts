/**
 * Save `content` as a file through the standard anchor-download trick (the
 * same one the kit's `DownloadTrigger` uses), for flows that download as a
 * side effect of another action — e.g. the contribute wizard's "Submit"
 * (roadmap Issue 039), which downloads `recipe-<id>.json` and opens the
 * prefilled GitHub issue in one click. No-op outside the browser.
 */
export function downloadFile(filename: string, content: Blob | string, type = 'application/json'): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}
