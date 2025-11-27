import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Cloud } from 'lucide-react';
import type { MealPlan } from '@/types';
import { getSharedPlanFromFirebase } from '@services/firebaseService';
import { safeGetItem } from '@utils/storage';

export default function SharedPlanPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedFromCloud, setLoadedFromCloud] = useState(false);

  useEffect(() => {
    async function loadSharedPlan() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Try to load from Firebase first
        const cloudPlan = await getSharedPlanFromFirebase(token);
        if (cloudPlan) {
          setPlan(cloudPlan);
          setLoadedFromCloud(true);
          setLoading(false);
          return;
        }

        // Fall back to localStorage if Firebase is unavailable
        const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
        const localPlan = savedPlans.find(
          (p: MealPlan) => p.shareToken === token && p.isPublic
        );

        setPlan(localPlan || null);
        setLoadedFromCloud(false);
      } catch (error) {
        console.error('Error loading shared plan:', error);
        // Fall back to localStorage on error
        const savedPlans = safeGetItem<MealPlan[]>('savedMealPlans', []);
        const localPlan = savedPlans.find(
          (p: MealPlan) => p.shareToken === token && p.isPublic
        );
        setPlan(localPlan || null);
        setLoadedFromCloud(false);
      } finally {
        setLoading(false);
      }
    }

    loadSharedPlan();
  }, [token]);

  if (loading) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('planner.planNotFound')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('planner.planNotFoundDesc')}
          </p>
          <Link to="/planner" className="btn-primary">
            {t('planner.createYourOwn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft className="h-5 w-5" />
        {t('common.backToHome')}
      </Link>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            {t('planner.viewingSharedPlan')}
          </p>
          {loadedFromCloud && (
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <Cloud className="h-4 w-4" />
              <span>{t('planner.loadedFromCloud', 'Loaded from cloud')}</span>
            </div>
          )}
        </div>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        {plan.name.en}
      </h1>

      {/* Display plan content here - reuse existing components */}
      {/* For MVP, show a simplified view */}
      <div className="card p-6">
        <p className="text-gray-600 dark:text-gray-400">
          {plan.description.en}
        </p>
        {/* TODO: Add MealPlannerCalendar component in read-only mode */}
      </div>
    </div>
  );
}
