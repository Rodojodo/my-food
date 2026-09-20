import { useState } from 'react';
import type { MealConfig, MealSlotConfig } from '../../types/types';
import { FiPlus, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

interface MealConfigEditorProps {
  currentConfig: MealConfig;
  onSave: (config: MealConfig) => void;
  onCancel: () => void;
}

export default function MealConfigEditor({ currentConfig, onSave, onCancel }: MealConfigEditorProps) {
  const [slots, setSlots] = useState<MealSlotConfig[]>([...currentConfig.slots]);

  const handleAddRow = () => {
    setSlots([...slots, { count: 1, servings: 2, preferQuick: false }]);
  };

  const handleRemoveRow = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof MealSlotConfig, value: number | boolean) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const totalMeals = slots.reduce((acc, s) => acc + s.count, 0);
  const totalServings = slots.reduce((acc, s) => acc + (s.count * s.servings), 0);

  const applyPreset = (presetName: string) => {
    if (presetName === 'default') {
      setSlots([
        { count: 2, servings: 4, preferQuick: false },
        { count: 2, servings: 2, preferQuick: true },
      ]);
    } else if (presetName === 'full') {
      setSlots([
        { count: 5, servings: 4, preferQuick: false },
        { count: 2, servings: 4, preferQuick: true },
      ]);
    } else if (presetName === '4people') {
      setSlots([
        { count: 7, servings: 4, preferQuick: false },
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold text-stone-800">Edit Meal Configuration</h2>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 transition-colors">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-stone-600 self-center mr-2">Presets:</span>
            <button onClick={() => applyPreset('default')} className="px-3 py-1 text-xs rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors">Default (2 people, 6 nights)</button>
            <button onClick={() => applyPreset('full')} className="px-3 py-1 text-xs rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors">Full Week (7 nights)</button>
            <button onClick={() => applyPreset('4people')} className="px-3 py-1 text-xs rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors">4 People</button>
          </div>

          <div className="space-y-4">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Number of Meals</label>
                    <input 
                      type="number" min="1" max="14"
                      value={slot.count} 
                      onChange={(e) => handleChange(i, 'count', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-900 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Servings per Meal</label>
                    <input 
                      type="number" min="1" max="20"
                      value={slot.servings} 
                      onChange={(e) => handleChange(i, 'servings', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-900 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={slot.preferQuick} 
                        onChange={(e) => handleChange(i, 'preferQuick', e.target.checked)}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-sm font-medium text-stone-700">Prefer Quick</span>
                    </label>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveRow(i)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors mt-5"
                  title="Remove row"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAddRow}
            className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <FiPlus /> Add Row
          </button>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center justify-between mt-6">
            <span className="text-emerald-800 font-medium">Total Summary</span>
            <div className="text-right">
              <span className="block text-emerald-900 font-bold">{totalMeals} Meals</span>
              <span className="block text-emerald-700 text-sm">{totalServings} Total Servings</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 rounded-b-lg">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave({ slots })}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium transition-colors flex items-center gap-2"
          >
            <FiCheck /> Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
