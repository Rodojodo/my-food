import type { IngredientCategory } from '../types/types';

export const COMMON_INGREDIENTS: string[] = [
  'salt', 'black pepper', 'white pepper', 'olive oil', 'vegetable oil', 'canola oil', 'sesame oil',
  'butter', 'garlic', 'onions', 'red onions', 'water', 'sugar', 'brown sugar', 'flour', 'baking powder',
  'baking soda', 'vanilla extract', 'milk', 'soy sauce', 'white vinegar', 'apple cider vinegar',
  'balsamic vinegar', 'rice vinegar', 'lemon juice', 'lime juice', 'dried oregano', 'dried basil',
  'ground cumin', 'paprika', 'chili powder', 'cinnamon', 'nutmeg', 'red pepper flakes', 'rice',
  'pasta', 'eggs', 'vegetable broth', 'vegetable stock', 'tomato paste', 'canned diced tomatoes',
  'honey', 'maple syrup', 'mustard', 'mayonnaise', 'ketchup', 'hot sauce', 'cornstarch', 'yeast',
  'breadcrumbs'
];

export const NUT_INGREDIENTS: string[] = [
  'almonds', 'cashews', 'walnuts', 'peanuts', 'pine nuts', 'pecans', 
  'pistachios', 'macadamia nuts', 'hazelnuts', 'brazil nuts',
  'almond butter', 'peanut butter', 'cashew butter', 'peanut oil',
  'almond flour', 'almond milk', 'cashew milk', 'macadamia milk'
];

export const NUT_SUBSTITUTES: Record<string, string> = {
  'almonds': 'pumpkin seeds',
  'cashews': 'sunflower seeds',
  'walnuts': 'roasted soy beans',
  'peanuts': 'sunflower seeds',
  'pine nuts': 'pumpkin seeds',
  'pecans': 'oatmeal or roasted pumpkin seeds',
  'pistachios': 'roasted edamame',
  'macadamia nuts': 'hemp seeds',
  'hazelnuts': 'sunflower seeds',
  'brazil nuts': 'sunflower seeds',
  'almond butter': 'sunflower seed butter',
  'peanut butter': 'sunflower seed butter (SunButter)',
  'cashew butter': 'tahini',
  'peanut oil': 'sunflower oil',
  'almond flour': 'oat flour or pumpkin seed flour',
  'almond milk': 'oat milk or soy milk',
  'cashew milk': 'oat milk or soy milk',
  'macadamia milk': 'oat milk'
};

export const INGREDIENT_CATEGORIES: Record<string, IngredientCategory> = {
  'salt': 'spices', 'black pepper': 'spices', 'white pepper': 'spices', 'olive oil': 'oils',
  'vegetable oil': 'oils', 'canola oil': 'oils', 'sesame oil': 'oils', 'butter': 'dairy',
  'garlic': 'produce', 'onions': 'produce', 'red onions': 'produce', 'water': 'other',
  'sugar': 'bakery', 'brown sugar': 'bakery', 'flour': 'bakery', 'baking powder': 'bakery',
  'baking soda': 'bakery', 'vanilla extract': 'bakery', 'milk': 'dairy', 'soy sauce': 'condiments',
  'white vinegar': 'condiments', 'apple cider vinegar': 'condiments', 'balsamic vinegar': 'condiments',
  'rice vinegar': 'condiments', 'lemon juice': 'produce', 'lime juice': 'produce',
  'dried oregano': 'spices', 'dried basil': 'spices', 'ground cumin': 'spices', 'paprika': 'spices',
  'chili powder': 'spices', 'cinnamon': 'spices', 'nutmeg': 'spices', 'red pepper flakes': 'spices',
  'rice': 'grains', 'pasta': 'grains', 'eggs': 'dairy', 'vegetable broth': 'canned',
  'vegetable stock': 'canned', 'tomato paste': 'canned', 'canned diced tomatoes': 'canned',
  'honey': 'condiments', 'maple syrup': 'condiments', 'mustard': 'condiments', 'mayonnaise': 'condiments',
  'ketchup': 'condiments', 'hot sauce': 'condiments', 'cornstarch': 'bakery', 'yeast': 'bakery',
  'breadcrumbs': 'bakery'
};
