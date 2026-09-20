import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { addWeeks, format } from 'date-fns';
import type {
  SemesterPlan,
  WeekPlan,
  MealSlot,
  MealConfig,
  DayOfWeek,
  ShoppingItem,
  CommonIngredientCheck,
} from '../types/types';
import { db } from './db';

// ============================================================
// Plan Store — manages semester plans and week plans
// ============================================================

const DAYS_AFTER_SHOPPING: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function generateMealSlots(config: MealConfig, shoppingDay: DayOfWeek): MealSlot[] {
  const slots: MealSlot[] = [];
  const shoppingIdx = DAYS_AFTER_SHOPPING.indexOf(shoppingDay);

  // Distribute meals across the week starting from the day after shopping
  let dayIdx = 0;
  for (const slotConfig of config.slots) {
    for (let i = 0; i < slotConfig.count; i++) {
      const dayOfWeek = DAYS_AFTER_SHOPPING[(shoppingIdx + 1 + dayIdx) % 7];
      slots.push({
        id: uuidv4(),
        recipeId: null,
        servings: slotConfig.servings,
        dayOfWeek,
        mealTime: 'dinner',
        preferQuick: slotConfig.preferQuick,
      });
      dayIdx++;
    }
  }

  return slots;
}

interface PlanState {
  semesterPlan: SemesterPlan | null;
  weekPlans: WeekPlan[];
  isLoading: boolean;

  // Actions
  loadPlans: () => Promise<void>;
  createSemesterPlan: (params: {
    name: string;
    startDate: string;
    totalWeeks: number;
    shoppingDay: DayOfWeek;
    mealConfig: MealConfig;
  }) => Promise<SemesterPlan>;
  updateSemesterPlan: (updates: Partial<SemesterPlan>) => Promise<void>;
  deleteSemesterPlan: () => Promise<void>;

  // Week plan actions
  getWeekPlan: (weekNumber: number) => WeekPlan | undefined;
  updateWeekPlan: (weekNumber: number, updates: Partial<WeekPlan>) => Promise<void>;
  assignRecipe: (weekNumber: number, slotId: string, recipeId: string) => Promise<void>;
  removeRecipe: (weekNumber: number, slotId: string) => Promise<void>;
  swapMeals: (weekNumber: number, slotId1: string, slotId2: string) => Promise<void>;
  updateMealConfig: (weekNumber: number, config: MealConfig) => Promise<void>;
  addExtraItem: (weekNumber: number, item: Omit<ShoppingItem, 'id'>) => Promise<void>;
  removeExtraItem: (weekNumber: number, itemId: string) => Promise<void>;
  updateCommonCheck: (weekNumber: number, name: string, alreadyHave: boolean) => Promise<void>;
  lockWeek: (weekNumber: number, locked: boolean) => Promise<void>;

  // Weekly defaults
  addWeeklyDefault: (item: Omit<ShoppingItem, 'id' | 'isWeeklyDefault'>) => Promise<void>;
  removeWeeklyDefault: (itemId: string) => Promise<void>;
  getWeeklyDefaults: () => ShoppingItem[];

  // Bulk operations
  autoFillWeek: (weekNumber: number, getRandomRecipes: (count: number, options?: { preferQuick?: boolean; veganOnly?: boolean }) => import('../types/types').Recipe[]) => Promise<void>;
  autoFillAllWeeks: (getRandomRecipes: (count: number, options?: { preferQuick?: boolean; veganOnly?: boolean }) => import('../types/types').Recipe[]) => Promise<void>;

  // Stats
  getProgress: () => { filled: number; total: number; percentage: number };
  getMealVarietyWarnings: () => string[];
}

