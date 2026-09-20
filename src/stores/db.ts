import Dexie, { type EntityTable } from 'dexie';
import type { Recipe, WeekPlan, SemesterPlan, ShoppingItem, AppSettings } from '../types/types';
import { DEFAULT_SETTINGS } from '../types/types';

// ============================================================
// IndexedDB Database via Dexie.js
// ============================================================

class MealPlannerDB extends Dexie {
  recipes!: EntityTable<Recipe, 'id'>;
  weekPlans!: EntityTable<WeekPlan, 'id'>;
  semesterPlans!: EntityTable<SemesterPlan, 'id'>;
  weeklyDefaults!: EntityTable<ShoppingItem, 'id'>;
  settings!: EntityTable<AppSettings & { id: string }, 'id'>;

  constructor() {
    super('MealPlannerDB');

    this.version(1).stores({
      recipes: 'id, name, cuisine, isVegan, isQuick, isFavourite, rating, timesUsed, source, dateAdded',
      weekPlans: 'id, semesterPlanId, weekNumber, startDate, isLocked',
      semesterPlans: 'id, name, startDate',
      weeklyDefaults: 'id, name, category',
      settings: 'id',
    });
  }
}

export const db = new MealPlannerDB();

// ============================================================
// Database Helpers
// ============================================================

export async function initializeDB(): Promise<void> {
  // Check if settings exist; if not, create default
  const existingSettings = await db.settings.get('app-settings');
  if (!existingSettings) {
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'app-settings' });
  }
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get('app-settings');
  if (!settings) {
    return DEFAULT_SETTINGS;
  }
  const { id: _, ...rest } = settings;
  return rest as AppSettings;
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  await db.settings.update('app-settings', partial);
}

export async function exportAllData(): Promise<string> {
  const recipes = await db.recipes.toArray();
  const weekPlans = await db.weekPlans.toArray();
  const semesterPlans = await db.semesterPlans.toArray();
  const weeklyDefaults = await db.weeklyDefaults.toArray();
  const settings = await db.settings.toArray();

  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    recipes,
    weekPlans,
    semesterPlans,
    weeklyDefaults,
    settings,
  }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);

  await db.transaction('rw', [db.recipes, db.weekPlans, db.semesterPlans, db.weeklyDefaults, db.settings], async () => {
    if (data.recipes) {
      await db.recipes.bulkPut(data.recipes);
    }
    if (data.weekPlans) {
      await db.weekPlans.bulkPut(data.weekPlans);
    }
    if (data.semesterPlans) {
      await db.semesterPlans.bulkPut(data.semesterPlans);
    }
    if (data.weeklyDefaults) {
      await db.weeklyDefaults.bulkPut(data.weeklyDefaults);
    }
    if (data.settings) {
      await db.settings.bulkPut(data.settings);
    }
  });
}
