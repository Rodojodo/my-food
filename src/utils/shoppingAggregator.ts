import type { ShoppingItem, Recipe, IngredientCategory } from '../types/types';
import { v4 as uuidv4 } from 'uuid';

export function aggregateIngredients(recipes: { recipe: Recipe; servings: number }[]): ShoppingItem[] {
  const aggregated = new Map<string, ShoppingItem & { _fromRecipes: string[] }>();

  recipes.forEach(({ recipe, servings }) => {
    const scaleFactor = recipe.servings ? servings / recipe.servings : 1;

    recipe.ingredients.forEach(ing => {
      const normalizedName = ing.name.toLowerCase().trim();
      const key = `${normalizedName}_${ing.unit}`;

      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.amount = (existing.amount || 0) + ing.amount * scaleFactor;
        if (!existing._fromRecipes.includes(recipe.id)) {
          existing._fromRecipes.push(recipe.id);
        }
      } else {
        aggregated.set(key, {
          id: uuidv4(),
          name: ing.name,
          amount: ing.amount * scaleFactor,
          unit: ing.unit,
          category: ing.category || ('other' as IngredientCategory),
          checked: false,
          isWeeklyDefault: false,
          isExtra: false,
          fromRecipes: [recipe.id],
          _fromRecipes: [recipe.id],
        });
      }
    });
  });

  return Array.from(aggregated.values()).map(item => {
    const { _fromRecipes, ...shoppingItem } = item;
    shoppingItem.amount = Number((shoppingItem.amount || 0).toFixed(2));
    shoppingItem.fromRecipes = _fromRecipes;
    return shoppingItem;
  });
}

export function mergeWithDefaults(items: ShoppingItem[], defaults: ShoppingItem[]): ShoppingItem[] {
  const itemNames = new Set(items.map(i => i.name.toLowerCase()));
  const newDefaults = defaults.filter(d => !itemNames.has(d.name.toLowerCase()));
  return [...items, ...newDefaults];
}
