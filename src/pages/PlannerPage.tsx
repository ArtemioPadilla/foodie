import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MealPlannerCalendar } from '@components/planner/MealPlannerCalendar';

export default function PlannerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('planner.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('planner.subtitle', 'Plan your meals for the week and generate shopping lists automatically.')}
        </p>
      </div>

      <MealPlannerCalendar onRecipeClick={handleRecipeClick} />
    </div>
  );
}
