import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Ingredient, MethodStep, IngredientCategory } from '../types/types';
import { NUT_INGREDIENTS, NUT_SUBSTITUTES } from '../data/commonIngredients';

export function getGeminiApiKey(): string {
  return localStorage.getItem('gemini_api_key') || '';
}

export function isGeminiConfigured(): boolean {
  return !!getGeminiApiKey().trim();
}

interface GeminiRecipeSchema {
  name: string;
  description: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  isVegan: boolean;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    category?: string;
  }[];
  method: {
    stepNumber: number;
    instruction: string;
    timerMinutes?: number;
  }[];
}

export async function generateGeminiBatch(
  existingRecipeNames: string[],
  options: { veganOnly?: boolean; count?: number } = {}
): Promise<Recipe[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const count = options.count || 10;
  const dietRequirement = options.veganOnly 
    ? 'All recipes MUST be 100% strictly VEGAN (no meat, fish, dairy, eggs, or animal products).' 
    : 'All recipes MUST be 100% strictly VEGETARIAN (no meat or fish; dairy and eggs are allowed).';

  const existingList = existingRecipeNames.filter(Boolean);
  const exclusionText = existingList.length > 0
    ? `IMPORTANT EXCLUSIONS - The user already has the following recipes in their bank:\n${existingList.map(n => `- "${n}"`).join('\n')}\nDO NOT suggest any recipe matching these names, nor major variations of these dishes (e.g. if "Lentil Bolognese" or "Bolognese" is in the list, DO NOT generate any bolognese recipe). Suggest fresh, distinct alternatives.`
    : 'Suggest a diverse mix of delicious, creative recipes.';

  const prompt = `You are an expert chef specializing in vegetarian and vegan cooking.
Generate exactly ${count} unique, appealing, full-length dinner/lunch recipes.

CRITICAL RULES:
1. ${dietRequirement}
2. SAVORY MEALS ONLY: Strictly lunch, dinner, soups, hearty salads, or main dishes. Absolutely NO desserts, cakes, cookies, sweet pies, puddings, sweet baked goods, or breakfast pastries.
3. STRICTLY NUT-FREE: Absolutely NO peanuts, tree nuts (almonds, cashews, walnuts, pecans, pine nuts, pistachios, hazelnuts, macadamias), or nut products. If a dish traditionally uses nuts for crunch or garnish, substitute sunflower seeds or pumpkin seeds.
4. ${exclusionText}
5. Provide a diverse variety of cuisines (e.g. Italian, Mexican, Indian, Mediterranean, Asian, Middle Eastern, etc.).
6. Ingredients must include precise amounts in metric units (g, ml, tbsp, tsp, piece, can, cup) and category: "produce", "dairy", "grains", "canned", "spices", "oils", "frozen", "bakery", "condiments", "protein", or "other".
7. Method steps must be clear and actionable. If a step involves boiling, simmering, or baking for a specific duration, include "timerMinutes".

Output MUST be a valid JSON array of objects conforming to this schema:
[
  {
    "name": "Recipe Title",
    "description": "Short 1-2 sentence appetizing description",
    "cuisine": "Italian",
    "prepTime": 15,
    "cookTime": 25,
    "servings": 4,
    "isVegan": true,
    "ingredients": [
      {
        "name": "Arborio rice",
        "amount": 300,
        "unit": "g",
        "category": "grains"
      }
    ],
    "method": [
      {
        "stepNumber": 1,
        "instruction": "Detailed instruction...",
        "timerMinutes": 10
      }
    ]
  }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Gemini API Error Response:', errBody);
    throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
  }

  const json = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response.');
  }

  let parsedRecipes: GeminiRecipeSchema[];
  try {
    parsedRecipes = JSON.parse(rawText);
  } catch (e) {
    console.error('Failed to parse Gemini JSON output:', rawText);
    throw new Error('Failed to parse response from Gemini.');
  }

  if (!Array.isArray(parsedRecipes)) {
    throw new Error('Gemini response was not a JSON array.');
  }

  const validCategories: IngredientCategory[] = [
    'produce', 'dairy', 'grains', 'canned', 'spices', 'oils',
    'frozen', 'bakery', 'condiments', 'protein', 'other'
  ];

  const fullRecipes: Recipe[] = parsedRecipes.map((item) => {
    const prep = Number(item.prepTime) || 15;
    const cook = Number(item.cookTime) || 20;
    const totalTime = prep + cook;

    const ingredients: Ingredient[] = (item.ingredients || []).map((ing) => {
      const name = ing.name || 'Ingredient';
      const nameLower = name.toLowerCase();
      const matchedNut = NUT_INGREDIENTS.find(nut => nameLower.includes(nut));
      const cat = (ing.category?.toLowerCase() || 'other') as IngredientCategory;

      return {
        name,
        amount: Number(ing.amount) || 1,
        unit: ing.unit || 'g',
        category: validCategories.includes(cat) ? cat : 'other',
        isCommon: false,
        isNut: !!matchedNut,
        nutSubstitute: matchedNut ? NUT_SUBSTITUTES[matchedNut] : undefined,
      };
    });

    const method: MethodStep[] = (item.method || []).map((m, idx) => ({
      stepNumber: m.stepNumber || idx + 1,
      instruction: m.instruction || '',
      timerMinutes: m.timerMinutes ? Number(m.timerMinutes) : undefined,
    }));

    return {
      id: uuidv4(),
      name: item.name || 'Untitled Recipe',
      description: item.description || '',
      cuisine: item.cuisine || 'International',
      prepTime: prep,
      cookTime: cook,
      totalTime,
      servings: Number(item.servings) || 4,
      isVegan: !!item.isVegan,
      isQuick: totalTime <= 30,
      ingredients,
      method,
      tags: [
        'ai-generated',
        item.isVegan ? 'vegan' : 'vegetarian',
        totalTime <= 30 ? 'quick' : '',
      ].filter(Boolean),
      source: 'ai-generated' as const,
      unitSystem: 'metric' as const,
      dateAdded: new Date().toISOString(),
      isFavourite: false,
      rating: 0,
      timesUsed: 0,
    };
  });

  return fullRecipes;
}
