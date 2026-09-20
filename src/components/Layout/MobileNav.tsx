import { NavLink } from 'react-router-dom';
import { FiHome, FiBook, FiCalendar, FiDownloadCloud, FiSettings } from 'react-icons/fi';

export default function MobileNav() {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-warm-500 hover:text-warm-800 dark:hover:text-warm-300'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-warm-900 border-t border-warm-200 dark:border-warm-800 flex justify-between items-center px-2 z-30 pb-safe">
      <NavLink to="/" className={navItemClass}>
        <FiHome className="text-xl" />
        <span className="text-[10px] font-medium">Home</span>
      </NavLink>
      <NavLink to="/recipes" className={navItemClass}>
        <FiBook className="text-xl" />
        <span className="text-[10px] font-medium">Recipes</span>
      </NavLink>
      <NavLink to="/plan" className={navItemClass}>
        <FiCalendar className="text-xl" />
        <span className="text-[10px] font-medium">Plan</span>
      </NavLink>
      <NavLink to="/import" className={navItemClass}>
        <FiDownloadCloud className="text-xl" />
        <span className="text-[10px] font-medium">Import</span>
      </NavLink>
      <NavLink to="/settings" className={navItemClass}>
        <FiSettings className="text-xl" />
        <span className="text-[10px] font-medium">Settings</span>
      </NavLink>
    </nav>
  );
}
