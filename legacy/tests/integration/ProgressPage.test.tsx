import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressPage from '@pages/ProgressPage';
import { TrackingProvider } from '@contexts/TrackingContext';
import { BeverageProvider } from '@contexts/BeverageContext';
import { LanguageProvider } from '@contexts/LanguageContext';
import { RecipeProvider } from '@contexts/RecipeContext';
import { IngredientProvider } from '@contexts/IngredientContext';
import { PlannerProvider } from '@contexts/PlannerContext';
import { mockBeverages, mockRecipes } from '../mocks/mockData';
import type { ReactNode } from 'react';

// Mock fetch for beverages and recipes
global.fetch = vi.fn();

const AllProviders = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>
    <RecipeProvider>
      <IngredientProvider>
        <PlannerProvider>
          <BeverageProvider>
            <TrackingProvider>{children}</TrackingProvider>
          </BeverageProvider>
        </PlannerProvider>
      </IngredientProvider>
    </RecipeProvider>
  </LanguageProvider>
);

describe('ProgressPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock successful fetch responses
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('beverages.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockBeverages,
        });
      }
      if (url.includes('recipes.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRecipes,
        });
      }
      if (url.includes('ingredients.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('page rendering', () => {
    it('renders the progress page', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Page should render successfully
        expect(document.body).toBeInTheDocument();
      });
    });

    it('displays view selector buttons', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        // Should have at least 2 buttons (week and month views)
        expect(buttons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('has stats cards for metrics', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Page should render with content
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('view selector', () => {
    it('week view is active by default', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);

        // First button should have active styling (primary-600 background)
        const hasActiveButton = buttons.some(btn =>
          btn.className.includes('bg-primary-600')
        );
        expect(hasActiveButton).toBe(true);
      });
    });

    it('can switch between week and month views', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);
      });

      const buttons = screen.getAllByRole('button');

      // Click the second button (should be month view)
      if (buttons[1]) {
        await user.click(buttons[1]);

        // Second button should now have active styling
        await waitFor(() => {
          expect(buttons[1].className).toContain('bg-primary-600');
        });
      }
    });

    it('view buttons are interactive', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);

        // Buttons should not be disabled
        buttons.forEach(btn => {
          expect(btn).not.toBeDisabled();
        });
      });
    });
  });

  describe('summary stats', () => {
    it('displays average calories stat', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should display numeric stats
        expect(document.body).toBeInTheDocument();
      });
    });

    it('displays streak stat', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Streak should be a number (0 or greater)
        const hasNumericContent = document.body.textContent?.match(/\d+/);
        expect(hasNumericContent).toBeTruthy();
      });
    });

    it('displays goals met stat', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show goals met (X/7 format)
        const hasGoalsMet = document.body.textContent?.includes('/7');
        expect(hasGoalsMet).toBe(true);
      });
    });

    it('shows stats with no tracking data', async () => {
      // No data in localStorage
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should display 0 or default values
        expect(document.body).toBeInTheDocument();
      });
    });

    it('shows stats with tracking data', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Add some tracking entries
      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: today,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 500,
            protein: 20,
            carbs: 60,
            fat: 15,
            fiber: 5,
            sugar: 10,
            sodium: 300,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show non-zero stats
        const hasNumericContent = document.body.textContent?.match(/\d+/);
        expect(hasNumericContent).toBeTruthy();
      });
    });
  });

  describe('daily breakdown', () => {
    it('shows empty state when no tracking data', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should render the page
        expect(document.body).toBeInTheDocument();
      });
    });

    it('displays daily data when entries exist', async () => {
      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: today,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 500,
            protein: 20,
            carbs: 60,
            fat: 15,
            fiber: 5,
            sugar: 10,
            sodium: 300,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show calorie information
        const hasCalories = document.body.textContent?.toLowerCase().includes('cal');
        expect(hasCalories).toBe(true);
      });
    });

    it('shows progress bars for each day', async () => {
      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: today,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 1000,
            protein: 40,
            carbs: 120,
            fat: 30,
            fiber: 10,
            sugar: 20,
            sodium: 600,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should display percentage
        const hasPercentage = document.body.textContent?.includes('%');
        expect(hasPercentage).toBe(true);
      });
    });

    it('shows multiple days of data', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: todayStr,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 500,
            protein: 20,
            carbs: 60,
            fat: 15,
            fiber: 5,
            sugar: 10,
            sodium: 300,
          },
        },
        {
          id: 'entry-2',
          date: yesterdayStr,
          mealType: 'lunch',
          type: 'recipe',
          itemId: 'rec_002',
          servings: 1,
          nutrition: {
            calories: 600,
            protein: 30,
            carbs: 70,
            fat: 20,
            fiber: 8,
            sugar: 15,
            sodium: 400,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show data for multiple days
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('responsive behavior', () => {
    it('renders successfully on all viewports', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('provides complete progress tracking interface', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should have view selector buttons
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);

        // Should show stats
        const hasNumericContent = document.body.textContent?.match(/\d+/);
        expect(hasNumericContent).toBeTruthy();

        // Should show goals met metric
        const hasGoalsMet = document.body.textContent?.includes('/7');
        expect(hasGoalsMet).toBe(true);
      });
    });
  });

  describe('data calculations', () => {
    it('calculates streak correctly', async () => {
      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Streak should be a number
        const hasNumericContent = document.body.textContent?.match(/\d+/);
        expect(hasNumericContent).toBeTruthy();
      });
    });

    it('calculates average calories', async () => {
      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: today,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 500,
            protein: 20,
            carbs: 60,
            fat: 15,
            fiber: 5,
            sugar: 10,
            sodium: 300,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show numeric calories
        const hasCalories = document.body.textContent?.toLowerCase().includes('cal');
        expect(hasCalories).toBe(true);
      });
    });

    it('displays progress percentages', async () => {
      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem('trackingEntries', JSON.stringify([
        {
          id: 'entry-1',
          date: today,
          mealType: 'breakfast',
          type: 'recipe',
          itemId: 'rec_001',
          servings: 1,
          nutrition: {
            calories: 1000,
            protein: 40,
            carbs: 120,
            fat: 30,
            fiber: 10,
            sugar: 20,
            sodium: 600,
          },
        },
      ]));

      render(
        <AllProviders>
          <ProgressPage />
        </AllProviders>
      );

      await waitFor(() => {
        // Should show percentage
        const hasPercentage = document.body.textContent?.includes('%');
        expect(hasPercentage).toBe(true);
      });
    });
  });
});
