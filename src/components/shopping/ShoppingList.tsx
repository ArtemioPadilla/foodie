import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useShopping } from '@contexts/ShoppingContext';
import { CategoryGroup } from './CategoryGroup';
import { ListControls } from './ListControls';
import { EmptyState } from '@components/common';
import { groupByCategory } from '@services/shoppingService';
import { cn } from '@utils/cn';
import { AddItemModal } from './AddItemModal';

export interface ShoppingListProps {
  className?: string;
}

/**
 * Main shopping list component with categorized items and controls
 */
export const ShoppingList: React.FC<ShoppingListProps> = ({ className }) => {
  const { t } = useTranslation();
  const {
    shoppingList,
    toggleItem,
    removeItem,
    updateQuantity,
    updateNotes,
    addItem,
    clearList,
    clearChecked,
  } = useShopping();

  const [searchQuery, setSearchQuery] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const [sortBy, setSortBy] = useState<'category' | 'name' | 'checked'>('category');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...shoppingList];

    // Category filter
    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.ingredientId.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query)
      );
    }

    // Show/hide checked items
    if (!showChecked) {
      items = items.filter((item) => !item.checked);
    }

    return items;
  }, [shoppingList, categoryFilter, searchQuery, showChecked]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];

    switch (sortBy) {
      case 'name':
        return items.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
      case 'checked':
        return items.sort((a, b) => {
          if (a.checked === b.checked) return 0;
          return a.checked ? 1 : -1;
        });
      case 'category':
      default:
        return items;
    }
  }, [filteredItems, sortBy]);

  // Group by category
  const groupedItems = useMemo(() => {
    return groupByCategory(sortedItems);
  }, [sortedItems]);

  // Stats
  const totalItems = shoppingList.length;
  const checkedItems = shoppingList.filter((item) => item.checked).length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  if (totalItems === 0) {
    return (
      <div className={cn('', className)}>
        <EmptyState
          title={t('shopping.emptyList', 'Shopping List Empty')}
          description={t(
            'shopping.emptyDescription',
            'Add items manually or generate from a meal plan'
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Controls */}
      <ListControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showChecked={showChecked}
        onToggleShowChecked={() => setShowChecked(!showChecked)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onClearAll={clearList}
        onClearChecked={clearChecked}
        totalItems={totalItems}
        checkedItems={checkedItems}
      />

      {/* Add Item Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="btn-primary flex items-center gap-2 w-full sm:w-auto"
        data-testid="add-item-button"
      >
        <Plus className="h-5 w-5" />
        {t('shopping.addItem')}
      </button>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('shopping.progress', 'Shopping Progress')}
          </span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {checkedItems} / {totalItems} ({Math.round(progress)}%)
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Categorized Items */}
      <h2 className="sr-only">{t('shopping.itemsList', 'Shopping Items by Category')}</h2>
      {sortBy === 'category' ? (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <CategoryGroup
              key={category}
              category={category}
              items={items}
              onToggleItem={toggleItem}
              onRemoveItem={removeItem}
              onUpdateQuantity={updateQuantity}
              onUpdateNotes={updateNotes}
            />
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedItems.map((item) => (
              <div key={item.ingredientId} className="px-4 py-2 bg-white dark:bg-gray-900">
                <CategoryGroup
                  category=""
                  items={[item]}
                  onToggleItem={toggleItem}
                  onRemoveItem={removeItem}
                  onUpdateQuantity={updateQuantity}
                  onUpdateNotes={updateNotes}
                  defaultCollapsed={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredItems.length === 0 && searchQuery && (
        <EmptyState
          title={t('shopping.noResults', 'No items found')}
          description={t('shopping.tryDifferentSearch', 'Try a different search term')}
        />
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addItem}
      />
    </div>
  );
};

ShoppingList.displayName = 'ShoppingList';
