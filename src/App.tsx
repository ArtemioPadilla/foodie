import { Routes, Route } from 'react-router-dom';
import { AppProvider } from '@contexts/AppContext';
import { RecipeProvider } from '@contexts/RecipeContext';
import { PlannerProvider } from '@contexts/PlannerContext';
import { ShoppingProvider } from '@contexts/ShoppingContext';
import { AuthProvider } from '@contexts/AuthContext';
import { LanguageProvider } from '@contexts/LanguageContext';
import { ThemeProvider } from '@contexts/ThemeContext';

// Pages
import HomePage from '@pages/HomePage';
import RecipesPage from '@pages/RecipesPage';
import RecipeDetailPage from '@pages/RecipeDetailPage';
import PlannerPage from '@pages/PlannerPage';
import ShoppingListPage from '@pages/ShoppingListPage';
import ContributePage from '@pages/ContributePage';
import PantryPage from '@pages/PantryPage';
import ProfilePage from '@pages/ProfilePage';
import NotFoundPage from '@pages/NotFoundPage';

// Layout
import Header from '@components/layout/Header';
import Footer from '@components/layout/Footer';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <RecipeProvider>
              <PlannerProvider>
                <ShoppingProvider>
                  <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
                    <Header />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                        <Route path="/planner" element={<PlannerPage />} />
                        <Route path="/shopping" element={<ShoppingListPage />} />
                        <Route path="/contribute" element={<ContributePage />} />
                        <Route path="/pantry" element={<PantryPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </main>
                    <Footer />
                  </div>
                </ShoppingProvider>
              </PlannerProvider>
            </RecipeProvider>
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
