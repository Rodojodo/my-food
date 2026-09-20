import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { FiHome, FiBook, FiCalendar, FiDownloadCloud, FiSettings, FiChevronLeft, FiChevronRight, FiList } from 'react-icons/fi';
import { usePlanStore } from '../../stores/planStore';
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { semesterPlan, weekPlans } = usePlanStore();

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100 font-medium'
        : 'hover:bg-warm-100 text-warm-700 dark:hover:bg-warm-800 dark:text-warm-300'
    }`;

  // Find next shopping day
  let nextShoppingWeek = null;
  if (semesterPlan && weekPlans.length > 0) {
    nextShoppingWeek = weekPlans.find(w => new Date(w.startDate) >= new Date()) || weekPlans[0];
  }

  return (
    <aside
      className={`hidden md:flex flex-col bg-white dark:bg-warm-900 border-r border-warm-200 dark:border-warm-800 h-full transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between border-b border-warm-100 dark:border-warm-800">
        <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} transition-all`}>
          <span className="text-2xl">🍽️</span>
          <span className="font-bold text-lg text-primary-800 dark:text-primary-300 whitespace-nowrap">Meal Planner</span>
        </div>
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-full hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-500 transition-colors shrink-0"
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <NavLink to="/" className={navItemClass} title="Dashboard">
          <FiHome className="text-xl shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/recipes" className={navItemClass} title="Recipes">
          <FiBook className="text-xl shrink-0" />
          {!collapsed && <span>Recipes</span>}
        </NavLink>
        
        <div className="pt-4 pb-2">
          <NavLink to="/plan" className={navItemClass} title="Semester Plan">
            <FiCalendar className="text-xl shrink-0" />
            {!collapsed && <span>Semester Plan</span>}
          </NavLink>
          
          {!collapsed && semesterPlan && weekPlans.length > 0 && (
            <div className="mt-2 ml-8 pl-4 border-l border-warm-200 dark:border-warm-700 space-y-1">
              {weekPlans.slice(0, 3).map((week) => (
                <NavLink
                  key={week.id}
                  to={`/plan/${week.weekNumber}`}
                  className={({ isActive }) =>
                    `block px-2 py-1 text-sm rounded transition-colors ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-warm-500 hover:text-warm-800 dark:hover:text-warm-200'
                    }`
                  }
                >
                  Week {week.weekNumber}
                </NavLink>
              ))}
              {weekPlans.length > 3 && (
                <NavLink to="/plan" className="block px-2 py-1 text-xs text-warm-400 hover:text-primary-500">
                  View all {weekPlans.length} weeks...
                </NavLink>
              )}
            </div>
          )}
        </div>

        <NavLink to="/import" className={navItemClass} title="Import Recipes">
          <FiDownloadCloud className="text-xl shrink-0" />
          {!collapsed && <span>Import Recipes</span>}
        </NavLink>
      </nav>

      <div className="p-4 border-t border-warm-200 dark:border-warm-800 space-y-2">
        {nextShoppingWeek && (
          <NavLink
            to={`/shopping/${nextShoppingWeek.weekNumber}`}
            className="flex items-center justify-center gap-2 w-full bg-accent-100 hover:bg-accent-200 dark:bg-accent-900/30 dark:hover:bg-accent-900/50 text-accent-800 dark:text-accent-300 py-2 px-3 rounded-lg transition-colors overflow-hidden"
            title="Shopping List"
          >
            <FiList className="text-lg shrink-0" />
            {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Shopping List</span>}
          </NavLink>
        )}
        
        <NavLink to="/settings" className={navItemClass} title="Settings">
          <FiSettings className="text-xl shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
