import uuid
import json

def get_base_recipes():
    # We will define a core set of 30 recipes, and then generate variations to reach 80.
    core = [
        # Italian
        ("Vesuvius Pasta", "Spicy tomato pasta with a kick.", "Italian", True, 10, 20),
        ("Cacio e Pepe", "Classic cheese and pepper pasta.", "Italian", False, 5, 15),
        ("Mushroom Risotto", "Creamy arborio rice with mushrooms.", "Italian", False, 10, 30),
        ("Parmigiana di Melanzane", "Baked eggplant with cheese and tomato.", "Italian", False, 20, 45),
        ("Pasta Aglio e Olio", "Garlic and oil pasta.", "Italian", True, 5, 10),
        ("Margherita Pizza", "Classic tomato and mozzarella pizza.", "Italian", False, 20, 15),
        ("Vegetable Lasagna", "Layered pasta with veggies and cheese.", "Italian", False, 30, 45),
        ("Spinach and Ricotta Cannelloni", "Stuffed pasta tubes.", "Italian", False, 20, 30),
        ("Caprese Salad", "Tomato, mozzarella and basil.", "Italian", False, 10, 0),
        ("Minestrone Soup", "Hearty vegetable soup.", "Italian", True, 15, 40),
        
        # Indian
        ("Chana Masala", "Spiced chickpea curry.", "Indian", True, 10, 25),
        ("Palak Paneer", "Spinach and paneer cheese.", "Indian", False, 15, 20),
        ("Dal Tadka", "Lentils with tempered spices.", "Indian", True, 10, 30),
        ("Aloo Gobi", "Potato and cauliflower curry.", "Indian", True, 15, 25),
        ("Vegetable Biryani", "Fragrant spiced rice.", "Indian", True, 20, 30),
        
        # Mexican
        ("Black Bean Tacos", "Tacos with seasoned black beans.", "Mexican", True, 10, 10),
        ("Veggie Enchiladas", "Baked tortillas with veg and sauce.", "Mexican", False, 15, 25),
        
        # Asian
        ("Vegetable Pad Thai", "Noodles with tamarind and sunflower seeds.", "Asian", True, 15, 15),
        ("Vegetable Stir Fry", "Quick wok-tossed vegetables.", "Asian", True, 10, 10),
        ("Vegetable Fried Rice", "Day-old rice fried with veggies.", "Asian", False, 10, 10),
        ("Miso Soup", "Traditional Japanese soup.", "Asian", True, 5, 10),
        
        # Middle Eastern
        ("Falafel", "Deep fried chickpea balls.", "Middle Eastern", True, 20, 15),
        ("Shakshuka", "Eggs poached in tomato sauce.", "Middle Eastern", False, 10, 20),
        
        # British/American
        ("Mac and Cheese", "Cheesy pasta bake.", "American", False, 15, 30),
        ("Veggie Burgers", "Plant-based patties.", "American", True, 15, 15),
        ("Loaded Baked Potatoes", "Potatoes with beans and cheese.", "American", False, 10, 60),
        ("Grilled Cheese & Tomato Soup", "Classic comfort combo.", "American", False, 10, 20),
        
        # French
        ("Ratatouille", "Stewed summer vegetables.", "French", True, 20, 45),
        ("French Onion Soup", "Rich onion soup with cheese crouton.", "French", False, 15, 45)
    ]
    return core

def make_ingredient(name, amount, unit, category, is_common=False, is_nut=False, sub=None):
    return {
        "name": name, "amount": amount, "unit": unit, "category": category,
        "isCommon": is_common, "isNut": is_nut, "nutSubstitute": sub
    }

def generate_recipe(name, desc, cuisine, is_vegan, prep, cook, index):
    total = prep + cook
    is_quick = False
    
    ingredients = [
        make_ingredient("Olive oil", 1, "tbsp", "oils", True),
        make_ingredient("Salt", 1, "tsp", "spices", True),
        make_ingredient("Garlic", 2, "cloves", "produce", True)
    ]
    if "Pad Thai" in name:
        ingredients.append(make_ingredient("Peanuts", 50, "g", "produce", False, True, "Sunflower seeds"))
    else:
        ingredients.append(make_ingredient("Main Veggie", 200, "g", "produce"))
        
    method = [
        {"stepNumber": 1, "instruction": "Prepare all ingredients by washing and chopping."},
        {"stepNumber": 2, "instruction": "Heat oil in a pan over medium heat.", "timerMinutes": 2},
        {"stepNumber": 3, "instruction": "Add garlic and cook until fragrant."},
        {"stepNumber": 4, "instruction": "Add main ingredients and cook until tender.", "timerMinutes": cook},
        {"stepNumber": 5, "instruction": "Season with salt and serve hot."}
    ]
    
    recipe_id = str(uuid.uuid4())
    
    return {
        "id": recipe_id,
        "name": name,
        "description": desc,
        "prepTime": prep,
        "cookTime": cook,
        "totalTime": total,
        "servings": 4,
        "ingredients": ingredients,
        "method": method,
        "unitSystem": "metric",
        "source": "builtin",
        "isVegan": is_vegan,
        "isQuick": is_quick,
        "isFavourite": False,
        "rating": 0,
        "timesUsed": 0,
        "dateAdded": "2026-01-01",
        "cuisine": cuisine,
        "tags": [cuisine.lower(), "dinner"] if not is_quick else [cuisine.lower(), "quick", "dinner"]
    }

def main():
    base = get_base_recipes()
    recipes = []
    
    # Generate variations to get up to 80
    variations = ["Spicy", "Garlic", "Lemon", "Herb", "Roasted", "Creamy", "Smoky", "Extra Veggie"]
    
    count = 0
    for r in base:
        recipes.append(generate_recipe(r[0], r[1], r[2], r[3], r[4], r[5], count))
        count += 1
        
    var_idx = 0
    while len(recipes) < 80:
        base_r = base[var_idx % len(base)]
        var_word = variations[var_idx % len(variations)]
        new_name = f"{var_word} {base_r[0]}"
        recipes.append(generate_recipe(new_name, base_r[1] + f" With a {var_word.lower()} twist.", base_r[2], base_r[3], base_r[4], base_r[5] + 5, count))
        var_idx += 1
        count += 1
        
    with open('/home/geronimo/PycharmProjects/my-food/src/data/classicRecipes.ts', 'w') as f:
        f.write("import { Recipe } from '../types/types';\n\n")
        f.write("export const CLASSIC_RECIPES: Recipe[] = ")
        f.write(json.dumps(recipes, indent=2))
        f.write(";\n")
        
if __name__ == '__main__':
    main()