export const usePlanStore = create<PlanState>((set, get) => ({
  semesterPlan: null,
  weekPlans: [],
  isLoading: false,

  loadPlans: async () => {
    set({ isLoading: true });
    try {
      const plans = await db.semesterPlans.toArray();
      const semesterPlan = plans.length > 0 ? plans[0] : null;
      const weekPlans = await db.weekPlans.orderBy('weekNumber').toArray();
      set({ semesterPlan, weekPlans, isLoading: false });
    } catch (error) {
      console.error('Failed to load plans:', error);
      set({ isLoading: false });
    }
  },

  createSemesterPlan: async (params) => {
    // Delete existing plans
    await db.semesterPlans.clear();
    await db.weekPlans.clear();

    const plan: SemesterPlan = {
      id: uuidv4(),
      name: params.name,
      startDate: params.startDate,
      totalWeeks: params.totalWeeks,
      shoppingDay: params.shoppingDay,
      defaultMealConfig: params.mealConfig,
      weeklyDefaults: [],
      unitSystem: 'metric',
    };

    // Generate week plans
    const weekPlans: WeekPlan[] = [];
    const start = new Date(params.startDate);

    for (let i = 0; i < params.totalWeeks; i++) {
      const weekStart = addWeeks(start, i);
      const weekPlan: WeekPlan = {
        id: uuidv4(),
        weekNumber: i + 1,
        startDate: format(weekStart, 'yyyy-MM-dd'),
        mealSlots: generateMealSlots(params.mealConfig, params.shoppingDay),
        mealConfig: params.mealConfig,
        extraItems: [],
        commonChecks: [],
        isLocked: false,
      };
      weekPlans.push(weekPlan);
    }

    await db.semesterPlans.put(plan);
    await db.weekPlans.bulkPut(weekPlans);

    set({ semesterPlan: plan, weekPlans });
    return plan;
  },

  updateSemesterPlan: async (updates) => {
    const { semesterPlan } = get();
    if (!semesterPlan) return;
    await db.semesterPlans.update(semesterPlan.id, updates);
    set({ semesterPlan: { ...semesterPlan, ...updates } });
  },

  deleteSemesterPlan: async () => {
    await db.semesterPlans.clear();
    await db.weekPlans.clear();
    set({ semesterPlan: null, weekPlans: [] });
  },

  getWeekPlan: (weekNumber) => {
    return get().weekPlans.find((w) => w.weekNumber === weekNumber);
  },

  updateWeekPlan: async (weekNumber, updates) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    await db.weekPlans.update(wp.id, updates);
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, ...updates } : w
      ),
    }));
  },

  assignRecipe: async (weekNumber, slotId, recipeId) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const newSlots = wp.mealSlots.map((s) =>
      s.id === slotId ? { ...s, recipeId } : s
    );
    await db.weekPlans.update(wp.id, { mealSlots: newSlots });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, mealSlots: newSlots } : w
      ),
    }));
  },

  removeRecipe: async (weekNumber, slotId) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const newSlots = wp.mealSlots.map((s) =>
      s.id === slotId ? { ...s, recipeId: null } : s
    );
    await db.weekPlans.update(wp.id, { mealSlots: newSlots });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, mealSlots: newSlots } : w
      ),
    }));
  },

  swapMeals: async (weekNumber, slotId1, slotId2) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const slot1 = wp.mealSlots.find((s) => s.id === slotId1);
    const slot2 = wp.mealSlots.find((s) => s.id === slotId2);
    if (!slot1 || !slot2) return;

    const newSlots = wp.mealSlots.map((s) => {
      if (s.id === slotId1) return { ...s, recipeId: slot2.recipeId };
      if (s.id === slotId2) return { ...s, recipeId: slot1.recipeId };
      return s;
    });
    await db.weekPlans.update(wp.id, { mealSlots: newSlots });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, mealSlots: newSlots } : w
      ),
    }));
  },

  updateMealConfig: async (weekNumber, config) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const shoppingDay = get().semesterPlan?.shoppingDay || 'saturday';
    const newSlots = generateMealSlots(config, shoppingDay);
    // Preserve existing recipe assignments where possible
    for (let i = 0; i < Math.min(newSlots.length, wp.mealSlots.length); i++) {
      newSlots[i].recipeId = wp.mealSlots[i].recipeId;
    }
    await db.weekPlans.update(wp.id, { mealSlots: newSlots, mealConfig: config });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, mealSlots: newSlots, mealConfig: config } : w
      ),
    }));
  },

  addExtraItem: async (weekNumber, item) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const newItem: ShoppingItem = { ...item, id: uuidv4() };
    const newExtras = [...wp.extraItems, newItem];
    await db.weekPlans.update(wp.id, { extraItems: newExtras });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, extraItems: newExtras } : w
      ),
    }));
  },

  removeExtraItem: async (weekNumber, itemId) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const newExtras = wp.extraItems.filter((i) => i.id !== itemId);
    await db.weekPlans.update(wp.id, { extraItems: newExtras });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, extraItems: newExtras } : w
      ),
    }));
  },

  updateCommonCheck: async (weekNumber, name, alreadyHave) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    const existing = wp.commonChecks.find((c) => c.name === name);
    let newChecks: CommonIngredientCheck[];
    if (existing) {
      newChecks = wp.commonChecks.map((c) =>
        c.name === name ? { ...c, alreadyHave } : c
      );
    } else {
      newChecks = [...wp.commonChecks, { name, alreadyHave }];
    }
    await db.weekPlans.update(wp.id, { commonChecks: newChecks });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, commonChecks: newChecks } : w
      ),
    }));
  },

  lockWeek: async (weekNumber, locked) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp) return;
    await db.weekPlans.update(wp.id, { isLocked: locked });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, isLocked: locked } : w
      ),
    }));
  },

  addWeeklyDefault: async (item) => {
    const { semesterPlan } = get();
    if (!semesterPlan) return;
    const newItem: ShoppingItem = { ...item, id: uuidv4(), isWeeklyDefault: true };
    const newDefaults = [...semesterPlan.weeklyDefaults, newItem];
    await db.semesterPlans.update(semesterPlan.id, { weeklyDefaults: newDefaults });
    set({ semesterPlan: { ...semesterPlan, weeklyDefaults: newDefaults } });
  },

  removeWeeklyDefault: async (itemId) => {
    const { semesterPlan } = get();
    if (!semesterPlan) return;
    const newDefaults = semesterPlan.weeklyDefaults.filter((i) => i.id !== itemId);
    await db.semesterPlans.update(semesterPlan.id, { weeklyDefaults: newDefaults });
    set({ semesterPlan: { ...semesterPlan, weeklyDefaults: newDefaults } });
  },

  getWeeklyDefaults: () => {
    return get().semesterPlan?.weeklyDefaults || [];
  },

  autoFillWeek: async (weekNumber, getRandomRecipes) => {
    const wp = get().weekPlans.find((w) => w.weekNumber === weekNumber);
    if (!wp || wp.isLocked) return;

    const emptySlots = wp.mealSlots.filter((s) => !s.recipeId);
    if (emptySlots.length === 0) return;

    // Get recipes for quick and regular slots separately
    const quickSlots = emptySlots.filter((s) => s.preferQuick);
    const regularSlots = emptySlots.filter((s) => !s.preferQuick);

    const quickRecipes = quickSlots.length > 0
      ? getRandomRecipes(quickSlots.length, { preferQuick: true })
      : [];
    const regularRecipes = regularSlots.length > 0
      ? getRandomRecipes(regularSlots.length)
      : [];

    const newSlots = [...wp.mealSlots];
    let qIdx = 0;
    let rIdx = 0;

    for (const slot of newSlots) {
      if (slot.recipeId) continue;
      if (slot.preferQuick && qIdx < quickRecipes.length) {
        slot.recipeId = quickRecipes[qIdx].id;
        qIdx++;
      } else if (rIdx < regularRecipes.length) {
        slot.recipeId = regularRecipes[rIdx].id;
        rIdx++;
      }
    }

    await db.weekPlans.update(wp.id, { mealSlots: newSlots });
    set((state) => ({
      weekPlans: state.weekPlans.map((w) =>
        w.weekNumber === weekNumber ? { ...w, mealSlots: newSlots } : w
      ),
    }));
  },

  autoFillAllWeeks: async (getRandomRecipes) => {
    const { weekPlans } = get();
    for (const wp of weekPlans) {
      if (!wp.isLocked) {
        await get().autoFillWeek(wp.weekNumber, getRandomRecipes);
      }
    }
  },

  getProgress: () => {
    const { weekPlans } = get();
    const total = weekPlans.reduce((acc, w) => acc + w.mealSlots.length, 0);
    const filled = weekPlans.reduce(
      (acc, w) => acc + w.mealSlots.filter((s) => s.recipeId).length,
      0
    );
    return {
      filled,
      total,
      percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  },

  getMealVarietyWarnings: () => {
    const { weekPlans } = get();
    const recipeCounts: Record<string, number> = {};
    for (const wp of weekPlans) {
      for (const slot of wp.mealSlots) {
        if (slot.recipeId) {
          recipeCounts[slot.recipeId] = (recipeCounts[slot.recipeId] || 0) + 1;
        }
      }
    }
    const warnings: string[] = [];
    for (const [recipeId, count] of Object.entries(recipeCounts)) {
      if (count > 3) {
        warnings.push(`Recipe ${recipeId} appears ${count} times across the semester. Consider more variety!`);
      }
    }
    return warnings;
  },
}));
