import { useTranslation } from 'react-i18next';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useRecipes } from '@contexts/RecipeContext';
import { User, Mail, Calendar, Heart, Settings, LogOut, Moon, Sun, Globe } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@components/common';
import { AuthModal } from '@components/auth/AuthModal';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, signOut, updatePreferences } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, changeLanguage } = useLanguage();
  const { recipes, favoriteRecipes } = useRecipes();
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // Get favorite recipe objects
  const favoriteRecipeObjects = recipes.filter(r => favoriteRecipes.includes(r.id));

  // Sign out handler
  const handleSignOut = async () => {
    if (window.confirm(t('profile.confirmSignOut', 'Are you sure you want to sign out?'))) {
      await signOut();
    }
  };

  // If not authenticated, show sign in prompt
  if (!isAuthenticated || !user) {
    return (
      <>
        <div className="container-custom py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="h-24 w-24 text-gray-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('profile.signInRequired', 'Sign In Required')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('profile.signInDescription', 'Sign in to access your profile, favorites, and meal plans.')}
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                onClick={() => {
                  setAuthModalTab('signin');
                  setShowAuthModal(true);
                }}
                className="w-full"
              >
                {t('auth.signIn', 'Sign In')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
                className="w-full"
              >
                {t('auth.signUp', 'Sign Up')}
              </Button>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab={authModalTab}
        />
      </>
    );
  }

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('profile.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('profile.subtitle', 'Manage your account settings and preferences.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="text-center">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {user.displayName}
              </h2>
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-500 text-xs">
                <Calendar className="w-3 h-3" />
                <span>
                  {t('profile.memberSince', 'Member since')}{' '}
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t('profile.stats', 'Statistics')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('profile.favorites', 'Favorites')}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {favoriteRecipes.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Sign Out Button */}
          <Button
            variant="danger"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('auth.signOut', 'Sign Out')}
          </Button>
        </div>

        {/* Right Column - Settings & Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preferences */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('profile.preferences', 'Preferences')}
                </h3>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? t('common.done', 'Done') : t('common.edit', 'Edit')}
              </Button>
            </div>

            <div className="space-y-6">
              {/* Theme */}
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('settings.theme', 'Theme')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {theme === 'dark' ? t('settings.darkMode', 'Dark Mode') : t('settings.lightMode', 'Light Mode')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.change', 'Change')}
                </button>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t('settings.language', 'Language')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {language === 'en' && 'English'}
                      {language === 'es' && 'Español'}
                      {language === 'fr' && 'Français'}
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex flex-col">
                    <label
                      htmlFor="profile-language-select"
                      className="mb-1 text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {t('settings.language', 'Language')}
                    </label>
                    <select
                      id="profile-language-select"
                      value={language}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Default Servings */}
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {t('settings.defaultServings', 'Default Servings')}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {user.preferences.defaultServings} {t('common.servings', 'servings')}
                  </div>
                </div>
                {isEditing && (
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={user.preferences.defaultServings}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 12) {
                        updatePreferences({ defaultServings: value });
                      }
                    }}
                    aria-label={t('settings.defaultServings', 'Default Servings')}
                    className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                )}
              </div>

              {/* Dietary Restrictions */}
              <div className="py-3">
                <div className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('settings.dietaryRestrictions', 'Dietary Restrictions')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.preferences.dietaryRestrictions.length > 0 ? (
                    user.preferences.dietaryRestrictions.map((restriction) => (
                      <span
                        key={restriction}
                        className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                      >
                        {restriction}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('settings.noDietaryRestrictions', 'No dietary restrictions set')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Favorite Recipes */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.favoriteRecipes', 'Favorite Recipes')}
              </h3>
            </div>

            {favoriteRecipeObjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  {t('profile.noFavorites', 'No favorite recipes yet. Start exploring!')}
                </p>
                <Button
                  variant="primary"
                  onClick={() => (window.location.href = '/recipes')}
                  className="mt-4"
                >
                  {t('profile.browseRecipes', 'Browse Recipes')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoriteRecipeObjects.slice(0, 6).map((recipe) => (
                  <a
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {recipe.imageUrl && (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name.en}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {recipe.name[language as keyof typeof recipe.name] || recipe.name.en}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {recipe.totalTime} {t('common.minutes', 'min')}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {favoriteRecipeObjects.length > 6 && (
              <div className="mt-4 text-center">
                <Link
                  to="/recipes?filter=favorites"
                  className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                >
                  {t('profile.viewAllFavorites', 'View all favorites')} ({favoriteRecipes.length})
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
