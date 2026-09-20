import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import Dashboard from './components/Layout/Dashboard';
import RecipeBrowser from './components/Recipes/RecipeBrowser';
import RecipeDetail from './components/Recipes/RecipeDetail';
import RecipeImport from './components/Import/RecipeImport';
import SemesterCalendar from './components/Calendar/SemesterCalendar';
import WeekPlanner from './components/Calendar/WeekPlanner';
import ShoppingList from './components/Shopping/ShoppingList';
import SwipeDiscovery from './components/Swipe/SwipeDiscovery';
import Settings from './components/Settings/Settings';
import { useSettingsStore } from './stores/settingsStore';
import { useRecipeStore } from './stores/recipeStore';
import { usePlanStore } from './stores/planStore';
import { initializeDB } from './stores/db';
import { FiCompass } from 'react-icons/fi';
import './app.css';

export default function App() {
  const { loadSettings } = useSettingsStore();
  const { loadRecipes } = useRecipeStore();
  const { loadPlans } = usePlanStore();
  const [initialized, setInitialized] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await initializeDB();
      await loadSettings();
      await loadRecipes();
      await loadPlans();
      setInitialized(true);
    };
    initApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-warm-50 dark:bg-warm-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-warm-600 dark:text-warm-300 text-lg">Loading Meal Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-warm-50 dark:bg-warm-900 text-warm-900 dark:text-warm-50 font-sans">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative">
          <div className="container mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recipes" element={<RecipeBrowser />} />
              <Route path="/recipe/:id" element={<RecipeDetail />} />
              <Route path="/plan" element={<SemesterCalendar />} />
              <Route path="/plan/:weekNumber" element={<WeekPlanner />} />
              <Route path="/shopping/:weekNumber" element={<ShoppingList />} />
              <Route path="/import" element={<RecipeImport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Floating Action Button — Swipe Discovery */}
          <button
            onClick={() => setShowSwipe(true)}
            className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40
                       bg-accent-500 hover:bg-accent-600 text-white
                       rounded-full w-14 h-14 shadow-lg
                       flex items-center justify-center
                       transition-all duration-200 hover:scale-110
                       active:scale-95"
            aria-label="Discover new recipes"
            title="Discover new recipes"
          >
            <FiCompass className="text-2xl" />
          </button>

          {/* Swipe Discovery Modal */}
          <SwipeDiscovery isOpen={showSwipe} onClose={() => setShowSwipe(false)} />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    </HashRouter>
  );
}
