import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe } from '../types/types';
import { db } from './db';

// ============================================================
// Recipe Store — manages all recipes (built-in + imported + API)
// ============================================================

interface RecipeFilters {
  search: string;
  veganOnly: boolean;
  quickOnly: boolean;
  favouritesOnly: boolean;
  cuisine: string;
  source: string;
  sortBy: 'name' | 'rating' | 'cookTime' | 'dateAdded' | 'timesUsed';
  sortDir: 'asc' | 'desc';
}

interface RecipeState {
  recipes: Recipe[];
  filters: RecipeFilters;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  loadRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'dateAdded' | 'timesUsed' | 'isFavourite' | 'rating'>) => Promise<Recipe>;
  addRecipes: (recipes: Recipe[]) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavourite: (id: string) => Promise<void>;
  toggleQuick: (id: string) => Promise<void>;
  setRating: (id: string, rating: number) => Promise<void>;
  rejectRecipe: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  getFilteredRecipes: () => Recipe[];
  getRecipeById: (id: string) => Recipe | undefined;
  getWeightedRandomRecipes: (count: number, options?: { preferQuick?: boolean; veganOnly?: boolean }) => Recipe[];
}

const DEFAULT_FILTERS: RecipeFilters = {
  search: '',
  veganOnly: false,
  quickOnly: false,
  favouritesOnly: false,
  cuisine: '',
  source: '',
  sortBy: 'name',
  sortDir: 'asc',
};

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  filters: DEFAULT_FILTERS,
  isLoading: false,
  isInitialized: false,

  loadRecipes: async () => {
    set({ isLoading: true });
    try {
      const recipes = await db.recipes.toArray();
      set({ recipes, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to load recipes:', error);
      set({ isLoading: false });
    }
  },

  addRecipe: async (recipeData) => {
    const recipe: Recipe = {
      ...recipeData,
      id: uuidv4(),
      dateAdded: new Date().toISOString(),
      timesUsed: 0,
      isFavourite: false,
      rating: 0,
    };
    await db.recipes.put(recipe);
    set((state) => ({ recipes: [...state.recipes, recipe] }));
    return recipe;
  },

  addRecipes: async (recipes) => {
    await db.recipes.bulkPut(recipes);
    set((state) => {
      const existingIds = new Set(state.recipes.map((r) => r.id));
      const newRecipes = recipes.filter((r) => !existingIds.has(r.id));
      return { recipes: [...state.recipes, ...newRecipes] };
    });
  },

  updateRecipe: async (id, updates) => {
    await db.recipes.update(id, updates);
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  },

  deleteRecipe: async (id) => {
    await db.recipes.delete(id);
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }));
  },

  toggleFavourite: async (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;
    const newFav = !recipe.isFavourite;
    await db.recipes.update(id, { isFavourite: newFav });
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, isFavourite: newFav } : r)),
    }));
  },

  toggleQuick: async (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    if (!recipe) return;
    const isQuick = !recipe.isQuick;
    await db.recipes.update(id, { isQuick });
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, isQuick } : r)),
    }));
  },

  setRating: async (id, rating) => {
    await db.recipes.update(id, { rating });
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, rating } : r)),
    }));
  },

  rejectRecipe: async (id) => {
    await db.recipes.update(id, { rejected: true });
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, rejected: true } : r)),
    }));
  },

  addNote: async (id, note) => {
    await db.recipes.update(id, { notes: note });
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? { ...r, notes: note } : r)),
    }));
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  getFilteredRecipes: () => {
    const { recipes, filters } = get();
    let filtered = recipes.filter((r) => !r.rejected);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q)) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.veganOnly) {
      filtered = filtered.filter((r) => r.isVegan);
    }

    if (filters.quickOnly) {
      filtered = filtered.filter((r) => r.isQuick);
    }

    if (filters.favouritesOnly) {
      filtered = filtered.filter((r) => r.isFavourite);
    }

    if (filters.cuisine) {
      filtered = filtered.filter((r) => r.cuisine.toLowerCase() === filters.cuisine.toLowerCase());
    }

    if (filters.source) {
      filtered = filtered.filter((r) => {
        if (filters.source === 'ai-generated') return r.source === 'ai-generated' || r.source === 'builtin';
        if (filters.source === 'online') return r.source === 'online' || r.source === 'api';
        if (filters.source === 'imported') return r.source === 'imported';
        return r.source === filters.source;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'rating':
          cmp = a.rating - b.rating;
          break;
        case 'cookTime':
          cmp = a.totalTime - b.totalTime;
          break;
        case 'dateAdded':
          cmp = a.dateAdded.localeCompare(b.dateAdded);
          break;
        case 'timesUsed':
          cmp = a.timesUsed - b.timesUsed;
          break;
      }
      return filters.sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  },

  getRecipeById: (id) => {
    return get().recipes.find((r) => r.id === id);
  },

  getWeightedRandomRecipes: (count, options = {}) => {
    const { recipes } = get();
    let pool = recipes.filter((r) => !r.rejected);

    if (options.veganOnly) {
      pool = pool.filter((r) => r.isVegan);
    }
    if (options.preferQuick) {
      // Weight quick recipes higher but don't exclude non-quick
      const quickPool = pool.filter((r) => r.isQuick);
      if (quickPool.length >= count) {
        pool = quickPool;
      }
    }

    // Build weighted array: favourites appear 3x
    const weighted: Recipe[] = [];
    for (const recipe of pool) {
      weighted.push(recipe);
      if (recipe.isFavourite) {
        weighted.push(recipe);
        weighted.push(recipe);
      }
    }

    // Shuffle and pick
    const shuffled = [...weighted].sort(() => Math.random() - 0.5);
    const seen = new Set<string>();
    const result: Recipe[] = [];

    for (const recipe of shuffled) {
      if (seen.has(recipe.id)) continue;
      seen.add(recipe.id);
      result.push(recipe);
      if (result.length >= count) break;
    }

    return result;
  },
}));
