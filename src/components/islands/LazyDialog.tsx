import * as React from 'react';

/**
 * Defers a self-contained dialog — one component holding its own
 * `DialogTrigger` and popup — until its trigger is first pressed (roadmap
 * Issue 045, per-page script budgets). Until then `placeholder` renders a
 * look-alike trigger button (same variant, label, icon and `data-testid`);
 * pressing it loads the real component, which `children` renders with
 * `defaultOpen` so the dialog opens straight away. The swap happens inside
 * the calling island, so the Dialog compound still shares one React root.
 *
 * `children` must be the `React.lazy` component rendered with `defaultOpen`.
 */
export interface LazyDialogProps {
  /** Look-alike trigger; call `open` from its `onClick`. */
  placeholder: (open: () => void) => React.ReactElement;
  children: React.ReactNode;
}

const noop = () => {};

export function LazyDialog({ placeholder, children }: LazyDialogProps) {
  const [wanted, setWanted] = React.useState(false);
  if (!wanted) return placeholder(() => setWanted(true));
  return <React.Suspense fallback={placeholder(noop)}>{children}</React.Suspense>;
}
