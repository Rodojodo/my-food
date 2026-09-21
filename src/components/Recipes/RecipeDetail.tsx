import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiHeart, FiStar, FiPrinter, FiTrash2, FiMinus, FiPlus, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { convertIngredient, scaleIngredient } from '../../utils/conversion';
import { getSourceLabel } from '../../types/types';

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipeById, toggleFavourite, toggleQuick, setRating, deleteRecipe, isInitialized, loadRecipes } = useRecipeStore();
  const { settings } = useSettingsStore();
  
  const [servings, setServings] = useState<number>(4);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(settings.unitSystem);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isInitialized) loadRecipes();
  }, [isInitialized, loadRecipes]);

  const recipe = id ? getRecipeById(id) : undefined;

  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings);
      setUnitSystem(recipe.unitSystem);
    }
  }, [recipe]);

  if (!recipe) {
    return <div className="p-8 text-center text-gray-500">Recipe not found or loading...</div>;
  }

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

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen pb-20 sm:pb-8 sm:mt-8 sm:rounded-2xl sm:shadow-lg overflow-hidden border border-gray-100">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-200 to-amber-100 flex items-center justify-center text-6xl">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-sm"
        >
          <FiArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <span>🍲</span>
        )}

        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={handlePrint} className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-sm">
            <FiPrinter className="w-6 h-6 text-gray-700" />
          </button>
          {(recipe.source === 'imported' || recipe.source === 'online' || recipe.source === 'api') && (
            <button onClick={handleDelete} className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-red-50 text-red-500 transition-colors shadow-sm">
              <FiTrash2 className="w-6 h-6" />
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
          
          <div className="flex flex-col items-end gap-3 min-w-[120px]">
            <button 
              onClick={() => toggleFavourite(recipe.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors w-full justify-center"
            >
              <FiHeart className={`w-5 h-5 ${recipe.isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              <span className="font-medium text-gray-700">Save</span>
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(recipe.id, star)}>
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
                <span className="text-sm font-medium text-gray-600 pl-2">Servings</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(Math.max(1, servings - 1))} className="p-1 hover:bg-gray-200 rounded-md"><FiMinus /></button>
                  <span className="font-semibold w-4 text-center">{servings}</span>
                  <button onClick={() => setServings(servings + 1)} className="p-1 hover:bg-gray-200 rounded-md"><FiPlus /></button>
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
                      <button className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
