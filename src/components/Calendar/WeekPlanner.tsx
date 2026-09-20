import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiSettings, FiShoppingCart, FiCalendar, FiShuffle, FiZap, FiX, FiRefreshCw, FiSearch, FiCheck, FiTrash2 } from 'react-icons/fi';
import { format, parseISO, addDays } from 'date-fns';
import { usePlanStore } from '../../stores/planStore';
import { useRecipeStore } from '../../stores/recipeStore';
import MealConfigEditor from './MealConfigEditor';
import type { Recipe } from '../../types/types';

// Simple Recipe Picker Modal
function RecipePickerModal({ onClose, onSelect, currentRecipeId }: { onClose: () => void, onSelect: (r: Recipe) => void, currentRecipeId: string | null }) {
  const [search, setSearch] = useState('');
  const { recipes } = useRecipeStore();
  
  const filtered = recipes.filter(r => !r.rejected && r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-800">Select a Recipe</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><FiX size={24} /></button>
        </div>
        <div className="p-4 border-b border-stone-200">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search recipes..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md bg-white text-stone-900 placeholder-stone-400 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => onSelect(recipe)}
              className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all flex items-center gap-3 ${currentRecipeId === recipe.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'}`}
            >
              <div className="w-16 h-16 bg-stone-200 rounded-md flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: recipe.image ? `url(${recipe.image})` : undefined }} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800 truncate">{recipe.name}</h3>
                <p className="text-xs text-stone-500">{recipe.totalTime} mins • {recipe.cuisine}</p>
              </div>
              {currentRecipeId === recipe.id && <FiCheck className="text-emerald-500 flex-shrink-0" size={20} />}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-stone-500 text-center col-span-2 py-8">No recipes found.</p>}
        </div>
      </div>
    </div>
  );
}

export default function WeekPlanner() {
  const { weekNumber } = useParams<{ weekNumber: string }>();
  const navigate = useNavigate();
  const num = parseInt(weekNumber || '1', 10);
  
  const { weekPlans, semesterPlan, updateMealConfig, autoFillWeek, assignRecipe, removeRecipe, swapMeals } = usePlanStore();
  const { getRecipeById, getWeightedRandomRecipes } = useRecipeStore();
  
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [pickingForSlot, setPickingForSlot] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);

  const weekPlan = weekPlans.find(w => w.weekNumber === num);

  if (!semesterPlan || !weekPlan) {
    return <div className="p-8 text-center text-stone-500">Week not found. <Link to="/" className="text-emerald-600 underline">Go Home</Link></div>;
  }

  const startDate = parseISO(weekPlan.startDate);
  const endDate = addDays(startDate, 6);

  const prevWeek = weekPlans.find(w => w.weekNumber === num - 1);
  const nextWeek = weekPlans.find(w => w.weekNumber === num + 1);

  const handleShuffleWeek = async () => {
    // Clear all unpinned meals then autofill
    // For simplicity, we just autofill over empty slots. If we want true shuffle, we'd clear them first.
    // Assuming non-locked slots can be cleared. We don't have a clear function in store, so let's just trigger autofill on empty ones.
    await autoFillWeek(num, getWeightedRandomRecipes);
  };

  const configSummary = weekPlan.mealConfig.slots.map(s => `${s.count} meals × ${s.servings} servings`).join(' + ');

  const handleSlotClick = (slotId: string) => {
    if (swapTarget) {
      if (swapTarget !== slotId) {
        swapMeals(num, swapTarget, slotId);
      }
      setSwapTarget(null);
    } else {
      setPickingForSlot(slotId);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 pb-24">
      <header className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => prevWeek && navigate(`/plan/${num - 1}`)}
            disabled={!prevWeek}
            className="p-2 rounded-full hover:bg-stone-100 disabled:opacity-30 transition-colors"
          >
            <FiChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-800">Week {num}</h1>
            <p className="text-stone-500">{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</p>
          </div>
          <button 
            onClick={() => nextWeek && navigate(`/plan/${num + 1}`)}
            disabled={!nextWeek}
            className="p-2 rounded-full hover:bg-stone-100 disabled:opacity-30 transition-colors"
          >
            <FiChevronRight size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-stone-500">Config:</span> <span className="font-medium text-stone-700">{configSummary}</span>
            </div>
            <button 
              onClick={() => setShowConfigEditor(true)}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
            >
              <FiSettings /> Edit
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleShuffleWeek}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FiShuffle /> Shuffle Empty
            </button>
            <button 
              onClick={() => alert('Exporting week to calendar...')}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FiCalendar /> Export
            </button>
            <Link 
              to={`/shopping/${num}`}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FiShoppingCart /> Shopping List
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weekPlan.mealSlots.map((slot) => {
          const recipe = slot.recipeId ? getRecipeById(slot.recipeId) : null;
          const isSwapping = swapTarget === slot.id;
          
          return (
            <div 
              key={slot.id} 
              className={`bg-white rounded-lg border-2 overflow-hidden transition-all ${isSwapping ? 'border-amber-400 shadow-md transform scale-[1.02]' : swapTarget ? 'border-amber-200 cursor-pointer hover:border-amber-400' : 'border-stone-200 hover:border-emerald-300'}`}
            >
              <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                <span className="font-semibold text-stone-700 capitalize">{slot.dayOfWeek} {slot.mealTime === 'lunch' ? '(Lunch)' : ''}</span>
                <div className="flex gap-2">
                  {slot.preferQuick && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium flex items-center gap-1"><FiZap size={12}/> Quick</span>}
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">{slot.servings} servings</span>
                </div>
              </div>
              
              <div className="p-4">
                {recipe ? (
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-stone-200 rounded-md flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: recipe.image ? `url(${recipe.image})` : undefined }} />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-stone-800 truncate leading-tight" title={recipe.name}>{recipe.name}</h3>
                        <p className="text-xs text-stone-500 mt-1">{recipe.totalTime} mins</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => setSwapTarget(isSwapping ? null : slot.id)}
                          className={`p-1.5 rounded-md transition-colors ${isSwapping ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                          title="Swap with another meal"
                        >
                          <FiRefreshCw size={14} />
                        </button>
                        <button 
                          onClick={() => setPickingForSlot(slot.id)}
                          className="p-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-md transition-colors"
                          title="Change recipe"
                        >
                          <FiSearch size={14} />
                        </button>
                        <button 
                          onClick={() => removeRecipe(num, slot.id)}
                          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors ml-auto"
                          title="Remove recipe"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => handleSlotClick(slot.id)}
                    className="h-20 border-2 border-dashed border-stone-300 rounded-md flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-stone-500 hover:text-emerald-600"
                  >
                    {swapTarget ? 'Click to swap here' : 'Choose a meal'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showConfigEditor && (
        <MealConfigEditor 
          currentConfig={weekPlan.mealConfig} 
          onSave={async (newConfig) => {
            await updateMealConfig(num, newConfig);
            setShowConfigEditor(false);
          }} 
          onCancel={() => setShowConfigEditor(false)} 
        />
      )}

      {pickingForSlot && (
        <RecipePickerModal 
          onClose={() => setPickingForSlot(null)}
          currentRecipeId={weekPlan.mealSlots.find(s => s.id === pickingForSlot)?.recipeId || null}
          onSelect={(r) => {
            assignRecipe(num, pickingForSlot, r.id);
            setPickingForSlot(null);
          }}
        />
      )}
    </div>
  );
}
