import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberField } from '@/components/ui/number-field';
import { t, type Locale } from '@/i18n';
import { addDaysToKey } from '@/lib/format-date';
import type { TrackingEntry } from '@/schemas';
import { formatAmount } from './labels';

/**
 * Per-entry dialogs of the tracking island (roadmap Issue 031): edit the
 * amount (`number-field`), copy to another day, and the confirmed delete
 * (`alert-dialog`, replacing legacy `window.confirm`). Each composition is
 * whole inside this file and rendered in the `TrackingToday` root. They are
 * controlled by the entry they act on: `null` → closed.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function EditEntryDialog({
  lang,
  entry,
  name,
  onClose,
  onSave,
}: {
  lang: Locale;
  entry: TrackingEntry | null;
  name: string;
  onClose: () => void;
  onSave: (quantity: number) => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="edit-entry-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'tracking.editEntry')}</DialogTitle>
          <DialogDescription>
            {name} — {t(lang, 'tracking.editQuantityDescription')}
          </DialogDescription>
        </DialogHeader>
        {entry ? <EditEntryForm lang={lang} entry={entry} onSave={onSave} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditEntryForm({ lang, entry, onSave }: { lang: Locale; entry: TrackingEntry; onSave: (quantity: number) => void }) {
  const isRecipe = Boolean(entry.recipeId);
  const [quantity, setQuantity] = React.useState(isRecipe ? (entry.servings ?? entry.quantity) : entry.quantity);
  const labelId = React.useId();
  const unit = isRecipe ? t(lang, 'tracking.servings') : `${t(lang, 'tracking.quantity')} (${entry.unit})`;
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (quantity > 0) onSave(quantity);
      }}
      data-testid="edit-entry-form"
    >
      <div className="grid gap-1.5">
        <Label id={labelId}>{unit}</Label>
        <NumberField
          aria-labelledby={labelId}
          value={quantity}
          onValueChange={(v) => setQuantity(v ?? 0)}
          min={isRecipe ? 0.5 : 0.1}
          step={isRecipe ? 0.5 : 1}
          max={10000}
          locale={lang === 'es' ? 'es-419' : lang}
        />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</DialogClose>
        <Button type="submit" disabled={!(quantity > 0)} data-testid="save-entry">
          {t(lang, 'common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DuplicateEntryDialog({
  lang,
  entry,
  name,
  defaultDate,
  onClose,
  onDuplicate,
}: {
  lang: Locale;
  entry: TrackingEntry | null;
  name: string;
  /** Day the entry is shown on; the copy defaults to the next day. */
  defaultDate: string;
  onClose: () => void;
  onDuplicate: (date: string) => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="duplicate-entry-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'tracking.duplicateEntry')}</DialogTitle>
          <DialogDescription>
            {name} — {t(lang, 'tracking.duplicateDescription')}
          </DialogDescription>
        </DialogHeader>
        {entry ? <DuplicateForm lang={lang} initial={addDaysToKey(defaultDate, 1)} onDuplicate={onDuplicate} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DuplicateForm({ lang, initial, onDuplicate }: { lang: Locale; initial: string; onDuplicate: (date: string) => void }) {
  const [date, setDate] = React.useState(initial);
  const id = React.useId();
  const valid = DATE_KEY.test(date);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onDuplicate(date);
      }}
      data-testid="duplicate-entry-form"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{t(lang, 'tracking.duplicateToDate')}</Label>
        <Input id={id} type="date" value={date} onChange={(event) => setDate(event.target.value)} required data-testid="duplicate-date" />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</DialogClose>
        <Button type="submit" disabled={!valid} data-testid="confirm-duplicate">
          {t(lang, 'tracking.duplicate')}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteEntryDialog({
  lang,
  entry,
  name,
  onClose,
  onConfirm,
}: {
  lang: Locale;
  entry: TrackingEntry | null;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-testid="delete-entry-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t(lang, 'tracking.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(lang, 'tracking.deleteConfirmBody', { name })}
            {entry ? ` (${formatAmount(entry.nutrition.calories, lang)} ${t(lang, 'nutrition.kcal')})` : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm} data-testid="confirm-delete-entry">
            {t(lang, 'common.delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
