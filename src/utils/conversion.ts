import type { Ingredient, UnitSystem } from '../types/types';

export const INGREDIENT_DENSITY: Record<string, number> = {
  'flour': 120,
  'sugar': 200,
  'brown sugar': 220,
  'powdered sugar': 120,
  'butter': 227,
  'water': 237,
  'milk': 240,
  'heavy cream': 240,
  'honey': 340,
  'maple syrup': 322,
  'olive oil': 216,
  'vegetable oil': 216,
  'canola oil': 216,
  'cocoa powder': 100,
  'chocolate chips': 170,
  'salt': 273,
  'baking powder': 192,
  'baking soda': 288,
  'yeast': 150,
  'rolled oats': 90,
  'cornstarch': 128,
  'rice (uncooked)': 185,
  'pasta (uncooked)': 114,
  'peanut butter': 250,
  'almond butter': 250,
  'mayonnaise': 230,
  'ketchup': 270,
  'mustard': 250,
  'soy sauce': 250,
  'vinegar': 238,
  'lemon juice': 238,
  'chicken broth': 240,
  'vegetable broth': 240,
  'beef broth': 240,
  'tomato paste': 260,
  'tomato sauce': 245,
  'diced tomatoes': 240,
  'lentils (uncooked)': 192,
  'black beans (canned)': 240,
  'chickpeas (canned)': 240,
};

export function convertIngredient(ingredient: Ingredient, targetSystem: UnitSystem): Ingredient {
  const nameLower = ingredient.name.toLowerCase();
  const density = INGREDIENT_DENSITY[nameLower] || 240; // Default to water density

  let newAmount = ingredient.amount;
  let newUnit = ingredient.unit;

  if (targetSystem === 'metric') {
    if (ingredient.unit === 'cup') {
      newAmount = ingredient.amount * density;
      newUnit = 'g';
    } else if (ingredient.unit === 'tbsp') {
      newAmount = ingredient.amount * (density / 16);
      newUnit = 'g';
    } else if (ingredient.unit === 'tsp') {
      newAmount = ingredient.amount * (density / 48);
      newUnit = 'g';
    } else if (ingredient.unit === 'oz') {
      newAmount = ingredient.amount * 28.3495;
      newUnit = 'g';
    } else if (ingredient.unit === 'lb') {
      newAmount = ingredient.amount * 453.592;
      newUnit = 'g';
    } else if (ingredient.unit === 'fl oz') {
      newAmount = ingredient.amount * 29.5735;
      newUnit = 'ml';
    }
  } else {
    // Metric to Imperial
    if (ingredient.unit === 'g') {
      newAmount = ingredient.amount / density;
      newUnit = 'cup';
    } else if (ingredient.unit === 'kg') {
      newAmount = ingredient.amount * 2.20462;
      newUnit = 'lb';
    } else if (ingredient.unit === 'ml') {
      newAmount = ingredient.amount / 237;
      newUnit = 'cup';
    } else if (ingredient.unit === 'l') {
      newAmount = ingredient.amount * 4.22675;
      newUnit = 'cup';
    }
  }

  return {
    ...ingredient,
    amount: Number(newAmount.toFixed(2)),
    unit: newUnit,
  };
}

export function scaleIngredient(ingredient: Ingredient, originalServings: number, newServings: number): Ingredient {
  return {
    ...ingredient,
    amount: Number((ingredient.amount * (newServings / originalServings)).toFixed(2)),
  };
}

export function convertTemperature(value: number, from: 'F' | 'C', to: 'F' | 'C'): number {
  if (from === to) return value;
  if (from === 'F' && to === 'C') {
    const celsius = (value - 32) * (5 / 9);
    return Math.round(celsius / 5) * 5;
  }
  if (from === 'C' && to === 'F') {
    return Math.round((value * (9 / 5)) + 32);
  }
  return value;
}
