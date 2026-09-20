import { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import { usePlanStore } from '../../stores/planStore';
import type { IngredientCategory } from '../../types/types';

interface WeeklyDefaultsProps {
  onClose: () => void;
}

export default function WeeklyDefaults({ onClose }: WeeklyDefaultsProps) {
  const { semesterPlan, addWeeklyDefault, removeWeeklyDefault } = usePlanStore();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('other');

  if (!semesterPlan) return null;

  const handleAdd = () => {
    if (!name.trim()) return;
    addWeeklyDefault({
      name: name.trim(),
      amount: amount ? parseFloat(amount) : undefined,
      unit: unit || undefined,
      category,
      checked: false,
      isExtra: false,
    });
    setName('');
    setAmount('');
    setUnit('');
    setCategory('other');
  };

  const quickAdds = ['Milk', 'Bread', 'Eggs', 'Cereal', 'Butter', 'Cheese', 'Fruit', 'Snacks', 'Coffee', 'Tea'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold text-stone-800">Weekly Defaults</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">Current Defaults</h3>
            {semesterPlan.weeklyDefaults.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No default items added yet.</p>
            ) : (
              <ul className="space-y-2">
                {semesterPlan.weeklyDefaults.map(item => (
                  <li key={item.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-md border border-stone-100">
                    <div>
                      <span className="font-medium text-stone-800">{item.name}</span>
                      {item.amount && <span className="text-xs text-stone-500 ml-2">{item.amount} {item.unit}</span>}
                    </div>
                    <button 
                      onClick={() => removeWeeklyDefault(item.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-full"
                    >
                      <FiX size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Add New Default</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input 
                type="text" 
                placeholder="Item name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="col-span-2 w-full px-3 py-2 border border-stone-300 rounded-md text-sm bg-white text-stone-900 placeholder-stone-400 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input 
                type="number" 
                placeholder="Amount (opt)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm bg-white text-stone-900 placeholder-stone-400 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input 
                type="text" 
                placeholder="Unit (opt)"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm bg-white text-stone-900 placeholder-stone-400 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <select 
                value={category}
                onChange={e => setCategory(e.target.value as IngredientCategory)}
                className="col-span-2 w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-stone-900"
              >
                <option value="produce">Produce</option>
                <option value="dairy">Dairy</option>
                <option value="grains">Grains</option>
                <option value="canned">Canned</option>
                <option value="spices">Spices</option>
                <option value="oils">Oils</option>
                <option value="frozen">Frozen</option>
                <option value="bakery">Bakery</option>
                <option value="condiments">Condiments</option>
                <option value="protein">Protein</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button 
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-900 transition-colors"
            >
              <FiPlus /> Add to Defaults
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">Quick Add Suggestions</h3>
            <div className="flex flex-wrap gap-2">
              {quickAdds.map(q => (
                <button 
                  key={q}
                  onClick={() => setName(q)}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
