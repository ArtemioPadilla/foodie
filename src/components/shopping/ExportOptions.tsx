import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShopping } from '@contexts/ShoppingContext';
import { Button } from '@components/common';
import { exportAsText, exportAsCSV, exportForWhatsApp } from '@services/shoppingService';
import { cn } from '@utils/cn';

export interface ExportOptionsProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Export options modal for shopping list (Print, CSV, WhatsApp)
 */
export const ExportOptions: React.FC<ExportOptionsProps> = ({ onClose, className }) => {
  const { t } = useTranslation();
  const { shoppingList } = useShopping();
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleExport = (format: 'text' | 'csv' | 'whatsapp') => {
    let content: string;

    switch (format) {
      case 'csv':
        content = exportAsCSV(shoppingList);
        break;
      case 'whatsapp':
        content = exportForWhatsApp(shoppingList);
        break;
      case 'text':
      default:
        content = exportAsText(shoppingList);
        break;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    });
  };

  const handlePrint = () => {
    const content = exportAsText(shoppingList);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shopping List</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: monospace;
                font-size: 14px;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = (format: 'text' | 'csv') => {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      content = exportAsCSV(shoppingList);
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      content = exportAsText(shoppingList);
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shopping-list.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('shopping.exportOptions', 'Export Options')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('shopping.exportDescription', 'Choose how to export your shopping list')}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Print */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('shopping.print', 'Print')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('shopping.printDescription', 'Print a formatted shopping list')}
              </p>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                {t('shopping.printNow', 'Print Now')}
              </Button>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('shopping.text', 'Text File')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('shopping.textDescription', 'Download or copy as plain text')}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleDownload('text')}>
                  {t('common.download', 'Download')}
                </Button>
                <Button
                  variant={copiedFormat === 'text' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleExport('text')}
                >
                  {copiedFormat === 'text'
                    ? t('common.copied', 'Copied!')
                    : t('common.copy', 'Copy')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CSV */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('shopping.csv', 'CSV File')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('shopping.csvDescription', 'Download for Excel or Google Sheets')}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleDownload('csv')}>
                  {t('common.download', 'Download')}
                </Button>
                <Button
                  variant={copiedFormat === 'csv' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  {copiedFormat === 'csv'
                    ? t('common.copied', 'Copied!')
                    : t('common.copy', 'Copy')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('shopping.whatsapp', 'WhatsApp')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('shopping.whatsappDescription', 'Copy formatted for WhatsApp')}
              </p>
              <Button
                variant={copiedFormat === 'whatsapp' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleExport('whatsapp')}
              >
                {copiedFormat === 'whatsapp'
                  ? t('common.copied', 'Copied!')
                  : t('common.copyForWhatsApp', 'Copy for WhatsApp')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      )}
    </div>
  );
};

ExportOptions.displayName = 'ExportOptions';
