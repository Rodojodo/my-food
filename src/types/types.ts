// ============================================================
// Core Type Definitions for Semester Meal Planner
// ============================================================

// -- Enums & Constants --

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export type MealTime = 'lunch' | 'dinner';

export type UnitSystem = 'imperial' | 'metric';

export type RecipeSource = 'builtin' | 'imported' | 'api' | 'ai-generated';

export type IngredientCategory =
  | 'produce'
  | 'dairy'
  | 'grains'
  | 'canned'
  | 'spices'
  | 'oils'
  | 'frozen'
  | 'bakery'
  | 'condiments'
  | 'protein'
  | 'other';

// -- Ingredient --

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: IngredientCategory;
  isCommon: boolean;       // staple items: salt, pepper, oil, etc.
  isNut: boolean;
  nutSubstitute?: string;  // e.g. "sunflower seeds" in place of "pine nuts"
  notes?: string;          // e.g. "finely diced", "optional garnish"
}

// -- Method Step --

export interface MethodStep {
  stepNumber: number;
  instruction: string;
  timerMinutes?: number;   // optional built-in timer for this step
}

// -- Recipe --

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image?: string;
  ingredients: Ingredient[];
  method: MethodStep[];
  servings: number;
  prepTime: number;        // minutes
  cookTime: number;        // minutes
  totalTime: number;       // minutes
  tags: string[];
  cuisine: string;
  isVegan: boolean;
  isQuick: boolean;        // totalTime <= 30
  isFavourite: boolean;
  rating: number;          // 1-5
  source: RecipeSource;
  sourceUrl?: string;
  nutNotes?: string;       // explanation of nut substitutions
  unitSystem: UnitSystem;
  notes?: string;          // user's personal notes
  dateAdded: string;       // ISO date
  timesUsed: number;
  lastUsed?: string;       // ISO date
  rejected?: boolean;      // swiped left — don't show again
}

// -- Meal Planning --

export interface MealSlot {
  id: string;
  recipeId: string | null;
  servings: number;
  dayOfWeek: DayOfWeek;
  mealTime: MealTime;
  preferQuick: boolean;
}

export interface MealSlotConfig {
  count: number;
  servings: number;
  preferQuick: boolean;
}

export interface MealConfig {
  slots: MealSlotConfig[];
}

export const DEFAULT_MEAL_CONFIG: MealConfig = {
  slots: [
    { count: 2, servings: 4, preferQuick: false },  // 2 meals × 4 servings (2 people × 2 nights each)
    { count: 2, servings: 2, preferQuick: true },    // 2 meals × 2 servings (2 people × 1 night, quick)
  ],
};

// -- Shopping --

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category: IngredientCategory;
  checked: boolean;
  isWeeklyDefault: boolean;
  isExtra: boolean;          // manually added, not from recipes
  fromRecipes?: string[];    // recipe IDs that need this ingredient
}

export interface CommonIngredientCheck {
  name: string;
  alreadyHave: boolean;
}

// -- Week Plan --

export interface WeekPlan {
  id: string;
  weekNumber: number;       // 1-based
  startDate: string;        // ISO date of the week's start (shopping day)
  mealSlots: MealSlot[];
  mealConfig: MealConfig;
  extraItems: ShoppingItem[];
  commonChecks: CommonIngredientCheck[];
  isLocked: boolean;        // prevent auto-fill from changing this week
}

// -- Semester Plan --

export interface SemesterPlan {
  id: string;
  name: string;
  startDate: string;        // ISO date
  totalWeeks: number;
  shoppingDay: DayOfWeek;
  defaultMealConfig: MealConfig;
  weeklyDefaults: ShoppingItem[];  // recurring weekly purchases
  unitSystem: UnitSystem;
}

// -- App Settings --

export interface AppSettings {
  unitSystem: UnitSystem;
  veganOnly: boolean;
  shoppingDay: DayOfWeek;
  darkMode: boolean;
  googleCalendarConnected: boolean;
  spoonacularApiKey: string;
  semesterWeeks: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  unitSystem: 'metric',
  veganOnly: false,
  shoppingDay: 'saturday',
  darkMode: false,
  googleCalendarConnected: false,
  spoonacularApiKey: '',
  semesterWeeks: 16,
};

// -- Calendar Events --

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  url?: string;
}

// -- Spoonacular API Types --

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  vegetarian: boolean;
  vegan: boolean;
  spoonacularScore: number;
  extendedIngredients: SpoonacularIngredient[];
  analyzedInstructions: SpoonacularInstruction[];
  sourceUrl: string;
}

export interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  aisle: string;
}

export interface SpoonacularInstruction {
  name: string;
  steps: { number: number; step: string }[];
}
