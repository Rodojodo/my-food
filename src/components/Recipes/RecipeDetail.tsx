import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiArrowLeft, FiClock, FiHeart, FiStar, FiPrinter, FiTrash2, 
  FiMinus, FiPlus, FiAlertTriangle, FiCheck, FiEdit2, FiX, FiSave 
} from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { convertIngredient, scaleIngredient } from '../../utils/conversion';
import { getSourceLabel, type Ingredient, type IngredientCategory, type MethodStep, type Recipe } from '../../types/types';

interface EditFormState {
  name: string;
  description: string;
  cuisine: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  isVegan: boolean;
  isQuick: boolean;
  image: string;
  ingredients: Ingredient[];
  method: MethodStep[];
  notes: string;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getRecipeById, updateRecipe, toggleFavourite, toggleQuick, setRating, deleteRecipe, addNote, isInitialized, loadRecipes } = useRecipeStore();
  const { settings } = useSettingsStore();

  const recipe = id ? getRecipeById(id) : undefined;
  
  const [servings, setServings] = useState<number>(recipe?.servings || 4);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(recipe?.unitSystem || settings.unitSystem);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState<boolean>(searchParams.get('edit') === 'true');
  const [prevRecipeId, setPrevRecipeId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    description: '',
    cuisine: '',
    servings: 4,
    prepTime: 0,
    cookTime: 0,
    isVegan: false,
    isQuick: false,
    image: '',
    ingredients: [],
    method: [],
    notes: '',
  });

  useEffect(() => {
    if (!isInitialized) loadRecipes();
  }, [isInitialized, loadRecipes]);

  if (recipe && recipe.id !== prevRecipeId) {
    setPrevRecipeId(recipe.id);
    setServings(recipe.servings);
    setUnitSystem(recipe.unitSystem);
    if (searchParams.get('edit') === 'true') {
      setEditForm({
        name: recipe.name || '',
        description: recipe.description || '',
        cuisine: recipe.cuisine || '',
        servings: recipe.servings || 4,
        prepTime: recipe.prepTime || 0,
        cookTime: recipe.cookTime || 0,
        isVegan: !!recipe.isVegan,
        isQuick: !!recipe.isQuick,
        image: recipe.image || '',
        ingredients: recipe.ingredients ? recipe.ingredients.map(i => ({ ...i })) : [],
        method: recipe.method ? recipe.method.map(m => ({ ...m })) : [],
        notes: recipe.notes || '',
      });
      setIsEditing(true);
    }
  }

  if (!recipe) {
    return <div className="p-8 text-center text-gray-500">Recipe not found or loading...</div>;
  }

  const startEditing = () => {
    setEditForm({
      name: recipe.name || '',
      description: recipe.description || '',
      cuisine: recipe.cuisine || '',
      servings: recipe.servings || 4,
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      isVegan: !!recipe.isVegan,
      isQuick: !!recipe.isQuick,
      image: recipe.image || '',
      ingredients: recipe.ingredients ? recipe.ingredients.map(i => ({ ...i })) : [],
      method: recipe.method ? recipe.method.map(m => ({ ...m })) : [],
      notes: recipe.notes || '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (searchParams.get('edit')) {
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editForm.name.trim()) {
      alert('Please enter a recipe name.');
      return;
    }

    const prep = Math.max(0, Number(editForm.prepTime) || 0);
    const cook = Math.max(0, Number(editForm.cookTime) || 0);
    const totalTime = prep + cook;
    const finalServings = Math.max(1, Number(editForm.servings) || 1);

    const cleanedIngredients = editForm.ingredients
      .filter(i => i.name.trim() !== '')
      .map(i => ({
        ...i,
        name: i.name.trim(),
        amount: Number(i.amount) || 0,
        unit: i.unit.trim() || 'whole',
        category: i.category || 'other',
        isCommon: !!i.isCommon,
        isNut: !!i.isNut,
      }));

    const cleanedMethod = editForm.method
      .filter(m => m.instruction.trim() !== '')
      .map((m, idx) => ({
        stepNumber: idx + 1,
        instruction: m.instruction.trim(),
        timerMinutes: m.timerMinutes ? Number(m.timerMinutes) : undefined,
      }));

    const updates: Partial<Recipe> = {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      cuisine: editForm.cuisine.trim(),
      servings: finalServings,
      prepTime: prep,
      cookTime: cook,
      totalTime,
      isVegan: editForm.isVegan,
      isQuick: editForm.isQuick,
      image: editForm.image.trim() || undefined,
      ingredients: cleanedIngredients,
      method: cleanedMethod,
      notes: editForm.notes.trim(),
    };

    await updateRecipe(recipe.id, updates);
    setServings(finalServings);
    setIsEditing(false);
    if (searchParams.get('edit')) {
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleAddIngredient = () => {
    setEditForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { name: '', amount: 1, unit: 'g', category: 'other', isCommon: false, isNut: false }
      ]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    setEditForm(prev => {
      const next = [...prev.ingredients];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, ingredients: next };
    });
  };

  const handleAddStep = () => {
    setEditForm(prev => ({
      ...prev,
      method: [
        ...prev.method,
        { stepNumber: prev.method.length + 1, instruction: '' }
      ]
    }));
  };

  const handleRemoveStep = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      method: prev.method.filter((_, i) => i !== index).map((m, i) => ({ ...m, stepNumber: i + 1 }))
    }));
  };

  const handleUpdateStep = (index: number, field: keyof MethodStep, value: any) => {
    setEditForm(prev => {
      const next = [...prev.method];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, method: next };
    });
  };

  const handleToggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) newChecked.delete(index);
    else newChecked.add(index);
    setCheckedIngredients(newChecked);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      await deleteRecipe(recipe.id);
      navigate('/recipes');
    }
  };

  const hasNuts = recipe.ingredients.some(i => i.isNut);

  // ============================================================
  // EDIT MODE RENDER
  // ============================================================
  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-white min-h-screen pb-20 sm:pb-8 sm:mt-8 sm:rounded-2xl sm:shadow-lg overflow-hidden border border-gray-100">
        {/* Sticky Header */}
        <div className="p-4 sm:p-6 bg-stone-50 border-b border-stone-200 flex items-center justify-between sticky top-0 z-20 backdrop-blur bg-stone-50/95">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 bg-white rounded-full border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors shadow-xs cursor-pointer"
              title="Cancel"
            >
              <FiX className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Edit Recipe</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-2 text-stone-600 hover:text-stone-800 font-medium text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-10 space-y-8">
          {/* General Details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border-gray-300 rounded-xl p-3 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-medium"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Vegetarian Pad Thai"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-xl p-2.5 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    value={editForm.cuisine}
                    onChange={e => setEditForm(prev => ({ ...prev, cuisine: e.target.value }))}
                    placeholder="e.g. Italian, Thai, Indian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-xl p-2.5 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    value={editForm.image}
                    onChange={e => setEditForm(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border-gray-300 rounded-xl p-3 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Short summary of this recipe..."
                />
              </div>

              {/* Servings and Cooking Times Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-orange-50/60 p-4 rounded-xl border border-orange-100">
                <div>
                  <label className="block text-sm font-bold text-orange-950 mb-1">
                    Servings *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full border-orange-200 rounded-lg p-2 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-bold text-base"
                    value={editForm.servings}
                    onChange={e => setEditForm(prev => ({ ...prev, servings: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                  <p className="text-[11px] text-orange-800 mt-1">Default recipe yield</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (m)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    value={editForm.prepTime}
                    onChange={e => setEditForm(prev => ({ ...prev, prepTime: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (m)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    value={editForm.cookTime}
                    onChange={e => setEditForm(prev => ({ ...prev, cookTime: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Total Time</label>
                  <div className="p-2 font-semibold text-gray-700">
                    {(Number(editForm.prepTime) || 0) + (Number(editForm.cookTime) || 0)} mins
                  </div>
                </div>
              </div>

              {/* Vegan and Fast Checkboxes */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                    checked={editForm.isVegan}
                    onChange={e => setEditForm(prev => ({ ...prev, isVegan: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Vegan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                    checked={editForm.isQuick}
                    onChange={e => setEditForm(prev => ({ ...prev, isQuick: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Fast Recipe</span>
                </label>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
                <p className="text-xs text-gray-500">Amounts for {editForm.servings} serving{editForm.servings > 1 ? 's' : ''}</p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
              >
                <FiPlus /> Add Ingredient
              </button>
            </div>

            <div className="space-y-3">
              {editForm.ingredients.map((ing, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-gray-50/70 p-2.5 rounded-xl border border-gray-200/70">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="w-20 border-gray-300 rounded-lg p-2 border text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    placeholder="Amt"
                    value={ing.amount === 0 ? '' : ing.amount}
                    onChange={e => handleUpdateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                  />
                  <input
                    type="text"
                    className="w-24 border-gray-300 rounded-lg p-2 border text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    placeholder="Unit (g, ml...)"
                    value={ing.unit}
                    onChange={e => handleUpdateIngredient(idx, 'unit', e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 min-w-[140px] border-gray-300 rounded-lg p-2 border text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={e => handleUpdateIngredient(idx, 'name', e.target.value)}
                  />
                  <select
                    className="w-28 border-gray-300 rounded-lg p-2 border text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    value={ing.category || 'other'}
                    onChange={e => handleUpdateIngredient(idx, 'category', e.target.value as IngredientCategory)}
                  >
                    <option value="produce">Produce</option>
                    <option value="dairy">Dairy</option>
                    <option value="grains">Grains</option>
                    <option value="canned">Canned</option>
                    <option value="spices">Spices</option>
                    <option value="oils">Oils</option>
                    <option value="protein">Protein</option>
                    <option value="bakery">Bakery</option>
                    <option value="frozen">Frozen</option>
                    <option value="condiments">Condiments</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove ingredient"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {editForm.ingredients.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No ingredients yet. Click "Add Ingredient" to add one.</p>
              )}
            </div>
          </div>

          {/* Instructions Section */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Instructions</h2>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
              >
                <FiPlus /> Add Step
              </button>
            </div>

            <div className="space-y-3">
              {editForm.method.map((step, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200/70 items-start">
                  <div className="font-bold text-gray-400 pt-2 text-sm w-6">{idx + 1}.</div>
                  <div className="flex-1 space-y-2">
                    <textarea
                      rows={2}
                      className="w-full border-gray-300 rounded-lg p-2 border text-sm bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                      placeholder={`Step ${idx + 1} instruction...`}
                      value={step.instruction}
                      onChange={e => handleUpdateStep(idx, 'instruction', e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-medium">Optional timer (mins):</label>
                      <input
                        type="number"
                        min="0"
                        className="w-20 border-gray-300 rounded-lg px-2 py-1 border text-xs bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                        placeholder="e.g. 15"
                        value={step.timerMinutes || ''}
                        onChange={e => handleUpdateStep(idx, 'timerMinutes', parseInt(e.target.value) || undefined)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove step"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {editForm.method.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No instruction steps yet. Click "Add Step" to add one.</p>
              )}
            </div>
          </div>

          {/* Personal Notes Section */}
          <div className="pt-4 border-t border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Personal Notes</h2>
            <textarea
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-sm"
              placeholder="Add your personal notes, variations, and tips..."
              value={editForm.notes}
              onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================
  // VIEW MODE RENDER
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen pb-20 sm:pb-8 sm:mt-8 sm:rounded-2xl sm:shadow-lg overflow-hidden border border-gray-100">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-200 to-amber-100 flex items-center justify-center text-6xl">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-sm cursor-pointer"
          title="Go back"
        >
          <FiArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <span>🍲</span>
        )}

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button 
            onClick={startEditing} 
            className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white text-gray-700 hover:text-orange-600 transition-colors shadow-sm cursor-pointer"
            title="Edit recipe"
          >
            <FiEdit2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handlePrint} 
            className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-sm cursor-pointer"
            title="Print recipe"
          >
            <FiPrinter className="w-5 h-5 text-gray-700" />
          </button>
          {(recipe.source === 'imported' || recipe.source === 'online' || recipe.source === 'api') && (
            <button 
              onClick={handleDelete} 
              className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-red-50 text-red-500 transition-colors shadow-sm cursor-pointer"
              title="Delete recipe"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 text-xs rounded-md font-medium tracking-wider ${
                recipe.source === 'online' || recipe.source === 'api' 
                  ? 'bg-sky-100 text-sky-800' 
                  : recipe.source === 'imported' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {getSourceLabel(recipe.source)}
              </span>
              {recipe.isVegan && (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">Vegan</span>
              )}
              <label 
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors border select-none ${
                  recipe.isQuick 
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs' 
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
                title="Toggle fast recipe"
              >
                <input
                  type="checkbox"
                  checked={recipe.isQuick}
                  onChange={() => toggleQuick(recipe.id)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Fast</span>
              </label>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">{recipe.name}</h1>
            <p className="text-gray-600 text-lg leading-relaxed">{recipe.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-3 min-w-[130px]">
            <button 
              onClick={startEditing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium rounded-xl transition-colors w-full justify-center text-sm shadow-xs cursor-pointer"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Edit Recipe</span>
            </button>
            <button 
              onClick={() => toggleFavourite(recipe.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors w-full justify-center text-sm cursor-pointer"
            >
              <FiHeart className={`w-4 h-4 ${recipe.isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              <span className="font-medium text-gray-700">Save</span>
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(recipe.id, star)} className="cursor-pointer">
                  <FiStar className={`w-6 h-6 ${star <= recipe.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-100 mb-8 bg-gray-50 rounded-2xl px-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium mb-1">Prep Time</span>
            <span className="font-semibold text-gray-900">{recipe.prepTime} mins</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium mb-1">Cook Time</span>
            <span className="font-semibold text-gray-900">{recipe.cookTime} mins</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium mb-1">Total Time</span>
            <span className="font-semibold text-gray-900">{recipe.totalTime} mins</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 font-medium mb-1">Servings</span>
            <span className="font-semibold text-gray-900">{recipe.servings}</span>
          </div>
        </div>

        {hasNuts && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 text-yellow-800">
            <FiAlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Contains Nuts</h4>
              <p className="text-sm opacity-90">{recipe.nutNotes || 'Some ingredients contain nuts. See substitutes below if needed.'}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_2fr] gap-10">
          {/* Ingredients Column */}
          <div>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white py-2 z-10">
              <h2 className="text-2xl font-bold text-gray-900">Ingredients</h2>
            </div>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <button 
                  onClick={() => setUnitSystem('imperial')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${unitSystem === 'imperial' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Imperial
                </button>
                <button 
                  onClick={() => setUnitSystem('metric')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${unitSystem === 'metric' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Metric
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center flex-wrap gap-1">
                  <span className="text-sm font-medium text-gray-600 pl-2">Servings:</span>
                  {servings !== recipe.servings && (
                    <button
                      onClick={async () => {
                        await updateRecipe(recipe.id, { servings });
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold ml-2 underline cursor-pointer"
                      title="Save this serving size as recipe default"
                    >
                      Set as default
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(Math.max(1, servings - 1))} className="p-1 hover:bg-gray-200 rounded-md cursor-pointer"><FiMinus /></button>
                  <span className="font-semibold w-4 text-center">{servings}</span>
                  <button onClick={() => setServings(servings + 1)} className="p-1 hover:bg-gray-200 rounded-md cursor-pointer"><FiPlus /></button>
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {recipe.ingredients.map((ing, i) => {
                const scaled = scaleIngredient(ing, recipe.servings, servings);
                const converted = convertIngredient(scaled, unitSystem);
                const isChecked = checkedIngredients.has(i);
                return (
                  <li key={i} className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${isChecked ? 'opacity-50' : ''}`} onClick={() => handleToggleIngredient(i)}>
                    <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                      {isChecked && <FiCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">
                        {converted.amount ? Number(converted.amount.toFixed(2)) : ''} {converted.unit}
                      </span>{' '}
                      <span className="text-gray-700">{converted.name}</span>
                      {converted.notes && <span className="text-gray-500 text-sm italic block">{converted.notes}</span>}
                      {converted.isNut && converted.nutSubstitute && (
                        <span className="text-yellow-600 text-xs font-medium block mt-0.5">Sub: {converted.nutSubstitute}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Method Column */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructions</h2>
            <div className="space-y-8">
              {recipe.method.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-800 leading-relaxed">{step.instruction}</p>
                    {step.timerMinutes && (
                      <button className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                        <FiClock className="w-4 h-4 text-orange-500" />
                        Start {step.timerMinutes}m Timer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Notes Section */}
            <div className="mt-12">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Personal Notes</h3>
              <textarea 
                className="w-full p-4 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[120px]"
                placeholder="Add your tweaks and tips here..."
                defaultValue={recipe.notes || ''}
                onBlur={async (e) => {
                  await addNote(recipe.id, e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
