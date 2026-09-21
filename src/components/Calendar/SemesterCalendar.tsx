import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiLock, FiUnlock, FiCalendar, FiZap, FiRefreshCw } from 'react-icons/fi';
import { usePlanStore } from '../../stores/planStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { format, addDays, parseISO } from 'date-fns';

export default function SemesterCalendar() {
  const navigate = useNavigate();
  const { semesterPlan, weekPlans, lockWeek, autoFillAllWeeks, regenerateAllWeeks, getProgress } = usePlanStore();
  const { getRecipeById, getWeightedRandomRecipes } = useRecipeStore();
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!semesterPlan) {
    return <Navigate to="/" replace />;
  }

  const handleAutoFill = async () => {
    await autoFillAllWeeks(getWeightedRandomRecipes);
  };

  const handleRegenerate = async () => {
    const hasLocked = weekPlans.some(w => w.isLocked);
    let includeLocked = false;

    if (hasLocked) {
      const proceed = window.confirm(
        'Some weeks are locked.\n\nClick OK to regenerate the meal plan.\nClick Cancel to keep the current plan.'
      );
      if (!proceed) return;
      includeLocked = window.confirm('Would you also like to regenerate the locked weeks?');
    } else {
      if (!window.confirm('Are you sure you want to completely regenerate the meal plan? All meal slots will be refreshed with newly selected recipes.')) {
        return;
      }
    }

    try {
      setIsRegenerating(true);
      await regenerateAllWeeks(getWeightedRandomRecipes, { includeLocked });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExport = () => {
    // Basic stub, real export logic would be implemented here or via utility
    alert('Exporting semester to calendar...');
  };

  const progress = getProgress();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-stone-200">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{semesterPlan.name}</h1>
          <p className="text-stone-500">
            {format(parseISO(semesterPlan.startDate), 'MMMM d, yyyy')} - {semesterPlan.totalWeeks} Weeks
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 w-64 h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-stone-600">{progress.percentage}% Filled</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors cursor-pointer shadow-xs"
            title="Completely regenerate meal plan with fresh recipes"
          >
            <FiRefreshCw className={isRegenerating ? "animate-spin" : ""} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate Plan"}</span>
          </button>
          <button 
            onClick={handleAutoFill}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-md font-medium transition-colors cursor-pointer"
            title="Fill only empty slots"
          >
            <FiZap /> Auto-Fill Empty
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-md font-medium transition-colors cursor-pointer"
          >
            <FiCalendar /> Export Full
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {weekPlans.map((week) => {
          const startDate = parseISO(week.startDate);
          const endDate = addDays(startDate, 6);
          const totalSlots = week.mealSlots.length;
          const filledSlots = week.mealSlots.filter(s => s.recipeId).length;
          
          let statusColor = 'bg-stone-200';
          if (filledSlots === totalSlots && totalSlots > 0) statusColor = 'bg-emerald-500';
          else if (filledSlots > 0) statusColor = 'bg-amber-400';

          return (
            <div 
              key={week.id}
              className="bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              onClick={() => navigate(`/plan/${week.weekNumber}`)}
            >
              <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800">Week {week.weekNumber}</h3>
                  <p className="text-xs text-stone-500">
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    lockWeek(week.weekNumber, !week.isLocked);
                  }}
                  className={`p-2 rounded-full transition-colors ${week.isLocked ? 'text-amber-600 hover:bg-amber-100' : 'text-stone-400 hover:bg-stone-200'}`}
                  title={week.isLocked ? "Unlock week" : "Lock week"}
                >
                  {week.isLocked ? <FiLock size={16} /> : <FiUnlock size={16} />}
                </button>
              </div>
              
              <div className="p-4 flex-1">
                <ul className="space-y-2 mb-4">
                  {week.mealSlots.slice(0, 4).map(slot => {
                    const recipe = slot.recipeId ? getRecipeById(slot.recipeId) : null;
                    return (
                      <li key={slot.id} className="text-sm truncate flex items-center gap-2 text-stone-600">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${recipe ? 'bg-emerald-400' : 'bg-stone-300'}`} />
                        {recipe ? recipe.name : <span className="text-stone-400 italic">Empty slot</span>}
                      </li>
                    );
                  })}
                  {week.mealSlots.length > 4 && (
                    <li className="text-xs text-stone-400 italic pl-4">
                      + {week.mealSlots.length - 4} more meals
                    </li>
                  )}
                </ul>
              </div>

              <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between mt-auto">
                <span className="text-xs font-medium text-stone-500">{filledSlots} / {totalSlots} Meals</span>
                <div className={`w-3 h-3 rounded-full ${statusColor}`} title={`${filledSlots}/${totalSlots} filled`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
