import { useTranslation } from 'react-i18next';
import { ShoppingList } from '@components/shopping/ShoppingList';

export default function ShoppingListPage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('shopping.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('shopping.subtitle', 'Manage your shopping list and check off items as you shop.')}
        </p>
      </div>

      <ShoppingList />
    </div>
  );
}
