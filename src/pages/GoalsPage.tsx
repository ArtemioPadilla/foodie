import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTracking } from '@contexts/TrackingContext';
import { Save, RotateCcw } from 'lucide-react';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { goals, setGoals, resetGoalsToDefaults } = useTracking();
  const [editedGoals, setEditedGoals] = useState(goals);
  const [saved, setSaved] = useState(false);

  // Sync editedGoals when goals change from context
  useEffect(() => {
    setEditedGoals(goals);
  }, [goals]);

  const handleSave = () => {
    setGoals(editedGoals);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetGoalsToDefaults();
  };

  const GoalInput = ({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={value * 2}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-3"
      />
    </div>
  );

  return (
    <div className="container-custom py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {t('goals.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {t('goals.description')}
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <GoalInput
          label={t('goals.calories')}
          value={editedGoals.calories}
          onChange={(v) => setEditedGoals({ ...editedGoals, calories: v })}
          unit={t('goals.perDay')}
        />

        <GoalInput
          label={t('goals.protein')}
          value={editedGoals.protein}
          onChange={(v) => setEditedGoals({ ...editedGoals, protein: v })}
          unit={`${t('goals.grams')} ${t('goals.perDay')}`}
        />

        <GoalInput
          label={t('goals.carbs')}
          value={editedGoals.carbs}
          onChange={(v) => setEditedGoals({ ...editedGoals, carbs: v })}
          unit={`${t('goals.grams')} ${t('goals.perDay')}`}
        />

        <GoalInput
          label={t('goals.fat')}
          value={editedGoals.fat}
          onChange={(v) => setEditedGoals({ ...editedGoals, fat: v })}
          unit={`${t('goals.grams')} ${t('goals.perDay')}`}
        />

        <GoalInput
          label={t('goals.fiber')}
          value={editedGoals.fiber}
          onChange={(v) => setEditedGoals({ ...editedGoals, fiber: v })}
          unit={`${t('goals.grams')} ${t('goals.perDay')}`}
        />

        {editedGoals.water && (
          <GoalInput
            label={t('goals.water')}
            value={editedGoals.water}
            onChange={(v) => setEditedGoals({ ...editedGoals, water: v })}
            unit={`${t('tracking.ml')} ${t('goals.perDay')}`}
          />
        )}

        <div className="flex gap-4 pt-6">
          <button
            onClick={handleReset}
            className="flex-1 px-6 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-5 w-5" />
            {t('goals.resetDefaults')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {t('goals.saveGoals')}
          </button>
        </div>

        {saved && (
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            {t('goals.goalsSaved')}
          </div>
        )}
      </div>
    </div>
  );
}
