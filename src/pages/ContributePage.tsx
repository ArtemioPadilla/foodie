import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';

export default function ContributePage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <PlusCircle className="h-16 w-16 text-primary-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('contribute.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Contribute your favorite recipes to the community. Coming soon!
        </p>
      </div>
    </div>
  );
}
