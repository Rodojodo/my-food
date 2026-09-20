import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiCopy, FiCheck } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import type { Recipe } from '../../types/types';
import { generateRecipePrompt, parseRecipeJSON } from '../../utils/llmPromptGenerator';

const RecipeImport = () => {
  const navigate = useNavigate();
  const { addRecipe } = useRecipeStore();
  const [activeTab, setActiveTab] = useState<'manual' | 'llm'>('manual');
  
  // LLM Tab State
  const [urlInput, setUrlInput] = useState('');
  const [promptGenerated, setPromptGenerated] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [llmError, setLlmError] = useState('');

  // Manual Tab State
  const [manualRecipe, setManualRecipe] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    cuisine: '',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    isVegan: false,
    ingredients: [{ name: '', amount: 1, unit: 'g', category: 'other', isCommon: false, isNut: false }],
    method: [{ stepNumber: 1, instruction: '' }],
    image: '',
    unitSystem: 'metric'
  });

  const handleManualSave = async () => {
    try {
      const totalTime = (manualRecipe.prepTime || 0) + (manualRecipe.cookTime || 0);
      const recipeToSave = {
        ...manualRecipe,
        totalTime,
        isQuick: totalTime <= 30,
        tags: [],
        source: 'imported' as const,
      } as Parameters<typeof addRecipe>[0];
      
      const newRecipe = await addRecipe(recipeToSave);
      navigate(`/recipe/${newRecipe.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePrompt = () => {
    setPromptGenerated(generateRecipePrompt(urlInput));
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptGenerated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParseJSON = async () => {
    try {
      setLlmError('');
      const parsed = parseRecipeJSON(jsonInput);
      if (!parsed) {
        setLlmError('Failed to parse recipe JSON. Please verify the structure matches the prompt instructions.');
        return;
      }
      const totalTime = (parsed.prepTime || 0) + (parsed.cookTime || 0);
      const recipeToSave = {
        ...parsed,
        totalTime,
        isQuick: totalTime <= 30,
        tags: parsed.tags || [],
        source: 'ai-generated' as const,
        unitSystem: parsed.unitSystem || 'metric',
      } as Parameters<typeof addRecipe>[0];
      
      const newRecipe = await addRecipe(recipeToSave);
      navigate(`/recipe/${newRecipe.id}`);
    } catch {
      setLlmError('Failed to parse JSON. Please make sure it is valid JSON.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Import Recipe</h1>
      
      <div className="flex border-b border-gray-200 mb-8">
        <button
          className={`pb-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'manual' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Import
        </button>
        <button
          className={`pb-4 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'llm' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('llm')}
        >
          AI Assisted Import
        </button>
      </div>

      {activeTab === 'manual' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
              <input type="text" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.name} onChange={e => setManualRecipe({...manualRecipe, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
              <input type="text" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.cuisine} onChange={e => setManualRecipe({...manualRecipe, cuisine: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.description} onChange={e => setManualRecipe({...manualRecipe, description: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
              <input type="number" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.servings} onChange={e => setManualRecipe({...manualRecipe, servings: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (m)</label>
              <input type="number" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.prepTime} onChange={e => setManualRecipe({...manualRecipe, prepTime: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (m)</label>
              <input type="number" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.cookTime} onChange={e => setManualRecipe({...manualRecipe, cookTime: Number(e.target.value)})} />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-green-500 w-4 h-4" checked={manualRecipe.isVegan} onChange={e => setManualRecipe({...manualRecipe, isVegan: e.target.checked})} />
                <span className="text-sm font-medium text-gray-700">Vegan</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
            <input type="text" className="w-full border-gray-300 rounded-lg p-2 border" value={manualRecipe.image} onChange={e => setManualRecipe({...manualRecipe, image: e.target.value})} />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">Ingredients</h3>
            <div className="space-y-3">
              {manualRecipe.ingredients?.map((ing, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <input type="number" className="w-20 border-gray-300 rounded-lg p-2 border text-sm" placeholder="Amt" value={ing.amount} onChange={e => {
                    const newIng = [...manualRecipe.ingredients!];
                    newIng[idx].amount = Number(e.target.value);
                    setManualRecipe({...manualRecipe, ingredients: newIng});
                  }} />
                  <select className="w-24 border-gray-300 rounded-lg p-2 border text-sm" value={ing.unit} onChange={e => {
                    const newIng = [...manualRecipe.ingredients!];
                    newIng[idx].unit = e.target.value;
                    setManualRecipe({...manualRecipe, ingredients: newIng});
                  }}>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="cups">cups</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="whole">whole</option>
                  </select>
                  <input type="text" className="flex-1 border-gray-300 rounded-lg p-2 border text-sm" placeholder="Ingredient name" value={ing.name} onChange={e => {
                    const newIng = [...manualRecipe.ingredients!];
                    newIng[idx].name = e.target.value;
                    setManualRecipe({...manualRecipe, ingredients: newIng});
                  }} />
                  <select className="w-32 border-gray-300 rounded-lg p-2 border text-sm" value={ing.category} onChange={e => {
                    const newIng = [...manualRecipe.ingredients!];
                    newIng[idx].category = e.target.value as any;
                    setManualRecipe({...manualRecipe, ingredients: newIng});
                  }}>
                    <option value="produce">Produce</option>
                    <option value="dairy">Dairy</option>
                    <option value="other">Other</option>
                  </select>
                  <button onClick={() => {
                    const newIng = manualRecipe.ingredients!.filter((_, i) => i !== idx);
                    setManualRecipe({...manualRecipe, ingredients: newIng});
                  }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><FiTrash2 /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setManualRecipe({...manualRecipe, ingredients: [...manualRecipe.ingredients!, {name: '', amount: 1, unit: 'g', category: 'other', isCommon: false, isNut: false}]})} className="mt-4 flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700">
              <FiPlus /> Add Ingredient
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">Instructions</h3>
            <div className="space-y-3">
              {manualRecipe.method?.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="font-bold text-gray-400 pt-2">{idx + 1}.</div>
                  <textarea className="flex-1 border-gray-300 rounded-lg p-2 border text-sm min-h-[80px]" placeholder="Instruction step..." value={step.instruction} onChange={e => {
                    const newMethod = [...manualRecipe.method!];
                    newMethod[idx].instruction = e.target.value;
                    setManualRecipe({...manualRecipe, method: newMethod});
                  }} />
                  <button onClick={() => {
                    const newMethod = manualRecipe.method!.filter((_, i) => i !== idx).map((s, i) => ({...s, stepNumber: i + 1}));
                    setManualRecipe({...manualRecipe, method: newMethod});
                  }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg h-fit"><FiTrash2 /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setManualRecipe({...manualRecipe, method: [...manualRecipe.method!, {stepNumber: manualRecipe.method!.length + 1, instruction: ''}]})} className="mt-4 flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700">
              <FiPlus /> Add Step
            </button>
          </div>

          <div className="pt-6">
            <button onClick={handleManualSave} className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors">
              Save Recipe
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <p className="text-gray-600">Use AI to quickly import a recipe from a URL or raw text. Generate the prompt here, paste it into ChatGPT/Claude, and paste the resulting JSON back.</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe URL (optional)</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 border-gray-300 rounded-lg p-2 border" placeholder="https://..." value={urlInput} onChange={e => setUrlInput(e.target.value)} />
              <button onClick={handleGeneratePrompt} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
                Generate Prompt
              </button>
            </div>
          </div>

          {promptGenerated && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Prompt</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                  {copied ? <><FiCheck className="text-green-500"/> Copied</> : <><FiCopy /> Copy</>}
                </button>
              </div>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-gray-100">
                {promptGenerated}
              </pre>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Paste JSON Response</label>
            <textarea 
              className="w-full border-gray-300 rounded-lg p-3 border font-mono text-sm min-h-[200px]" 
              placeholder='{"name": "...", "ingredients": [...]}'
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
            />
            {llmError && <p className="text-red-500 text-sm mt-1">{llmError}</p>}
          </div>

          <div className="pt-2">
            <button onClick={handleParseJSON} disabled={!jsonInput} className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors">
              Parse & Save Recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeImport;
