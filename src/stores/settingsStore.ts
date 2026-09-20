import { create } from 'zustand';
import type { AppSettings, DayOfWeek, UnitSystem } from '../types/types';
import { DEFAULT_SETTINGS } from '../types/types';
import { getSettings, updateSettings as dbUpdateSettings } from './db';

// ============================================================
// Settings Store
// ============================================================

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  toggleVeganOnly: () => Promise<void>;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  setShoppingDay: (day: DayOfWeek) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await getSettings();
      set({ settings, isLoading: false });

      // Apply dark mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    await dbUpdateSettings(updates);
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  toggleDarkMode: async () => {
    const newDark = !get().settings.darkMode;
    await dbUpdateSettings({ darkMode: newDark });
    set((state) => ({
      settings: { ...state.settings, darkMode: newDark },
    }));
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleVeganOnly: async () => {
    const newVegan = !get().settings.veganOnly;
    await dbUpdateSettings({ veganOnly: newVegan });
    set((state) => ({
      settings: { ...state.settings, veganOnly: newVegan },
    }));
  },

  setUnitSystem: async (system) => {
    await dbUpdateSettings({ unitSystem: system });
    set((state) => ({
      settings: { ...state.settings, unitSystem: system },
    }));
  },

  setShoppingDay: async (day) => {
    await dbUpdateSettings({ shoppingDay: day });
    set((state) => ({
      settings: { ...state.settings, shoppingDay: day },
    }));
  },

  setApiKey: async (key) => {
    await dbUpdateSettings({ spoonacularApiKey: key });
    localStorage.setItem('spoonacular_api_key', key);
    set((state) => ({
      settings: { ...state.settings, spoonacularApiKey: key },
    }));
  },
}));
