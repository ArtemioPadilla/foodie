import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ContributionWizard, RecipeFormData } from '@components/contribute/ContributionWizard';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@components/common/Button';

export default function ContributePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (recipeData: RecipeFormData) => {
    console.log('Recipe submitted:', recipeData);
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
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            {t('contribute.submissionSuccess', 'Your recipe has been submitted and will be reviewed shortly. Check your GitHub for the pull request.')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/recipes')}
            >
              {t('contribute.browseRecipes', 'Browse Recipes')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setSubmitted(false)}
            >
              {t('contribute.submitAnother', 'Submit Another Recipe')}
            </Button>
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
        <p className="text-gray-600 dark:text-gray-400">
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
