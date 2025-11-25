import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ContributionWizard, RecipeFormData } from '@components/contribute/ContributionWizard';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function ContributePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (_recipeData: RecipeFormData) => {
    // Recipe submitted successfully
    // Show success state
    setSubmitted(true);
  };

  const handleCancel = () => {
    if (window.confirm(t('contribute.confirmCancel', 'Are you sure you want to cancel? Your progress will be lost.'))) {
      navigate('/recipes');
    }
  };

  // Success state after submission
  if (submitted) {
    return (
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-24 w-24 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('contribute.thankYou', 'Thank You!')}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            {t('contribute.submissionSuccess', 'Your recipe has been submitted and will be reviewed shortly. Check your GitHub for the pull request.')}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={() => navigate('/recipes')}
            >
              {t('contribute.browseRecipes', 'Browse Recipes')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
              }}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('contribute.submitAnother', 'Submit Another Recipe')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('contribute.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {t('contribute.subtitle', 'Share your favorite recipes with the community through a simple step-by-step process.')}
        </p>
      </div>

      <ContributionWizard
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
