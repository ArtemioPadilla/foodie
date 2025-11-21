import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useTheme } from '@contexts/ThemeContext';
import { useLanguage } from '@contexts/LanguageContext';
import { useRecipes } from '@contexts/RecipeContext';
import { User, Mail, Calendar, Heart, Settings, LogOut, Moon, Sun, Globe } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '@components/common';
import { AuthModal } from '@components/auth/AuthModal';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { favorites } = useRecipes();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <User className="h-16 w-16 text-primary-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            {t('profile.signInPrompt')}
          </p>
          <Button onClick={() => setShowAuthModal(true)}>
            {t('auth.signIn')}
          </Button>
          {showAuthModal && (
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('profile.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <User className="h-6 w-6 text-primary-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.accountInfo')}
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-700 dark:text-gray-300">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('profile.memberSince', {
                    date: new Date(user.metadata.creationTime || '').toLocaleDateString()
                  })}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Heart className="h-6 w-6 text-primary-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.favorites')}
              </h2>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                {t('profile.favoritesCount', { count: favorites.length })}
              </p>
              <Link
                to="/recipes?filter=favorites"
                className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t('profile.viewFavorites')}
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-6 w-6 text-primary-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.preferences')}
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.theme')}
                </label>
                <Button
                  variant="outline"
                  onClick={toggleTheme}
                  className="w-full justify-start"
                >
                  {theme === 'dark' ? (
                    <>
                      <Moon className="h-5 w-5 mr-2" />
                      {t('profile.darkMode')}
                    </>
                  ) : (
                    <>
                      <Sun className="h-5 w-5 mr-2" />
                      {t('profile.lightMode')}
                    </>
                  )}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.language')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <LogOut className="h-6 w-6 text-primary-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.account')}
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {t('auth.signOut')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
