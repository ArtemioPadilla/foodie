import * as React from 'react';
import { ClipboardCopyIcon, DownloadIcon, FileTextIcon, MessageCircleIcon, PrinterIcon, SheetIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipboardButton } from '@/components/ui/clipboard';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DownloadTrigger } from '@/components/ui/download-trigger';
import { toast } from '@/components/ui/toast';
import { t, type Locale } from '@/i18n';
import {
  exportAsCSV,
  exportAsText,
  exportForWhatsApp,
  localizeShoppingList,
  whatsappShareUrl,
  type ExportLabels,
} from '@/lib/domain/shopping';
import type { ResolvedUnitSystem } from '@/lib/domain/units';
import type { ShoppingListItem } from '@/schemas';

export interface ExportDialogProps {
  lang: Locale;
  items: ReadonlyArray<ShoppingListItem>;
  /** Unit system the exports are written in (the one on screen). */
  system: ResolvedUnitSystem;
  labels: ExportLabels;
  disabled?: boolean;
}

/**
 * Export options of the shopping list (port of legacy `ExportOptions`,
 * roadmap Issue 026). Every format is written in the page locale and the
 * user's unit system:
 *
 * - **Text** — `.txt` through `DownloadTrigger`, or copied with `ClipboardButton`.
 * - **CSV** — `.csv` (UTF-8 with BOM so spreadsheet apps read accents) through `DownloadTrigger`.
 * - **WhatsApp** — a plain link to `https://wa.me/?text=…`: the list leaves the
 *   device only when the user follows it and then sends the message
 *   themselves (ADR 0002, "Where else data can go").
 * - **Print** — `window.print()`; the page's `@media print` rules keep only the list.
 */
export function ExportDialog({ lang, items, system, labels, disabled }: ExportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const exports = React.useMemo(() => {
    if (!open) return null;
    const localized = localizeShoppingList(items, system);
    return {
      text: exportAsText(localized, labels),
      csv: exportAsCSV(localized, labels),
      whatsapp: exportForWhatsApp(localized, labels),
    };
  }, [open, items, system, labels]);
  const fileName = t(lang, 'shopping.fileName');
  const onError = () => toast({ title: t(lang, 'shopping.exportFailed'), data: { variant: 'destructive' } });

  const print = () => {
    setOpen(false);
    // Let the dialog unmount before the print snapshot is taken.
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} data-testid="export-menu" />}>
        <DownloadIcon className="size-4" aria-hidden="true" />
        {t(lang, 'shopping.export')}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'shopping.exportOptions')}</DialogTitle>
          <DialogDescription>{t(lang, 'shopping.exportDescription')}</DialogDescription>
        </DialogHeader>

        {exports ? (
          <ul className="grid gap-3">
            <ExportOption icon={<FileTextIcon />} title={t(lang, 'shopping.textFile')} description={t(lang, 'shopping.textDescription')}>
              <DownloadTrigger
                size="sm"
                filename={`${fileName}.txt`}
                label={t(lang, 'shopping.downloadText')}
                onExport={async () => new Blob([exports.text], { type: 'text/plain;charset=utf-8' })}
                onError={onError}
                data-testid="export-text"
              />
            </ExportOption>

            <ExportOption icon={<SheetIcon />} title={t(lang, 'shopping.csvFile')} description={t(lang, 'shopping.csvDescription')}>
              <DownloadTrigger
                size="sm"
                filename={`${fileName}.csv`}
                label={t(lang, 'shopping.downloadCsv')}
                onExport={async () => new Blob(['\uFEFF', exports.csv], { type: 'text/csv;charset=utf-8' })}
                onError={onError}
                data-testid="export-csv"
              />
            </ExportOption>

            <ExportOption
              icon={<MessageCircleIcon />}
              title={t(lang, 'shopping.whatsapp')}
              description={t(lang, 'shopping.whatsappOpenDescription')}
            >
              <Button asChild size="sm" variant="outline">
                <a href={whatsappShareUrl(exports.whatsapp)} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-share">
                  <MessageCircleIcon className="size-4" aria-hidden="true" />
                  {t(lang, 'shopping.openWhatsApp')}
                  <span className="sr-only"> {t(lang, 'shopping.opensInNewTab')}</span>
                </a>
              </Button>
            </ExportOption>

            <ExportOption icon={<PrinterIcon />} title={t(lang, 'shopping.print')} description={t(lang, 'shopping.printDescription')}>
              <Button type="button" size="sm" variant="outline" onClick={print} data-testid="print-list">
                <PrinterIcon className="size-4" aria-hidden="true" />
                {t(lang, 'shopping.printNow')}
              </Button>
            </ExportOption>

            <ExportOption
              icon={<ClipboardCopyIcon />}
              title={t(lang, 'shopping.clipboardTitle')}
              description={t(lang, 'shopping.clipboardDescription')}
            >
              <ClipboardButton
                value={exports.text}
                size="sm"
                label={t(lang, 'shopping.copyToClipboard')}
                aria-label={t(lang, 'shopping.copyToClipboard')}
                title={t(lang, 'shopping.copyToClipboard')}
                onCopied={() => toast({ title: t(lang, 'shopping.copied') })}
                className="w-auto px-3"
                data-testid="copy-list"
              />
            </ExportOption>
          </ul>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>{t(lang, 'common.close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportOption({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}
