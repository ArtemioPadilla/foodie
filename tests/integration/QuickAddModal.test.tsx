import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickAddModal from '@components/tracking/QuickAddModal';
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

describe('QuickAddModal Integration Tests', () => {
  const mockOnClose = vi.fn();
  const testDate = '2025-01-25';

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

  describe('modal visibility', () => {
    it('does not render when isOpen is false', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={false}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Modal should not be in the document when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Modal should be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('displays three tab buttons', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Find all buttons in the tab container
      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );

      expect(tabButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('first tab is active by default', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );

      // First tab should have active class
      expect(tabButtons[0].className).toContain('border-primary-600');
    });

    it('can switch between tabs', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );

      // Click second tab (ingredient tab)
      await user.click(tabButtons[1]);

      // Second tab should now be active
      expect(tabButtons[1].className).toContain('border-primary-600');
    });
  });

  describe('meal type selector', () => {
    it('displays meal type dropdown by default', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('allows selecting different meal types', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;

      // Change to lunch
      await user.selectOptions(select, 'lunch');
      expect(select.value).toBe('lunch');

      // Change to dinner
      await user.selectOptions(select, 'dinner');
      expect(select.value).toBe('dinner');
    });

    it('uses preselectedMealType when provided', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
            preselectedMealType="snack"
          />
        </AllProviders>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('snack');
    });

    it('changes UI on beverage tab', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Switch to beverage tab (third tab)
      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );
      await user.click(tabButtons[2]);

      // Should still have a combobox (beverage category selector)
      // but it's a different one than the meal type selector
      const beverageComboboxes = screen.getAllByRole('combobox');
      expect(beverageComboboxes.length).toBeGreaterThan(0);
    });
  });

  describe('beverage logging integration', () => {
    it('beverage tab loads and displays beverages', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Switch to beverage tab
      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );
      await user.click(tabButtons[2]);

      // Wait for beverage data to load
      await waitFor(() => {
        // Should have buttons for logging beverages
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(3); // More than just tab buttons
      }, { timeout: 3000 });

      // Should have beverage category selector
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });
  });

  describe('modal closing', () => {
    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      // Find close button by aria-label
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('modal has proper dialog role', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('close button has aria-label', () => {
      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('all tabs are keyboard navigable', async () => {
      const user = userEvent.setup();

      render(
        <AllProviders>
          <QuickAddModal
            isOpen={true}
            onClose={mockOnClose}
            date={testDate}
          />
        </AllProviders>
      );

      const tabButtons = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('border-b-2')
      );

      // Focus and activate second tab with keyboard
      tabButtons[1].focus();
      await user.keyboard('{Enter}');

      // Second tab should now be active
      expect(tabButtons[1].className).toContain('border-primary-600');
    });
  });
});
