import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppProvider } from '@contexts/AppContext';
import { RecipeProvider } from '@contexts/RecipeContext';
import { IngredientProvider } from '@contexts/IngredientContext';
import { PlannerProvider } from '@contexts/PlannerContext';
import { ShoppingProvider } from '@contexts/ShoppingContext';
import { PantryProvider } from '@contexts/PantryContext';
import { AuthProvider } from '@contexts/AuthContext';
import { LanguageProvider } from '@contexts/LanguageContext';
import { ThemeProvider } from '@contexts/ThemeContext';

// Layout (not lazy loaded as they're needed immediately)
import Header from '@components/layout/Header';
import Footer from '@components/layout/Footer';

// Lazy load pages for better performance
const HomePage = lazy(() => import('@pages/HomePage'));
const RecipesPage = lazy(() => import('@pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('@pages/RecipeDetailPage'));
const IngredientsPage = lazy(() => import('@pages/IngredientsPage'));
const PlannerPage = lazy(() => import('@pages/PlannerPage'));
const ShoppingListPage = lazy(() => import('@pages/ShoppingListPage'));
const ContributePage = lazy(() => import('@pages/ContributePage'));
const PantryPage = lazy(() => import('@pages/PantryPage'));
const ProfilePage = lazy(() => import('@pages/ProfilePage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <RecipeProvider>
              <IngredientProvider>
              <PlannerProvider>
                <ShoppingProvider>
                  <PantryProvider>
                  <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
                    <Header />
                    <main className="flex-1">
                      <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                        </div>
                      }>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/recipes" element={<RecipesPage />} />
                          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                          <Route path="/ingredients" element={<IngredientsPage />} />
                          <Route path="/planner" element={<PlannerPage />} />
                          <Route path="/shopping" element={<ShoppingListPage />} />
                          <Route path="/contribute" element={<ContributePage />} />
                          <Route path="/pantry" element={<PantryPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </main>
                    <Footer />
                  </div>
                  </PantryProvider>
                </ShoppingProvider>
              </PlannerProvider>
              </IngredientProvider>
            </RecipeProvider>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
