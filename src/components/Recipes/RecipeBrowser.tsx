import React, { useEffect } from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import RecipeCard from './RecipeCard';
import { useSettingsStore } from '../../stores/settingsStore';

const RecipeBrowser: React.FC = () => {
  const { 
    filters, 
    setFilters, 
    getFilteredRecipes, 
    loadRecipes,
    isInitialized
  } = useRecipeStore();
  
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!isInitialized) {
      loadRecipes();
    }
  }, [isInitialized, loadRecipes]);

  const recipes = getFilteredRecipes();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleVeganToggle = () => {
    setFilters({ veganOnly: !filters.veganOnly });
  };

  const handleQuickToggle = () => {
    setFilters({ quickOnly: !filters.quickOnly });
  };

  const handleFavouritesToggle = () => {
    setFilters({ favouritesOnly: !filters.favouritesOnly });
  };

  const handleCuisineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ cuisine: e.target.value });
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ source: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ sortBy: e.target.value as any });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Recipes</h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400 w-5 h-5" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm shadow-sm transition-shadow"
            placeholder="Search recipes, ingredients, tags..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mr-2">
            <FiFilter className="w-5 h-5" />
            <span className="font-medium text-sm">Filters:</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input 
              type="checkbox" 
              checked={filters.veganOnly} 
              onChange={handleVeganToggle}
              className="rounded text-green-500 focus:ring-green-500 w-4 h-4"
              disabled={settings.veganOnly}
            />
            Vegan
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input 
              type="checkbox" 
              checked={filters.quickOnly} 
              onChange={handleQuickToggle}
              className="rounded text-yellow-500 focus:ring-yellow-500 w-4 h-4"
            />
            Quick (&le;30m)
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input 
              type="checkbox" 
              checked={filters.favouritesOnly} 
              onChange={handleFavouritesToggle}
              className="rounded text-red-500 focus:ring-red-500 w-4 h-4"
            />
            Favourites
          </label>

          <select 
            value={filters.cuisine}
            onChange={handleCuisineChange}
            className="text-sm border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-orange-500 focus:border-orange-500 py-1.5 pl-3 pr-8"
          >
            <option value="">All Cuisines</option>
            <option value="Italian">Italian</option>
            <option value="Indian">Indian</option>
            <option value="Mexican">Mexican</option>
            <option value="Asian">Asian</option>
            <option value="Middle Eastern">Middle Eastern</option>
            <option value="American">American</option>
            <option value="British">British</option>
            <option value="French">French</option>
          </select>

          <select 
            value={filters.source}
            onChange={handleSourceChange}
            className="text-sm border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-orange-500 focus:border-orange-500 py-1.5 pl-3 pr-8"
          >
            <option value="">All Sources</option>
            <option value="builtin">Built-in</option>
            <option value="imported">Imported</option>
            <option value="api">API</option>
          </select>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Sort by:</span>
            <select 
              value={filters.sortBy}
              onChange={handleSortChange}
              className="text-sm border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-orange-500 focus:border-orange-500 py-1.5 pl-3 pr-8"
            >
              <option value="name">Name</option>
              <option value="rating">Rating</option>
              <option value="cookTime">Cook Time</option>
              <option value="dateAdded">Date Added</option>
              <option value="timesUsed">Most Used</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center text-gray-500 text-sm">
        <span>Showing {recipes.length} recipe{recipes.length !== 1 && 's'}</span>
      </div>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-4">🍽️</div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">No recipes found</h3>
          <p className="text-gray-500">Try adjusting your filters or search query.</p>
        </div>
      )}
    </div>
  );
};

export default RecipeBrowser;
