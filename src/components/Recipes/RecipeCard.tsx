import { FiClock, FiHeart, FiStar, FiEdit2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../../types/types';
import { getSourceLabel } from '../../types/types';
import { useRecipeStore } from '../../stores/recipeStore';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (id: string) => void;
}

const RecipeCard = ({ recipe, onSelect }: RecipeCardProps) => {
  const navigate = useNavigate();
  const { toggleFavourite, toggleQuick } = useRecipeStore();

  const handleClick = () => {
    if (onSelect) {
      onSelect(recipe.id);
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  };

  const handleFavouriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavourite(recipe.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/recipe/${recipe.id}?edit=true`);
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col h-full border border-gray-100"
    >
      <div className="relative h-48 w-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-4xl">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="object-cover w-full h-full" />
        ) : (
          <span>🍲</span>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button 
            onClick={handleEditClick}
            className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white text-gray-600 hover:text-orange-600 transition-colors shadow-xs"
            title="Edit recipe"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleFavouriteClick}
            className="p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-xs"
            title={recipe.isFavourite ? 'Remove from favourites' : 'Save as favourite'}
          >
            <FiHeart className={`w-5 h-5 ${recipe.isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-800 line-clamp-2 leading-tight">{recipe.name}</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
            <FiClock className="w-3 h-3" /> {recipe.totalTime}m
          </span>
          {recipe.isVegan && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">
              Vegan
            </span>
          )}
          <label 
            onClick={(e) => e.stopPropagation()} 
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md font-medium cursor-pointer transition-colors border select-none ${
              recipe.isQuick 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
            title="Mark as Fast recipe"
          >
            <input
              type="checkbox"
              checked={recipe.isQuick}
              onChange={(e) => {
                e.stopPropagation();
                toggleQuick(recipe.id);
              }}
              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
            Fast
          </label>
          <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-md font-medium capitalize">
            {recipe.cuisine}
          </span>
          <span className={`px-2 py-1 text-xs rounded-md font-medium ${
            recipe.source === 'online' || recipe.source === 'api'
              ? 'bg-sky-50 text-sky-700'
              : recipe.source === 'imported'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-purple-50 text-purple-700'
          }`}>
            {getSourceLabel(recipe.source)}
          </span>
        </div>
        
        <div className="mt-auto flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1 text-yellow-500">
            <FiStar className={`w-4 h-4 ${recipe.rating > 0 ? 'fill-current' : 'text-gray-300'}`} />
            <span className={recipe.rating > 0 ? 'font-medium text-gray-700' : 'text-gray-400'}>
              {recipe.rating > 0 ? recipe.rating : 'No rating'}
            </span>
          </div>
          <div>
            {recipe.servings} servings
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
