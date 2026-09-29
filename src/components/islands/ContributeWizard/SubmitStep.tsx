import * as React from 'react';
import { CheckCircle2Icon, ExternalLinkIcon, InfoIcon, PaperclipIcon, SendIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DownloadTrigger } from '@/components/ui/download-trigger';
import { localizedRoute, t, type Locale } from '@/i18n';
import type { RecipeSubmissionPayload } from '@/schemas';
import { buildRecipeSubmissionIssue } from '@/lib/domain/recipe-submission-issue';
import { downloadFile } from '@/lib/download';
import { withBase } from '@/lib/href';
import { openIssueUrl } from '@/lib/report-issue';

/**
 * Step 7 — sending without secrets (roadmap Issue 039, D10). "Submit" opens
 * the `recipe-submission.yml` issue form on GitHub prefilled with the recipe
 * (`lib/domain/recipe-submission-issue.ts` → `lib/report-issue.ts`) and
 * downloads `recipe-<id>.json`. When the JSON would push the link past 8 KB
 * the form asks for the downloaded file instead, and this step says so up
 * front. Nothing is sent from the browser and no token is involved: the
 * contributor files the issue on github.com with their own account.
 * `onSubmitted` (clears the saved draft) runs once the issue tab is opened.
 *
 * Without a configured repository (PUBLIC_REPO_SLUG unset — the default and
 * the production build, ADR 0015) there is no issue to open: the step keeps
 * the JSON download, says in neutral words that submissions by link are not
 * open yet, and shows no Submit button (`data-submit-mode="download"`).
 */
export interface SubmitStepProps {
  lang: Locale;
  payload: RecipeSubmissionPayload;
  /** Called once the prefilled issue is opened (the wizard then clears the draft). */
  onSubmitted: () => void;
}

export type SubmitStepComponent = React.ComponentType<SubmitStepProps>;

export function SubmitStep({ lang, payload, onSubmitted }: SubmitStepProps) {
  const issue = React.useMemo(() => buildRecipeSubmissionIssue(payload), [payload]);
  const [sent, setSent] = React.useState(false);
  const issueUrl = issue.url;

  const submit = () => {
    if (issueUrl === null) return;
    // Open first: the new tab must come straight from the click (popup blockers).
    openIssueUrl(issueUrl);
    downloadFile(issue.filename, payload.recipeJson);
    setSent(true);
    onSubmitted();
  };

  const download = (
    <DownloadTrigger
      filename={issue.filename}
      label={t(lang, 'contribute.downloadJson')}
      onExport={async () => new Blob([payload.recipeJson], { type: 'application/json' })}
      data-testid="contribute-download-json"
    />
  );

  const recipeJson = (
    <details className="rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{t(lang, 'contribute.recipeJson')}</summary>
      <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-xs" data-testid="contribute-recipe-json">
        {payload.recipeJson}
      </pre>
    </details>
  );

  if (issueUrl === null) {
    return (
      <div
        className="grid gap-6"
        data-testid="contribute-step-submit"
        data-submit-mode="download"
        data-recipe-id={payload.recipeId}
        data-json-in-url="false"
        data-sent="false"
      >
        <Alert data-testid="contribute-submit-unavailable">
          <InfoIcon className="size-4" aria-hidden="true" />
          <AlertTitle>{t(lang, 'contribute.submitUnavailableTitle')}</AlertTitle>
          <AlertDescription>{t(lang, 'contribute.submitUnavailable', { file: issue.filename })}</AlertDescription>
        </Alert>
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-foreground" data-testid="contribute-submit-steps">
          <li>{t(lang, 'contribute.submitStepDownload', { file: issue.filename })}</li>
          <li>{t(lang, 'contribute.submitStepKeep')}</li>
        </ol>
        {recipeJson}
        <div className="flex flex-wrap items-center gap-3">{download}</div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-6"
      data-testid="contribute-step-submit"
      data-submit-mode="issue"
      data-recipe-id={payload.recipeId}
      data-json-in-url={issue.jsonInUrl ? 'true' : 'false'}
      data-sent={sent ? 'true' : 'false'}
    >
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.submitInfo')}</p>
      <ol className="grid list-decimal gap-1 pl-5 text-sm text-foreground" data-testid="contribute-submit-steps">
        <li>{t(lang, 'contribute.submitStepDownload', { file: issue.filename })}</li>
        <li>{t(lang, 'contribute.submitStepIssue')}</li>
        <li>{t(lang, 'contribute.submitStepReview')}</li>
      </ol>

      {!issue.jsonInUrl && (
        <Alert data-testid="contribute-submit-attach">
          <PaperclipIcon className="size-4" aria-hidden="true" />
          <AlertTitle>{t(lang, 'contribute.submitAttachTitle')}</AlertTitle>
          <AlertDescription>{t(lang, 'contribute.submitAttach', { file: issue.filename })}</AlertDescription>
        </Alert>
      )}

      {recipeJson}

      {sent && (
        <Alert variant="success" data-testid="contribute-submit-sent">
          <CheckCircle2Icon className="size-4" aria-hidden="true" />
          <AlertTitle>{t(lang, 'contribute.submitSuccess')}</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>{t(lang, 'contribute.submitSuccessDescription', { file: issue.filename })}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                data-testid="contribute-issue-link"
              >
                {t(lang, 'contribute.openIssueAgain')}
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
              <a href={withBase(localizedRoute('/contribute/', lang))} className="font-medium underline underline-offset-4">
                {t(lang, 'contribute.submitAnother')}
              </a>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submit} data-testid="contribute-submit">
          <SendIcon aria-hidden="true" />
          {t(lang, 'contribute.submitRecipe')}
        </Button>
        {download}
      </div>
    </div>
  );
}
