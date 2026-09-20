import { useState, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { FiMoon, FiSun, FiCalendar, FiKey, FiDownload, FiUpload, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import type { DayOfWeek } from '../../types/types';
import { exportAllData, importAllData, db } from '../../stores/db';

export default function Settings() {
  const { settings, toggleDarkMode, toggleVeganOnly, setUnitSystem, setShoppingDay, setApiKey, updateSettings } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [apiKeyInput, setApiKeyInput] = useState(settings.spoonacularApiKey || '');

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
    alert('API Key saved successfully.');
  };

  const handleExport = async () => {
    try {
      const dataStr = await exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-food-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export data.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importAllData(text);
        alert('Data imported successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Please check that the file is valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to completely clear all data? This cannot be undone.')) {
      await db.recipes.clear();
      await db.weekPlans.clear();
      await db.semesterPlans.clear();
      await db.weeklyDefaults.clear();
      alert('Data cleared. Reloading application...');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Settings</h1>
        <p className="text-stone-500">Manage your preferences, integrations, and data.</p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-bold text-stone-800">Preferences</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-stone-800">Dark Mode</h3>
                <p className="text-sm text-stone-500">Toggle dark theme for the application.</p>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center px-1 ${settings.darkMode ? 'bg-emerald-500' : 'bg-stone-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform flex items-center justify-center ${settings.darkMode ? 'translate-x-7 text-emerald-500' : 'translate-x-0 text-stone-400'}`}>
                  {settings.darkMode ? <FiMoon size={12} /> : <FiSun size={12} />}
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-6">
              <div>
                <h3 className="font-medium text-stone-800 flex items-center gap-2">Vegan Only Mode <span>🌱</span></h3>
                <p className="text-sm text-stone-500">Only show vegan recipes across the app.</p>
              </div>
              <button 
                onClick={toggleVeganOnly}
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center px-1 ${settings.veganOnly ? 'bg-emerald-500' : 'bg-stone-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${settings.veganOnly ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-6">
              <div>
                <h3 className="font-medium text-stone-800">Unit System</h3>
                <p className="text-sm text-stone-500">Preferred units for recipes and shopping.</p>
              </div>
              <div className="flex bg-stone-100 rounded-lg p-1">
                <button 
                  onClick={() => setUnitSystem('metric')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${settings.unitSystem === 'metric' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Metric
                </button>
                <button 
                  onClick={() => setUnitSystem('imperial')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${settings.unitSystem === 'imperial' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Imperial
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 border-t border-stone-100 pt-6">
              <h3 className="font-medium text-stone-800">Default Shopping Day</h3>
              <p className="text-sm text-stone-500 mb-2">The day your week starts.</p>
              <select 
                value={settings.shoppingDay}
                onChange={e => setShoppingDay(e.target.value as DayOfWeek)}
                className="w-full max-w-xs px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-900 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2 border-t border-stone-100 pt-6">
              <h3 className="font-medium text-stone-800">Semester Length (Weeks)</h3>
              <p className="text-sm text-stone-500 mb-2">Default number of weeks when creating a new plan.</p>
              <input 
                type="number" min="1" max="52"
                value={settings.semesterWeeks}
                onChange={e => updateSettings({ semesterWeeks: parseInt(e.target.value) || 16 })}
                className="w-full max-w-xs px-3 py-2 border border-stone-300 rounded-md bg-white text-stone-900 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2"><FiKey /> Integrations</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-medium text-stone-800 mb-2">Spoonacular API Key</h3>
              <p className="text-sm text-stone-500 mb-4">Used for fetching external recipes and AI generation.</p>
              <div className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <input 
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-md bg-white text-stone-900 placeholder-stone-400 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter API key..."
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                <button 
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-900 font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-6">
              <h3 className="font-medium text-stone-800 mb-2 flex items-center gap-2"><FiCalendar /> Google Calendar</h3>
              <p className="text-sm text-stone-500 mb-4">Export your meal plans directly to Google Calendar.</p>
              <button 
                className={`px-4 py-2 rounded-md font-medium transition-colors border ${settings.googleCalendarConnected ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                onClick={() => updateSettings({ googleCalendarConnected: !settings.googleCalendarConnected })}
              >
                {settings.googleCalendarConnected ? 'Disconnect Calendar' : 'Connect Calendar'}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
            <h2 className="text-lg font-bold text-stone-800">Data Management</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={handleExport} className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-stone-600 hover:text-emerald-700">
              <FiDownload size={24} />
              <span className="font-medium">Export All Data</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportFile} 
            />
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-stone-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-stone-600 hover:text-blue-700">
              <FiUpload size={24} />
              <span className="font-medium">Import Data</span>
            </button>
            <button onClick={handleClear} className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-red-100 bg-red-50 hover:bg-red-100 transition-colors text-red-600 hover:text-red-700">
              <FiTrash2 size={24} />
              <span className="font-medium">Clear All Data</span>
            </button>
          </div>
        </section>

        <footer className="text-center text-stone-400 text-sm py-8">
          <p>MyFood Semester Meal Planner v1.0.0</p>
          <p className="mt-1">Built with React, Vite & Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}
