import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCopy, FiDownload, FiPrinter, FiPlus, FiX, FiSettings, FiChevronDown, FiChevronRight, FiCheck } from 'react-icons/fi';
import { usePlanStore } from '../../stores/planStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { aggregateIngredients, mergeWithDefaults } from '../../utils/shoppingAggregator';
import WeeklyDefaults from './WeeklyDefaults';
import type { IngredientCategory, ShoppingItem } from '../../types/types';
import { COMMON_INGREDIENTS } from '../../data/commonIngredients';

export default function ShoppingList() {
  const { weekNumber } = useParams<{ weekNumber: string }>();
  const num = parseInt(weekNumber || '1', 10);
  
  const { weekPlans, semesterPlan, updateCommonCheck, addExtraItem, removeExtraItem } = usePlanStore();
  const { recipes } = useRecipeStore();
  
  const [showDefaults, setShowDefaults] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  const [extraName, setExtraName] = useState('');
  const [extraCategory, setExtraCategory] = useState<IngredientCategory>('other');

  const weekPlan = weekPlans.find(w => w.weekNumber === num);

  // Derive shopping items
  const allItems = useMemo(() => {
    if (!weekPlan) return [];
    
    // Get recipes for this week
    const recipeData = weekPlan.mealSlots
      .filter(s => s.recipeId)
      .map(s => {
        const recipe = recipes.find(r => r.id === s.recipeId);
        return recipe ? { recipe, servings: s.servings } : null;
      })
      .filter(Boolean) as { recipe: any; servings: number }[];
      
    // Aggregate
    let items = aggregateIngredients(recipeData);
    
    // Merge with defaults
    if (semesterPlan?.weeklyDefaults) {
      items = mergeWithDefaults(items, semesterPlan.weeklyDefaults);
    }
    
    // Add extra items
    items = [...items, ...weekPlan.extraItems];
    
    return items;
  }, [weekPlan, recipes, semesterPlan]);

  if (!weekPlan || !semesterPlan) {
    return <div className="p-8 text-center">Week not found.</div>;
  }

  // Filter out items that are marked as "already have" in common checks
  const commonItemNames = allItems
    .filter(i => COMMON_INGREDIENTS.includes(i.name.toLowerCase()) || i.category === 'spices' || i.category === 'oils')
    .map(i => i.name.toLowerCase());
  const uniqueCommonNames = Array.from(new Set(commonItemNames));

  const itemsToList = allItems.filter(item => {
    const check = weekPlan.commonChecks.find(c => c.name.toLowerCase() === item.name.toLowerCase());
    if (check && check.alreadyHave) return false;
    return true;
  });

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, ShoppingItem[]> = {};
    itemsToList.forEach(item => {
      const cat = item.category || 'other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [itemsToList]);

  const toggleCheck = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedItems(newChecked);
  };

  const toggleCategory = (cat: string) => {
    const newColl = new Set(collapsedCategories);
    if (newColl.has(cat)) newColl.delete(cat);
    else newColl.add(cat);
    setCollapsedCategories(newColl);
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    addExtraItem(num, {
      name: extraName.trim(),
      category: extraCategory,
      checked: false,
      isWeeklyDefault: false,
      isExtra: true
    });
    setExtraName('');
  };

  const handleCopy = () => {
    const text = Object.entries(grouped).map(([cat, items]) => {
      return `${cat.toUpperCase()}:\n` + items.map(i => `- ${i.name} ${i.amount ? `(${i.amount} ${i.unit || ''})` : ''}`).join('\n');
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  const categories = Object.keys(grouped).sort();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24 print:p-0 print:max-w-none">
      <header className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 print:shadow-none print:border-none print:p-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-800">Shopping List - Week {num}</h1>
          <Link to={`/plan/${num}`} className="text-emerald-600 hover:underline print:hidden text-sm font-medium">Back to Planner</Link>
        </div>
        
        <div className="flex gap-2 print:hidden flex-wrap">
          <button onClick={handleCopy} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-sm font-medium flex items-center gap-2"><FiCopy /> Copy Text</button>
          <button onClick={() => alert('Downloading .ics...')} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-sm font-medium flex items-center gap-2"><FiDownload /> Download .ics</button>
          <button onClick={handlePrint} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-sm font-medium flex items-center gap-2"><FiPrinter /> Print</button>
          <button onClick={() => alert('Toggling units...')} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-sm font-medium border border-emerald-200">Toggle Units</button>
        </div>
      </header>

      {/* Common Ingredients Check */}
      <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 print:hidden">
        <h2 className="text-lg font-bold text-amber-900 mb-4">Pantry Check</h2>
        <p className="text-sm text-amber-700 mb-4">Check off common items you already have so they don't appear on the list.</p>
        <div className="flex flex-wrap gap-3">
          {uniqueCommonNames.map(name => {
            const isChecked = weekPlan.commonChecks.find(c => c.name.toLowerCase() === name)?.alreadyHave || false;
            return (
              <label key={name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${isChecked ? 'bg-amber-200 border-amber-300 text-amber-900' : 'bg-white border-amber-200 text-amber-800'}`}>
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={(e) => updateCommonCheck(num, name, e.target.checked)}
                  className="hidden"
                />
                {isChecked && <FiCheck />}
                <span className="capitalize">{name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {categories.map(cat => {
            const items = grouped[cat];
            const isCollapsed = collapsedCategories.has(cat);
            return (
              <div key={cat} className="bg-white rounded-lg border border-stone-200 overflow-hidden print:border-none print:mb-4">
                <div 
                  className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between cursor-pointer print:bg-transparent print:border-b-2 print:border-stone-800"
                  onClick={() => toggleCategory(cat)}
                >
                  <h3 className="font-bold text-stone-800 capitalize flex items-center gap-2">
                    <span className="print:hidden">{isCollapsed ? <FiChevronRight /> : <FiChevronDown />}</span>
                    {cat}
                  </h3>
                  <span className="text-xs font-medium text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full print:hidden">{items.length}</span>
                </div>
                
                {!isCollapsed && (
                  <ul className="divide-y divide-stone-100">
                    {items.map(item => {
                      const isChecked = checkedItems.has(item.id);
                      return (
                        <li key={item.id} className={`p-4 flex items-start gap-3 hover:bg-stone-50 transition-colors ${isChecked ? 'opacity-50 bg-stone-50' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleCheck(item.id)}
                            className="mt-1 w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer print:hidden"
                          />
                          <div className={`w-4 h-4 border border-stone-400 rounded-sm mt-1 hidden print:block ${isChecked ? 'bg-stone-800' : ''}`} />
                          
                          <div className="flex-1">
                            <span className={`font-medium text-stone-800 ${isChecked ? 'line-through text-stone-500' : ''}`}>{item.name}</span>
                            {item.amount && (
                              <span className="ml-2 text-sm text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                {item.amount} {item.unit}
                              </span>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.fromRecipes?.map((rId: string) => {
                                const r = recipes.find(rec => rec.id === rId);
                                return r ? <span key={rId} className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">{r.name}</span> : null;
                              })}
                              {item.isWeeklyDefault && <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">Weekly Default</span>}
                              {item.isExtra && <span className="text-[10px] uppercase font-bold tracking-wider text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">Extra Item</span>}
                            </div>
                          </div>
                          
                          {item.isExtra && !isChecked && (
                            <button onClick={() => removeExtraItem(num, item.id)} className="text-stone-400 hover:text-red-500 print:hidden"><FiX /></button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6 print:hidden">
          <div className="bg-stone-800 text-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-4 flex items-center justify-between">
              Weekly Defaults
              <button onClick={() => setShowDefaults(true)} className="text-stone-400 hover:text-white"><FiSettings /></button>
            </h3>
            {semesterPlan.weeklyDefaults.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No defaults set.</p>
            ) : (
              <ul className="space-y-2 text-sm text-stone-300">
                {semesterPlan.weeklyDefaults.map(d => (
                  <li key={d.id}>• {d.name} {d.amount ? `(${d.amount} ${d.unit || ''})` : ''}</li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowDefaults(true)} className="mt-4 w-full py-2 bg-stone-700 hover:bg-stone-600 rounded-md text-sm font-medium transition-colors">Manage Defaults</button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
            <h3 className="font-bold text-stone-800 mb-4">Add Extra Item</h3>
            <form onSubmit={handleAddExtra} className="space-y-3">
              <input 
                type="text" 
                placeholder="Item name..."
                value={extraName}
                onChange={e => setExtraName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
              <select 
                value={extraCategory}
                onChange={e => setExtraCategory(e.target.value as IngredientCategory)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="produce">Produce</option>
                <option value="dairy">Dairy</option>
                <option value="grains">Grains</option>
                <option value="canned">Canned</option>
                <option value="other">Other</option>
              </select>
              <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium flex justify-center items-center gap-2 transition-colors">
                <FiPlus /> Add Item
              </button>
            </form>
          </div>
        </div>
      </div>

      {showDefaults && <WeeklyDefaults onClose={() => setShowDefaults(false)} />}
    </div>
  );
}
