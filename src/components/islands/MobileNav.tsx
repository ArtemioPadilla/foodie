import * as React from 'react';
import { Menu } from 'lucide-react';
import type { Locale } from '@/i18n';
import { Button } from '@/components/ui/button';

/**
 * The Sheet (Base UI Dialog: scroll lock, focus trap, portal) is fetched the
 * first time the menu opens, not on every page load (roadmap Issue 045 —
 * script budgets). It renders inside this island's React root, so the Dialog
 * compound still lives in one island.
 */
const MobileNavSheet = React.lazy(() => import('./MobileNavSheet'));

/**
 * MobileNav — the small-screen menu of SiteHeader (roadmap Issue 005).
 *
 * A single island wraps the whole compound component because Base UI
 * context cannot span islands: the trigger here and the lazily loaded
 * `MobileNavSheet` (controlled Sheet + content) share one React root. The Astro parent
 * resolves every href (base + locale) and every label at build time, so the
 * island never reads `navigator.language` and only receives serialisable
 * props. `lang` is forwarded to the popup so screen readers announce the
 * links in the right language.
 */
export interface MobileNavItem {
  href: string;
  label: string;
  active?: boolean;
}

export interface MobileNavProps {
  lang: Locale;
  items: MobileNavItem[];
  /** Repository URL, or `null` when the build names no repo (ADR 0015): no link then. */
  repoUrl: string | null;
  labels: {
    open: string;
    close: string;
    title: string;
    description: string;
    github: string;
  };
}

export default function MobileNav({ lang, items, repoUrl, labels }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  // Mount (and so fetch) the sheet on first open; keep it mounted afterwards
  // so the close animation plays and reopening is instant.
  const [wanted, setWanted] = React.useState(false);
  if (open && !wanted) setWanted(true);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label={labels.open}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="mobile-nav-trigger"
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" />
      </Button>
      {wanted ? (
        <React.Suspense fallback={null}>
          <MobileNavSheet
            lang={lang}
            items={items}
            repoUrl={repoUrl}
            labels={labels}
            open={open}
            onOpenChange={setOpen}
            finalFocus={triggerRef}
          />
        </React.Suspense>
      ) : null}
    </>
  );
}
