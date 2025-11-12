import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Spinner } from '@components/common';
import { cn } from '@utils/cn';
import { RecipeFormData } from './ContributionWizard';
import { validateRecipeFormData, ValidationResult } from '@services/validationService';
import { transformAndSerializeRecipe } from '@services/recipeTransformService';
import { getGitHubService, PRResult } from '@services/githubService';

export interface SubmitStepProps {
  data: RecipeFormData;
  onBack: () => void;
  onSuccess: (prUrl: string, prNumber: number) => void;
  className?: string;
}

type SubmitState = 'validating' | 'ready' | 'authenticating' | 'submitting' | 'success' | 'error';

/**
 * Final submit step - GitHub authentication and PR creation
 */
export const SubmitStep: React.FC<SubmitStepProps> = ({
  data,
  onBack,
  onSuccess,
  className,
}) => {
  const { t } = useTranslation();
  const [submitState, setSubmitState] = useState<SubmitState>('validating');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [prResult, setPrResult] = useState<PRResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validate on mount
  useEffect(() => {
    const result = validateRecipeFormData(data);
    setValidation(result);
    setSubmitState(result.valid ? 'ready' : 'error');

    // Check if already authenticated
    try {
      const githubService = getGitHubService();
      setIsAuthenticated(githubService.isAuthenticated());
    } catch {
      setIsAuthenticated(false);
    }
  }, [data]);

  const handleGitHubAuth = () => {
    setSubmitState('authenticating');

    // In a real implementation, this would redirect to GitHub OAuth
    // For now, we'll show a placeholder
    alert(
      'GitHub OAuth not implemented yet.\n\n' +
      'In production, this would redirect to GitHub OAuth flow:\n' +
      '1. Redirect to GitHub authorization URL\n' +
      '2. User authorizes the app\n' +
      '3. GitHub redirects back with code\n' +
      '4. Exchange code for access token\n' +
      '5. Store token securely\n\n' +
      'For testing, you can manually set a GitHub personal access token\n' +
      'in the environment variables (VITE_GITHUB_TOKEN).'
    );

    // Check for token in environment (development only)
    const token = (import.meta as any).env?.VITE_GITHUB_TOKEN;
    if (token) {
      try {
        const githubService = getGitHubService();
        githubService.authenticate(token);
        setIsAuthenticated(true);
        setSubmitState('ready');
      } catch (error) {
        console.error('Authentication failed:', error);
        setSubmitState('error');
        setPrResult({
          success: false,
          error: 'Authentication failed. Please try again.',
        });
      }
    } else {
      setSubmitState('ready');
    }
  };

  const handleSubmit = async () => {
    if (!validation?.valid) {
      return;
    }

    setSubmitState('submitting');

    try {
      // Transform recipe data
      const { recipeId, recipeJson } = transformAndSerializeRecipe(
        data,
        'Anonymous Contributor' // Would use authenticated user's name
      );

      // Submit via GitHub service
      const githubService = getGitHubService();

      if (!githubService.isAuthenticated()) {
        setPrResult({
          success: false,
          error: 'Not authenticated. Please sign in with GitHub first.',
        });
        setSubmitState('error');
        return;
      }

      const result = await githubService.submitRecipe({
        recipeId,
        recipeJson,
        contributorName: 'Anonymous Contributor', // Would use authenticated user's name
      });

      setPrResult(result);

      if (result.success && result.prUrl && result.prNumber) {
        setSubmitState('success');
        onSuccess(result.prUrl, result.prNumber);
      } else {
        setSubmitState('error');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      setPrResult({
        success: false,
        error: error?.message || 'An unexpected error occurred',
      });
      setSubmitState('error');
    }
  };

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('contribute.submit', 'Submit Recipe')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t(
              'contribute.submitDescription',
              'Final validation and submission to GitHub'
            )}
          </p>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('contribute.validationResults', 'Validation Results')}
            </h3>

            {validation.valid && validation.warnings.length === 0 ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    {t('contribute.validationSuccess', 'All validation checks passed!')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {validation.errors.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {t('contribute.validationErrors', '{{count}} Error(s)', {
                          count: validation.errors.length,
                        })}
                      </p>
                    </div>
                    <ul className="ml-7 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700 dark:text-red-300">
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {t('contribute.validationWarnings', '{{count}} Warning(s)', {
                          count: validation.warnings.length,
                        })}
                      </p>
                    </div>
                    <ul className="ml-7 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* GitHub Authentication */}
        {validation?.valid && !isAuthenticated && submitState !== 'submitting' && submitState !== 'success' && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('contribute.githubAuth', 'GitHub Authentication Required')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'contribute.githubAuthDescription',
                'Sign in with GitHub to submit your recipe as a pull request'
              )}
            </p>
            <Button
              variant="primary"
              onClick={handleGitHubAuth}
              disabled={submitState === 'authenticating'}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {submitState === 'authenticating'
                ? t('common.loading', 'Loading...')
                : t('contribute.signInGitHub', 'Sign in with GitHub')}
            </Button>
          </div>
        )}

        {/* Submit Section */}
        {validation?.valid && isAuthenticated && submitState !== 'success' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-2 mb-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t(
                    'contribute.submitInfo',
                    'Your recipe will be submitted as a pull request to the Foodie repository. Once approved, it will be available to all users!'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {submitState === 'success' && prResult?.success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex gap-2 mb-3">
              <svg
                className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                  {t('contribute.submitSuccess', 'Recipe Submitted Successfully!')}
                </h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-3">
                  {t(
                    'contribute.submitSuccessDescription',
                    'Thank you for contributing! Your pull request has been created.'
                  )}
                </p>
                {prResult.prUrl && (
                  <a
                    href={prResult.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
                  >
                    {t('contribute.viewPullRequest', 'View Pull Request')} #{prResult.prNumber}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {submitState === 'error' && prResult?.error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                  {t('contribute.submitError', 'Submission Failed')}
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200">{prResult.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={submitState === 'submitting'}
          >
            {t('common.back', 'Back')}
          </Button>

          {submitState !== 'success' && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!validation?.valid || !isAuthenticated || submitState === 'submitting'}
            >
              {submitState === 'submitting' ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {t('contribute.submitting', 'Submitting...')}
                </>
              ) : (
                t('contribute.createPullRequest', 'Create Pull Request')
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

SubmitStep.displayName = 'SubmitStep';
