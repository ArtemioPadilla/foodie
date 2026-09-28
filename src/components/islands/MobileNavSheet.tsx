import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { MobileNavProps } from './MobileNav';

/**
 * The popup half of `MobileNav` (roadmap Issues 005, 045): a controlled Sheet
 * loaded with `React.lazy` on the first tap of the trigger, rendered inside
 * the MobileNav island (never hydrated on its own). Focus returns to the
 * trigger on close through `finalFocus`.
 */
export interface MobileNavSheetProps extends MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: React.RefObject<HTMLButtonElement | null>;
}

export default function MobileNavSheet({ lang, items, repoUrl, labels, open, onOpenChange, finalFocus }: MobileNavSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" lang={lang} className="w-72 gap-2 p-5" data-testid="mobile-nav" finalFocus={finalFocus}>
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
