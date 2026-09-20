import type { Recipe, Ingredient, MethodStep } from '../types/types';
import { v4 as uuidv4 } from 'uuid';
import { NUT_INGREDIENTS, NUT_SUBSTITUTES } from '../data/commonIngredients';

const cache = new Map<string, Recipe[]>();

export function isApiKeyConfigured(): boolean {
  return !!(localStorage.getItem('spoonacular_api_key') || '');
}

function getApiKey(): string {
  return localStorage.getItem('spoonacular_api_key') || '';
}

function mapIngredientCategory(aisle: string): Ingredient['category'] {
  const a = (aisle || '').toLowerCase();
  if (a.includes('produce') || a.includes('vegetable') || a.includes('fruit')) return 'produce';
  if (a.includes('dairy') || a.includes('cheese') || a.includes('milk')) return 'dairy';
  if (a.includes('spice') || a.includes('seasoning')) return 'spices';
  if (a.includes('oil') || a.includes('vinegar')) return 'oils';
  if (a.includes('pasta') || a.includes('grain') || a.includes('rice') || a.includes('bread') || a.includes('baking')) return 'grains';
  if (a.includes('canned') || a.includes('jarred')) return 'canned';
  if (a.includes('frozen')) return 'frozen';
  if (a.includes('condiment') || a.includes('sauce')) return 'condiments';
  return 'other';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSpoonacularRecipe(data: any): Recipe {
  const ingredients: Ingredient[] = (data.extendedIngredients || []).map((ing: any) => {
    const name = ing.nameClean || ing.name || 'Unknown';
    const nameLower = name.toLowerCase();
    const matchedNut = NUT_INGREDIENTS.find(nut => nameLower.includes(nut));
    return {
      name,
      amount: ing.amount ?? 0,
      unit: ing.unit || '',
      category: mapIngredientCategory(ing.aisle),
      isCommon: false,
      isNut: !!matchedNut,
      nutSubstitute: matchedNut ? NUT_SUBSTITUTES[matchedNut] : undefined,
    };
  });

  const method: MethodStep[] = (data.analyzedInstructions?.[0]?.steps || []).map((step: any) => ({
    stepNumber: step.number,
    instruction: step.step,
  }));

  const totalTime = data.readyInMinutes || 30;

  return {
    id: uuidv4(),
    name: data.title || 'Untitled Recipe',
    description: data.summary ? data.summary.replace(/<[^>]*>?/gm, '') : '',
    image: data.image || undefined,
    ingredients,
    method,
    servings: data.servings || 4,
    prepTime: data.preparationMinutes || Math.round(totalTime * 0.3),
    cookTime: data.cookingMinutes || Math.round(totalTime * 0.7),
    totalTime,
    tags: [
      data.vegetarian ? 'vegetarian' : '',
      data.vegan ? 'vegan' : '',
      data.glutenFree ? 'gluten-free' : '',
    ].filter(Boolean),
    cuisine: (data.cuisines && data.cuisines[0]) || 'International',
    isVegan: !!data.vegan,
    isQuick: totalTime <= 30,
    isFavourite: false,
    rating: data.spoonacularScore ? Math.round((data.spoonacularScore / 100) * 5) : 0,
    source: 'online' as const,
    sourceUrl: data.sourceUrl || undefined,
    unitSystem: 'imperial',
    dateAdded: new Date().toISOString(),
    timesUsed: 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function searchRecipes(query: string, options: { vegan?: boolean; offset?: number } = {}): Promise<Recipe[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const diet = options.vegan ? 'vegan' : 'vegetarian';
  const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&diet=${diet}&intolerances=peanut,tree%20nut&addRecipeInformation=true&fillIngredients=true&offset=${options.offset || 0}&number=10&apiKey=${apiKey}`;

  const cacheKey = `search:${query}:${diet}:${options.offset}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    const data = await res.json();
    const recipes = (data.results || []).map(mapSpoonacularRecipe);
    cache.set(cacheKey, recipes);
    return recipes;
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
}

export async function getRandomRecipes(count: number, options: { vegan?: boolean } = {}): Promise<Recipe[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const tags = options.vegan ? 'vegan' : 'vegetarian';
  const url = `https://api.spoonacular.com/recipes/random?number=${count}&tags=${tags}&apiKey=${apiKey}`;

  const cacheKey = `random:${count}:${tags}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    const data = await res.json();
    const recipes = (data.recipes || []).map(mapSpoonacularRecipe);
    cache.set(cacheKey, recipes);
    return recipes;
  } catch (error) {
    console.error('Error getting random recipes:', error);
    return [];
  }
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API request failed: ${res.status}`);
    const data = await res.json();
    return mapSpoonacularRecipe(data);
  } catch (error) {
    console.error('Error getting recipe by ID:', error);
    return null;
  }
}
