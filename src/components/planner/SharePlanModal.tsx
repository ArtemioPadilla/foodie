import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Share2, Check, CloudUpload } from 'lucide-react';
import type { MealPlan } from '@/types';
import { sharePlanToFirebase } from '@services/firebaseService';
import { useToast } from '@components/common/Toast';
import { useLanguage } from '@contexts/LanguageContext';

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MealPlan | null;
  onGenerateToken: () => void;
  shareToken?: string;
}

export function SharePlanModal({
  isOpen,
  onClose,
  plan,
  onGenerateToken,
  shareToken
}: SharePlanModalProps) {
  const { t } = useTranslation();
  const { getTranslated } = useLanguage();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [uploadingToCloud, setUploadingToCloud] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  const handleUploadToFirebase = useCallback(async () => {
    if (!plan || !shareToken || cloudSynced || uploadingToCloud) return;

    setUploadingToCloud(true);
    try {
      const success = await sharePlanToFirebase(plan, shareToken);
      if (success) {
        setCloudSynced(true);
        toast.success(t('planner.planSharedToCloud', 'Plan synced to cloud successfully'));
      } else {
        toast.warning(t('planner.cloudSyncFailed', 'Cloud sync unavailable. Link will work locally.'));
      }
    } catch (error) {
      console.error('Failed to upload to Firebase:', error);
      toast.warning(t('planner.cloudSyncFailed', 'Cloud sync unavailable. Link will work locally.'));
    } finally {
      setUploadingToCloud(false);
    }
  }, [plan, shareToken, cloudSynced, uploadingToCloud, toast, t]);

  useEffect(() => {
    if (shareToken) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/shared/plan/${shareToken}`;
      setShareUrl(url);

      // Auto-upload to Firebase when share token is generated
      handleUploadToFirebase();
    }
  }, [shareToken, handleUploadToFirebase]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(
        t('planner.copyError', 'Failed to copy to clipboard. Please copy the link manually.')
      );
      // Clear error after 5 seconds
      setTimeout(() => setCopyError(null), 5000);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share && plan) {
      try {
        const planName = getTranslated(plan.name);
        await navigator.share({
          title: planName,
          text: t('planner.shareText', { name: planName }),
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('planner.sharePlan')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {!shareToken ? (
          <div className="text-center py-8">
            <button
              onClick={onGenerateToken}
              className="btn-primary"
              data-testid="generate-share-link"
            >
              {t('planner.generateShareLink')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('planner.shareLink')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="input flex-1"
                  data-testid="share-url-input"
                />
                <button
                  onClick={handleCopyLink}
                  className="btn-secondary flex items-center gap-2"
                  data-testid="copy-link-button"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t('common.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t('common.copy')}
                    </>
                  )}
                </button>
              </div>

              {/* Error message */}
              {copyError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                  {copyError}
                </div>
              )}

              {/* Cloud sync status */}
              <div className="mt-2 flex items-center gap-2 text-sm">
                {uploadingToCloud ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-blue-600 dark:text-blue-400">
                      {t('planner.syncingToCloud', 'Syncing to cloud...')}
                    </span>
                  </>
                ) : cloudSynced ? (
                  <>
                    <CloudUpload className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400">
                      {t('planner.cloudSynced', 'Cloud synced')}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleWebShare}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                {t('planner.shareVia')}
              </button>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <strong>{t('common.note')}:</strong> {t('planner.shareNote')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
