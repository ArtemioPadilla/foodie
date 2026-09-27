import { Menu } from 'lucide-react';
import type { Locale } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * MobileNav — the small-screen menu of SiteHeader (roadmap Issue 005).
 *
 * A single island wraps the whole compound component (Sheet + Trigger +
 * Content) because Base UI context cannot span islands. The Astro parent
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
  repoUrl: string;
  labels: {
    open: string;
    close: string;
    title: string;
    description: string;
    github: string;
  };
}

export default function MobileNav({ lang, items, repoUrl, labels }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9" aria-label={labels.open} data-testid="mobile-nav-trigger" />}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" lang={lang} className="w-72 gap-2 p-5" data-testid="mobile-nav">
        <SheetHeader>
          <SheetTitle className="font-display">{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-0.5" aria-label={labels.title}>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={
                item.active
                  ? 'rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary'
                  : 'rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent'
              }
            >
              {item.label}
            </a>
          ))}
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-md border-t border-border px-3 pt-3 pb-2 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            {labels.github} ↗
          </a>
        </nav>
        <SheetClose render={<Button variant="outline" className="mt-auto" />}>{labels.close}</SheetClose>
      </SheetContent>
    </Sheet>
  );
}
