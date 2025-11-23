import { useTranslation } from 'react-i18next';
import { PantryInventory } from '@components/pantry/PantryInventory';

export default function PantryPage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('pantry.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('pantry.subtitle', 'Track your pantry inventory and get notified when items are expiring.')}
        </p>
      </div>

      <PantryInventory />
    </div>
  );
}
