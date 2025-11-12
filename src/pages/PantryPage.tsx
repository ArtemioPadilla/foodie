import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';

export default function PantryPage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <Package className="h-16 w-16 text-primary-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('pantry.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Manage your pantry inventory and track expiration dates. Coming soon!
        </p>
      </div>
    </div>
  );
}
