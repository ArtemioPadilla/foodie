import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePantry } from '@contexts/PantryContext';
import { PantryItem } from './PantryItem';
import { AddItemModal } from './AddItemModal';
import { Button, Input, Select, EmptyState } from '@components/common';
import { cn } from '@utils/cn';

export interface PantryInventoryProps {
  className?: string;
}

/**
 * Main pantry inventory view with filtering and sorting
 */
export const PantryInventory: React.FC<PantryInventoryProps> = ({ className }) => {
  const { t } = useTranslation();
  const { pantryItems, removeItem, updateItem, clearPantry } = usePantry();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiration'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'expiring' | 'low-stock'>('all');

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...pantryItems];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.ingredientId.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      );
    }

    // Additional filters
    if (filterBy === 'expiring') {
      const now = new Date();
      const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      items = items.filter((item) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate <= threshold && expDate >= now;
      });
    } else if (filterBy === 'low-stock') {
      items = items.filter((item) => item.quantity <= 1);
    }

    return items;
  }, [pantryItems, searchQuery, filterBy]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];

    switch (sortBy) {
      case 'name':
        return items.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
      case 'quantity':
        return items.sort((a, b) => a.quantity - b.quantity);
      case 'expiration':
        return items.sort((a, b) => {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        });
      default:
        return items;
    }
  }, [filteredItems, sortBy]);

  const handleClearAll = () => {
    if (window.confirm(t('pantry.confirmClearAll', 'Clear entire pantry? This cannot be undone.'))) {
      clearPantry();
    }
  };

  if (pantryItems.length === 0) {
    return (
      <>
        <div className={cn('', className)}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('pantry.title', 'Pantry Inventory')}
            </h2>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              {t('pantry.addItem', 'Add Item')}
            </Button>
          </div>

          <EmptyState
            title={t('pantry.emptyPantry', 'Pantry is Empty')}
            description={t(
              'pantry.emptyDescription',
              'Start tracking your ingredients by adding items to your pantry'
            )}
            action={{
              label: t('pantry.addFirstItem', 'Add First Item'),
              onClick: () => setShowAddModal(true),
            }}
          />
        </div>

        <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      </>
    );
  }

  return (
    <>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('pantry.title', 'Pantry Inventory')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {pantryItems.length} {pantryItems.length === 1 ? t('common.item', 'item') : t('common.items', 'items')}
            </p>
          </div>

          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            {t('pantry.addItem', 'Add Item')}
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Input
              type="search"
              placeholder={t('pantry.searchPlaceholder', 'Search items...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="w-48">
            <Select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
              options={[
                { value: 'all', label: t('common.all', 'All Items') },
                { value: 'expiring', label: t('pantry.expiringSoon', 'Expiring Soon') },
                { value: 'low-stock', label: t('pantry.lowStock', 'Low Stock') },
              ]}
            />
          </div>

          {/* Sort */}
          <div className="w-48">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              options={[
                { value: 'name', label: t('common.sortByName', 'By Name') },
                { value: 'quantity', label: t('common.sortByQuantity', 'By Quantity') },
                { value: 'expiration', label: t('common.sortByExpiration', 'By Expiration') },
              ]}
            />
          </div>

          {/* Clear All */}
          <Button variant="danger" onClick={handleClearAll}>
            {t('common.clearAll', 'Clear All')}
          </Button>
        </div>

        {/* Items List */}
        {sortedItems.length === 0 ? (
          <EmptyState
            title={t('common.noResults', 'No items found')}
            description={t('common.tryDifferentSearch', 'Try adjusting your search or filters')}
          />
        ) : (
          <div className="space-y-2">
            {sortedItems.map((item) => (
              <PantryItem
                key={item.id}
                item={item}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
};

PantryInventory.displayName = 'PantryInventory';
