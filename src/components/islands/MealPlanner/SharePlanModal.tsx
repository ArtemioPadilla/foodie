import * as React from 'react';
import { MessageCircleIcon, Share2Icon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import { whatsappShareUrl } from '@/lib/domain/shopping';
import { drawQr, encodeQr } from '@/lib/qr';
import type { MealPlan } from '@/schemas';
import { getMealCount } from '@/stores/planner';

export interface SharePlanModalProps {
  lang: Locale;
  plan: MealPlan;
}

/**
 * SharePlanModal — "Share plan" button + `Dialog` of the planner toolbar
 * (roadmap Issue 040, D11; ADR 0013; port of PR #28's `SharePlanModal`
 * without Firestore). The link carries the plan in its fragment
 * (`/plan/shared/#p=…`, built by `lib/domain/plan-share.ts`, which is loaded
 * with a dynamic `import()` when the dialog opens so the planner island does
 * not ship the compressor up front). Actions: copy (`ClipboardButton`),
 * WhatsApp (`wa.me`), the Web Share sheet when the browser has one, and a QR
 * code drawn on a `<canvas>` by the dependency-free `lib/qr.ts`.
 *
 * Trigger and content live in this one component inside the `MealPlanner`
 * island (compound components never span islands).
 */
export function SharePlanModal({ lang, plan }: SharePlanModalProps) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [canShare, setCanShare] = React.useState(false);
  const qrRef = React.useRef<HTMLCanvasElement>(null);
  const planName = getTranslated(plan.name, lang);
  const empty = getMealCount(plan) === 0;

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl(null);
      setFailed(false);
      setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
    setOpen(next);
  };

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    import('@/lib/domain/plan-share')
      .then(({ sharePlanUrl }) => {
        if (!cancelled) setUrl(sharePlanUrl(plan, lang, window.location.origin));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, plan, lang]);

  React.useEffect(() => {
    const canvas = qrRef.current;
    if (!url || !canvas) return;
    const matrix = encodeQr(url);
    if (matrix) drawQr(canvas, matrix);
  }, [url]);

  const shareText = url ? t(lang, 'planner.shareWhatsAppText', { name: planName, url }) : '';

  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: planName, text: shareText, url });
    } catch {
      // Dismissed or unsupported target: nothing to report.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" data-testid="share-plan-button" />}>
        <Share2Icon className="size-4" aria-hidden="true" />
        {t(lang, 'planner.sharePlan')}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" data-testid="share-plan-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'planner.shareMealPlan')}</DialogTitle>
          <DialogDescription>{t(lang, 'planner.shareDialogDescription')}</DialogDescription>
        </DialogHeader>

        {failed ? (
          <p role="alert" className="text-sm text-destructive" data-testid="share-error">
            {t(lang, 'planner.shareError')}
          </p>
        ) : !url ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner label={t(lang, 'planner.sharePreparing')} />
            <span aria-hidden="true">{t(lang, 'planner.sharePreparing')}</span>
          </p>
        ) : (
          <div className="grid gap-4" data-testid="share-plan-ready">
            {empty && (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground" data-testid="share-empty-plan">
                {t(lang, 'planner.shareEmptyPlan')}
              </p>
            )}
            <div className="grid gap-2">
              <label htmlFor="share-plan-url" className="text-sm font-medium text-foreground">
                {t(lang, 'planner.shareLinkLabel')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="share-plan-url"
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                  data-testid="share-url-input"
                />
                <ClipboardButton
                  value={url}
                  label={t(lang, 'planner.copyShareLink')}
                  onCopied={() => toast({ title: t(lang, 'planner.shareLinkCopied') })}
                  data-testid="copy-link-button"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp">
                  <MessageCircleIcon className="size-4" aria-hidden="true" />
                  {t(lang, 'planner.shareWhatsApp')}
                </a>
              </Button>
              {canShare && (
                <Button type="button" variant="outline" size="sm" onClick={nativeShare} data-testid="share-native">
                  <Share2Icon className="size-4" aria-hidden="true" />
                  {t(lang, 'planner.shareNative')}
                </Button>
              )}
            </div>

            <figure className="grid justify-items-center gap-2">
              <canvas
                ref={qrRef}
                role="img"
                aria-label={t(lang, 'planner.shareQrLabel')}
                className="size-48 rounded-md border border-border bg-white [image-rendering:pixelated]"
                data-testid="share-qr"
              />
              <figcaption className="text-xs text-muted-foreground">{t(lang, 'planner.shareQrHint')}</figcaption>
            </figure>

            <p className="text-xs text-muted-foreground" data-testid="share-privacy">
              {t(lang, 'planner.sharePrivacy')}
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>{t(lang, 'common.close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
