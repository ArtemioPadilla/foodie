import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';

export default function PlannerPage() {
  const { t } = useTranslation();

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <Calendar className="h-16 w-16 text-primary-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('planner.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Create and manage your weekly meal plans. Coming soon!
        </p>
      </div>
    </div>
  );
}
