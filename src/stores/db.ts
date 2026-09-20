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
    await db.settings.put({ ...DEFAULT_SETTINGS, id: 'app-settings', migratedRecipeSources: true });
  } else if (!existingSettings.migratedRecipeSources) {
    // One-time migration for existing databases:
    // 1. Existing user AI-imported recipes ('ai-generated') become 'imported'
    await db.recipes.where('source').equals('ai-generated').modify({ source: 'imported' });
    // 2. Existing starter recipes ('builtin') become 'ai-generated'
    await db.recipes.where('source').equals('builtin').modify({ source: 'ai-generated' });
    // 3. Existing Spoonacular recipes ('api') become 'online'
    await db.recipes.where('source').equals('api').modify({ source: 'online' });
    // Record that migration has run
    await db.settings.update('app-settings', { migratedRecipeSources: true });
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
    if (data.recipes && Array.isArray(data.recipes)) {
      const normalized = data.recipes.map((r: any) => {
        let source = r.source;
        if (source === 'builtin') source = 'ai-generated';
        else if (source === 'api') source = 'online';
        return { ...r, source };
      });
      await db.recipes.bulkPut(normalized);
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
