import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PantryItem } from '@/types';
import { usePantry } from '@contexts/PantryContext';
import { Modal, Button, Input, Select } from '@components/common';
import { cn } from '@utils/cn';

export interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: PantryItem;
  className?: string;
}

/**
 * Modal for adding or editing pantry items
 */
export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  editItem,
  className,
}) => {
  const { t } = useTranslation();
  const { addItem, updateItem } = usePantry();

  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('piece');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (editItem) {
      setIngredientId(editItem.ingredientId);
      setQuantity(editItem.quantity.toString());
      setUnit(editItem.unit);
      setExpirationDate(editItem.expirationDate || '');
      setLocation(editItem.location || '');
    } else {
      // Reset form for new item
      setIngredientId('');
      setQuantity('1');
      setUnit('piece');
      setExpirationDate('');
      setLocation('');
    }
    setError('');
  }, [editItem, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!ingredientId.trim()) {
      setError(t('pantry.ingredientRequired', 'Ingredient name is required'));
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError(t('pantry.invalidQuantity', 'Please enter a valid quantity'));
      return;
    }

    if (editItem) {
      // Update existing item
      updateItem(editItem.id, {
        ingredientId: ingredientId.trim(),
        quantity: quantityNum,
        unit,
        expirationDate: expirationDate || undefined,
        location: location.trim() || undefined,
      });
    } else {
      // Add new item
      addItem({
        ingredientId: ingredientId.trim(),
        quantity: quantityNum,
        unit,
        expirationDate: expirationDate || undefined,
        location: location.trim() || undefined,
      });
    }

    onClose();
  };

  const commonUnits = [
    { value: 'piece', label: t('units.piece', 'Piece') },
    { value: 'whole', label: t('units.whole', 'Whole') },
    { value: 'lb', label: t('units.lb', 'Pound (lb)') },
    { value: 'oz', label: t('units.oz', 'Ounce (oz)') },
    { value: 'kg', label: t('units.kg', 'Kilogram (kg)') },
    { value: 'g', label: t('units.g', 'Gram (g)') },
    { value: 'cup', label: t('units.cup', 'Cup') },
    { value: 'tbsp', label: t('units.tbsp', 'Tablespoon') },
    { value: 'tsp', label: t('units.tsp', 'Teaspoon') },
    { value: 'l', label: t('units.l', 'Liter (L)') },
    { value: 'ml', label: t('units.ml', 'Milliliter (mL)') },
  ];

  const commonLocations = [
    { value: '', label: t('pantry.noLocation', 'No location') },
    { value: 'Pantry', label: t('pantry.pantryLocation', 'Pantry') },
    { value: 'Fridge', label: t('pantry.fridgeLocation', 'Fridge') },
    { value: 'Freezer', label: t('pantry.freezerLocation', 'Freezer') },
    { value: 'Cabinet', label: t('pantry.cabinetLocation', 'Cabinet') },
    { value: 'Counter', label: t('pantry.counterLocation', 'Counter') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className={cn('', className)}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {editItem
            ? t('pantry.editItem', 'Edit Pantry Item')
            : t('pantry.addItem', 'Add to Pantry')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ingredient Name */}
          <div>
            <Input
              type="text"
              label={t('pantry.ingredientName', 'Ingredient Name')}
              placeholder={t('pantry.ingredientPlaceholder', 'e.g., Chicken breast, Olive oil...')}
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              required
            />
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                type="number"
                label={t('common.quantity', 'Quantity')}
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.1"
                required
              />
            </div>
            <div>
              <Select
                label={t('common.unit', 'Unit')}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={commonUnits}
              />
            </div>
          </div>

          {/* Expiration Date */}
          <div>
            <Input
              type="date"
              label={t('pantry.expirationDate', 'Expiration Date (Optional)')}
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('pantry.expirationHelp', 'Leave empty if item does not expire')}
            </p>
          </div>

          {/* Location */}
          <div>
            <Select
              label={t('pantry.location', 'Location (Optional)')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              options={commonLocations}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              {editItem ? t('common.update', 'Update') : t('common.add', 'Add')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

AddItemModal.displayName = 'AddItemModal';
