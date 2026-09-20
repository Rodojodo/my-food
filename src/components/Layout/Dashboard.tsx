import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiCalendar, FiList, FiAlertTriangle, FiBookOpen, FiZap } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { usePlanStore } from '../../stores/planStore';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { DayOfWeek } from '../../types/types';
import { DEFAULT_MEAL_CONFIG, DAYS_OF_WEEK } from '../../types/types';

export default function Dashboard() {
  const { semesterPlan, weekPlans, createSemesterPlan, getProgress, getMealVarietyWarnings, autoFillAllWeeks } = usePlanStore();
  const { recipes, getWeightedRandomRecipes } = useRecipeStore();
  const { settings } = useSettingsStore();

  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('Autumn Semester 2026');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formWeeks, setFormWeeks] = useState(16);
  const [formDay, setFormDay] = useState<DayOfWeek>(settings.shoppingDay || 'saturday');

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    await createSemesterPlan({
      name: formName,
      startDate: formDate,
      totalWeeks: formWeeks,
      shoppingDay: formDay,
      mealConfig: DEFAULT_MEAL_CONFIG,
    });
    setIsCreating(false);
  };

  const handleAutoFill = async () => {
    if (confirm('This will fill all empty slots in unlocked weeks with random recipes. Continue?')) {
      await autoFillAllWeeks(getWeightedRandomRecipes);
    }
  };

  if (!semesterPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="bg-white dark:bg-warm-900 p-8 rounded-2xl shadow-xl max-w-md w-full border border-warm-100 dark:border-warm-800">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-2">Welcome to Meal Planner</h1>
            <p className="text-warm-500 dark:text-warm-400">Let's set up your semester meal plan.</p>
          </div>

          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">Semester Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full p-2 border border-warm-300 dark:border-warm-700 rounded bg-white dark:bg-warm-800 text-warm-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">Start Date (First Shopping Day)</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full p-2 border border-warm-300 dark:border-warm-700 rounded bg-white dark:bg-warm-800 text-warm-900 dark:text-white"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">Weeks</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  required
                  value={formWeeks}
                  onChange={(e) => setFormWeeks(parseInt(e.target.value) || 16)}
                  className="w-full p-2 border border-warm-300 dark:border-warm-700 rounded bg-white dark:bg-warm-800 text-warm-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">Shopping Day</label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value as DayOfWeek)}
                  className="w-full p-2 border border-warm-300 dark:border-warm-700 rounded bg-white dark:bg-warm-800 text-warm-900 dark:text-white capitalize"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors"
            >
              <FiPlus /> {isCreating ? 'Creating...' : 'Create Semester Plan'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard with existing plan
  const { filled, total, percentage } = getProgress();
  const warnings = getMealVarietyWarnings();
  
  // Find current/next week
  const today = new Date();
  const currentWeekIndex = weekPlans.findIndex(w => {
    const start = new Date(w.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return today >= start && today < end;
  });
  
  const currentWeek = currentWeekIndex >= 0 ? weekPlans[currentWeekIndex] : weekPlans.find(w => new Date(w.startDate) > today) || weekPlans[weekPlans.length - 1];
  
  const favCount = recipes.filter(r => r.isFavourite).length;
  
  // Days to next shopping
  let daysToShopping = 0;
  if (currentWeek) {
    const shopDate = new Date(currentWeek.startDate);
    if (shopDate > today) {
      daysToShopping = differenceInDays(shopDate, today);
    } else {
      const nextWeekStart = new Date(shopDate);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      daysToShopping = differenceInDays(nextWeekStart, today);
    }
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">{semesterPlan.name}</h1>
        <p className="text-warm-500 dark:text-warm-400 mt-1">
          {format(new Date(semesterPlan.startDate), 'MMM d, yyyy')} • {semesterPlan.totalWeeks} Weeks
        </p>
      </header>

      {/* Progress & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-warm-900 rounded-xl p-5 shadow-sm border border-warm-100 dark:border-warm-800 md:col-span-2">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-semibold text-lg">Planning Progress</h2>
            <span className="text-sm text-warm-500">{filled} / {total} meals planned</span>
          </div>
          <div className="w-full bg-warm-200 dark:bg-warm-800 rounded-full h-3 mb-4">
            <div 
              className="bg-primary-500 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <button 
              onClick={handleAutoFill}
              className="flex items-center gap-2 bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-800 dark:text-warm-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <FiZap /> Auto-Fill Empty Slots
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-warm-900 rounded-xl p-5 shadow-sm border border-warm-100 dark:border-warm-800 flex flex-col justify-center items-center text-center">
          <FiCalendar className="text-3xl text-accent-500 mb-2" />
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">{daysToShopping}</h2>
          <p className="text-warm-500 text-sm">Days until next shopping</p>
          {currentWeek && (
            <Link 
              to={`/shopping/${currentWeek.weekNumber}`}
              className="mt-3 text-sm text-accent-600 dark:text-accent-400 font-medium hover:underline flex items-center gap-1"
            >
              <FiList /> View Shopping List
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Current Week */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-warm-900 rounded-xl shadow-sm border border-warm-100 dark:border-warm-800 overflow-hidden">
            <div className="p-4 border-b border-warm-100 dark:border-warm-800 flex justify-between items-center bg-warm-50 dark:bg-warm-800/50">
              <h2 className="font-semibold text-lg">Current Week (Week {currentWeek?.weekNumber})</h2>
              <Link to={`/plan/${currentWeek?.weekNumber}`} className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">
                Edit Week
              </Link>
            </div>
            <div className="p-4 divide-y divide-warm-100 dark:divide-warm-800">
              {currentWeek?.mealSlots.map(slot => {
                const recipe = recipes.find(r => r.id === slot.recipeId);
                return (
                  <div key={slot.id} className="py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-warm-500 font-medium uppercase tracking-wide capitalize">{slot.dayOfWeek}</p>
                      {recipe ? (
                        <p className="font-medium text-warm-900 dark:text-warm-100 mt-1">{recipe.name}</p>
                      ) : (
                        <p className="text-warm-400 italic mt-1">Empty Slot</p>
                      )}
                    </div>
                    {recipe && (
                      <Link to={`/recipe/${recipe.id}`} className="text-sm bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 px-3 py-1 rounded-md transition-colors">
                        View
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {warnings.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4">
              <h3 className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-400 mb-2">
                <FiAlertTriangle /> Planning Insights
              </h3>
              <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
                {warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Links */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-warm-900 rounded-xl shadow-sm border border-warm-100 dark:border-warm-800 p-5">
            <h2 className="font-semibold text-lg mb-4">Recipe Library</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-warm-50 dark:bg-warm-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-warm-900 dark:text-warm-50">{recipes.length}</div>
                <div className="text-xs text-warm-500 mt-1">Total Recipes</div>
              </div>
              <div className="bg-warm-50 dark:bg-warm-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{favCount}</div>
                <div className="text-xs text-warm-500 mt-1">Favourites</div>
              </div>
            </div>
            <Link to="/recipes" className="flex items-center justify-center gap-2 w-full bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 py-2 rounded-lg transition-colors font-medium">
              <FiBookOpen /> Browse Recipes
            </Link>
          </div>
          
          <div className="bg-white dark:bg-warm-900 rounded-xl shadow-sm border border-warm-100 dark:border-warm-800 p-5">
            <h2 className="font-semibold text-lg mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link to="/plan" className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors">
                <div className="bg-warm-100 dark:bg-warm-700 p-2 rounded-md"><FiCalendar className="text-warm-600 dark:text-warm-300" /></div>
                <div>
                  <div className="font-medium">Semester Calendar</div>
                  <div className="text-xs text-warm-500">View all {semesterPlan.totalWeeks} weeks</div>
                </div>
              </Link>
              <Link to="/import" className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors">
                <div className="bg-warm-100 dark:bg-warm-700 p-2 rounded-md"><FiPlus className="text-warm-600 dark:text-warm-300" /></div>
                <div>
                  <div className="font-medium">Import Recipe</div>
                  <div className="text-xs text-warm-500">Add from URL or manual</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
