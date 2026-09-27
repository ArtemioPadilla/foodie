import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@components/common/Modal';
import RecipeTab from './quickAdd/RecipeTab';
import IngredientTab from './quickAdd/IngredientTab';
import BeverageTab from './quickAdd/BeverageTab';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMealType?: string;
  date: string;
}

type TabType = 'recipe' | 'ingredient' | 'beverage';

export default function QuickAddModal({
  isOpen,
  onClose,
  preselectedMealType = 'breakfast',
  date,
}: QuickAddModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('recipe');
  const [mealType, setMealType] = useState(preselectedMealType);

  const tabs = [
    { id: 'recipe' as TabType, label: t('nav.recipes') },
    { id: 'ingredient' as TabType, label: t('nav.ingredients') },
    { id: 'beverage' as TabType, label: t('tracking.beverage') },
  ];

  const mealTypes = [
    { value: 'breakfast', label: t('tracking.breakfast') },
    { value: 'lunch', label: t('tracking.lunch') },
    { value: 'dinner', label: t('tracking.dinner') },
    { value: 'snack', label: t('tracking.snack') },
    { value: 'beverage', label: t('tracking.beverage') },
  ];

  const handleSuccess = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tracking.quickAdd')}
      size="xl"
    >
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meal Type Selector (shared across all tabs) */}
      {activeTab !== 'beverage' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tracking.selectMealType')}
          </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {mealTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'recipe' && (
          <RecipeTab
            mealType={mealType}
            date={date}
            onSuccess={handleSuccess}
          />
        )}
        {activeTab === 'ingredient' && (
          <IngredientTab
            mealType={mealType}
            date={date}
            onSuccess={handleSuccess}
          />
        )}
        {activeTab === 'beverage' && (
          <BeverageTab
            date={date}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </Modal>
  );
}
