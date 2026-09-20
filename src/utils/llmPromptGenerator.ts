import type { Recipe, Ingredient, MethodStep } from '../types/types';
import { v4 as uuidv4 } from 'uuid';

const NUT_KEYWORDS = ['peanut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'macadamia', 'hazelnut', 'pine nut', 'brazil nut'];

export function generateRecipePrompt(url?: string): string {
  const intro = url
    ? `Extract the recipe from this URL: ${url}\n\n`
    : `Please provide a vegetarian recipe.\n\n`;

  return `${intro}Format the output as a valid JSON object following this structure exactly. Output ONLY raw JSON, no markdown code blocks.

{
  "name": "Recipe Name",
  "description": "Brief description of the dish",
  "image": "URL to an image (optional, can be empty string)",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "cuisine": "Italian",
  "isVegan": false,
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 2,
      "unit": "cups",
      "category": "produce",
      "isCommon": false,
      "isNut": false,
      "nutSubstitute": ""
    }
  ],
  "method": [
    {
      "stepNumber": 1,
      "instruction": "Step description",
      "timerMinutes": null
    }
  ],
  "tags": ["vegetarian", "pasta"]
}

IMPORTANT RULES:
- The recipe MUST be vegetarian (no meat, no fish).
- All ingredient amounts must be numbers (not strings like "1/2" — use 0.5 instead).
- Category must be one of: produce, dairy, grains, canned, spices, oils, frozen, bakery, condiments, protein, other
- Set isCommon to true for staple ingredients (salt, pepper, oil, garlic, etc.)
- If any ingredient contains nuts (peanuts, almonds, walnuts, cashews, pine nuts, etc.), set isNut to true and suggest a non-nut substitute in nutSubstitute.
- Include timerMinutes on steps that involve waiting (baking, simmering, etc.)
- Cuisine should be one of: Italian, Indian, Mexican, Asian, Middle Eastern, American, British, French, Mediterranean, International`;
}

export function parseRecipeJSON(json: string): Recipe | null {
  try {
    // Clean up common LLM formatting
    const cleanJson = json
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();

    const data = JSON.parse(cleanJson);

    // Validate required fields
    if (!data.name || !data.ingredients || !Array.isArray(data.ingredients)) {
      console.error('Missing required fields: name, ingredients');
      return null;
    }

    if (!data.method || !Array.isArray(data.method)) {
      // Try to convert "instructions" array to method format
      if (data.instructions && Array.isArray(data.instructions)) {
        data.method = data.instructions.map((inst: string, i: number) => ({
          stepNumber: i + 1,
          instruction: inst,
        }));
      } else {
        console.error('Missing required field: method (or instructions)');
        return null;
      }
    }

    // Map ingredients to our type
    const ingredients: Ingredient[] = data.ingredients.map((ing: Record<string, unknown>) => {
      const name = String(ing.name || '');
      const isNut = NUT_KEYWORDS.some(nut => name.toLowerCase().includes(nut)) || !!ing.isNut;

      return {
        name,
        amount: Number(ing.amount) || 0,
        unit: String(ing.unit || ''),
        category: ing.category || 'other',
        isCommon: !!ing.isCommon,
        isNut,
        nutSubstitute: isNut ? String(ing.nutSubstitute || 'seeds') : undefined,
        notes: ing.notes ? String(ing.notes) : undefined,
      };
    });

    // Map method steps
    const method: MethodStep[] = data.method.map((step: Record<string, unknown>, i: number) => ({
      stepNumber: Number(step.stepNumber) || i + 1,
      instruction: String(step.instruction || step.step || ''),
      timerMinutes: step.timerMinutes ? Number(step.timerMinutes) : undefined,
    }));

    const totalTime = Number(data.totalTime) || (Number(data.prepTime || 0) + Number(data.cookTime || 0));
    const hasNuts = ingredients.some(i => i.isNut);

    const recipe: Recipe = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      image: data.image || undefined,
      ingredients,
      method,
      servings: Number(data.servings) || 4,
      prepTime: Number(data.prepTime) || 0,
      cookTime: Number(data.cookTime) || 0,
      totalTime,
      tags: Array.isArray(data.tags) ? data.tags : ['vegetarian'],
      cuisine: data.cuisine || 'International',
      isVegan: !!data.isVegan,
      isQuick: totalTime <= 30,
      isFavourite: false,
      rating: 0,
      source: 'imported',
      sourceUrl: data.sourceUrl || undefined,
      nutNotes: hasNuts ? `Contains nuts: ${ingredients.filter(i => i.isNut).map(i => `${i.name} → substitute with ${i.nutSubstitute}`).join(', ')}` : undefined,
      unitSystem: data.unitSystem || 'metric',
      dateAdded: new Date().toISOString(),
      timesUsed: 0,
    };

    return recipe;
  } catch (error) {
    console.error('Error parsing recipe JSON:', error);
    return null;
  }
}
