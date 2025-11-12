import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';

export default function ShoppingListPage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <ShoppingCart className="h-16 w-16 text-primary-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('shopping.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Generate and manage your shopping lists. Coming soon!
        </p>
      </div>
    </div>
  );
}
