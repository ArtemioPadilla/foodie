import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChefHat, Calendar, ShoppingCart, Package, Star, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ChefHat,
      title: 'Browse Recipes',
      description: 'Discover delicious recipes from cuisines around the world',
      link: '/recipes',
    },
    {
      icon: Calendar,
      title: 'Plan Your Meals',
      description: 'Create weekly meal plans with drag-and-drop simplicity',
      link: '/planner',
    },
    {
      icon: ShoppingCart,
      title: 'Shopping Lists',
      description: 'Auto-generate organized shopping lists from your meal plans',
      link: '/shopping',
    },
    {
      icon: Package,
      title: 'Manage Pantry',
      description: 'Track ingredients and get recipe suggestions based on what you have',
      link: '/pantry',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-20">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('app.name')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-50">
              {t('app.tagline')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/recipes"
                className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-lg"
              >
                Browse Recipes
              </Link>
              <Link
                to="/planner"
                className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors border-2 border-white"
              >
                Create Meal Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Everything You Need for Meal Planning
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="card p-6 hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-4">
                      <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex justify-center mb-4">
                <ChefHat className="h-12 w-12 text-primary-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">100+</div>
              <div className="text-gray-600 dark:text-gray-400">Recipes Available</div>
            </div>
            <div>
              <div className="flex justify-center mb-4">
                <Star className="h-12 w-12 text-accent-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">4.8</div>
              <div className="text-gray-600 dark:text-gray-400">Average Rating</div>
            </div>
            <div>
              <div className="flex justify-center mb-4">
                <TrendingUp className="h-12 w-12 text-primary-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">3+</div>
              <div className="text-gray-600 dark:text-gray-400">Languages Supported</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Planning?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are simplifying their meal planning with Foodie
          </p>
          <Link
            to="/contribute"
            className="inline-block px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-lg"
          >
            Contribute a Recipe
          </Link>
        </div>
      </section>
    </div>
  );
}
