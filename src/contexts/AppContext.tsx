import { createContext, useContext, useState, ReactNode } from 'react';
import type { AppConfig } from '@/types';

interface AppContextType {
  config: AppConfig;
  isOnline: boolean;
  showInstallPrompt: boolean;
  installPWA: () => void;
  dismissInstallPrompt: () => void;
}

const defaultConfig: AppConfig = {
  name: 'Foodie',
  version: '1.0.0',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr'],
  defaultCurrency: 'USD',
  defaultServings: 2,
  theme: {
    primary: '#10b981',
    secondary: '#3b82f6',
    accent: '#f59e0b',
  },
  features: {
    communityRecipes: true,
    shoppingList: true,
    mealPlanner: true,
    nutritionTracking: true,
    priceEstimation: true,
    recipeRatings: true,
    socialSharing: true,
    offlineMode: true,
  },
  limits: {
    maxServings: 20,
    minServings: 1,
    maxRecipesPerPlan: 50,
    maxIngredientsPerRecipe: 50,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [config] = useState<AppConfig>(defaultConfig);
  const [isOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const installPWA = () => {
    // PWA install logic would go here
    setShowInstallPrompt(false);
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  return (
    <AppContext.Provider
      value={{
        config,
        isOnline,
        showInstallPrompt,
        installPWA,
        dismissInstallPrompt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
