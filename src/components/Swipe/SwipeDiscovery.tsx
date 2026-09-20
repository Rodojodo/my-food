import { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { FiX, FiHeart, FiClock, FiStar } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Recipe } from '../../types/types';
import { v4 as uuidv4 } from 'uuid';

interface SwipeDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

// Some dummy built-in recipes to discover
const MOCK_DISCOVERY_RECIPES: Recipe[] = [
  {
    id: uuidv4(),
    name: 'Spicy Peanut Noodles',
    description: 'Quick and easy noodles in a spicy peanut sauce.',
    image: 'https://images.unsplash.com/photo-1603222213768-e395e86d066f?q=80&w=1000&auto=format&fit=crop',
    ingredients: [
      { name: 'Noodles', amount: 200, unit: 'g', category: 'grains', isCommon: false, isNut: false },
      { name: 'Peanut Butter', amount: 3, unit: 'tbsp', category: 'other', isCommon: false, isNut: true },
      { name: 'Soy Sauce', amount: 2, unit: 'tbsp', category: 'condiments', isCommon: true, isNut: false },
      { name: 'Chili Flakes', amount: 1, unit: 'tsp', category: 'spices', isCommon: true, isNut: false },
    ],
    method: [{ stepNumber: 1, instruction: 'Boil noodles.' }, { stepNumber: 2, instruction: 'Mix sauce and combine.' }],
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    totalTime: 15,
    tags: ['spicy', 'noodles', 'asian'],
    cuisine: 'Asian',
    isVegan: true,
    isQuick: true,
    isFavourite: false,
    rating: 0,
    source: 'ai-generated',
    unitSystem: 'metric',
    dateAdded: new Date().toISOString(),
    timesUsed: 0,
  },
  {
    id: uuidv4(),
    name: 'Mushroom Risotto',
    description: 'Creamy and comforting mushroom risotto with parmesan.',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=1000&auto=format&fit=crop',
    ingredients: [
      { name: 'Arborio Rice', amount: 1.5, unit: 'cup', category: 'grains', isCommon: false, isNut: false },
      { name: 'Mushrooms', amount: 300, unit: 'g', category: 'produce', isCommon: false, isNut: false },
      { name: 'Vegetable Broth', amount: 4, unit: 'cup', category: 'other', isCommon: false, isNut: false },
      { name: 'Parmesan', amount: 0.5, unit: 'cup', category: 'dairy', isCommon: false, isNut: false },
      { name: 'Onion', amount: 1, unit: 'piece', category: 'produce', isCommon: true, isNut: false },
    ],
    method: [{ stepNumber: 1, instruction: 'Saute onions and mushrooms.' }, { stepNumber: 2, instruction: 'Add rice and slowly add broth.' }],
    servings: 4,
    prepTime: 10,
    cookTime: 30,
    totalTime: 40,
    tags: ['comfort', 'dinner'],
    cuisine: 'Italian',
    isVegan: false,
    isQuick: false,
    isFavourite: false,
    rating: 0,
    source: 'ai-generated',
    unitSystem: 'metric',
    dateAdded: new Date().toISOString(),
    timesUsed: 0,
  },
  {
    id: uuidv4(),
    name: 'Black Bean Tacos',
    description: 'Fresh and zesty black bean tacos with avocado salsa.',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=1000&auto=format&fit=crop',
    ingredients: [
      { name: 'Corn Tortillas', amount: 8, unit: 'piece', category: 'bakery', isCommon: false, isNut: false },
      { name: 'Black Beans', amount: 1, unit: 'can', category: 'canned', isCommon: false, isNut: false },
      { name: 'Avocado', amount: 2, unit: 'piece', category: 'produce', isCommon: false, isNut: false },
      { name: 'Lime', amount: 1, unit: 'piece', category: 'produce', isCommon: false, isNut: false },
    ],
    method: [{ stepNumber: 1, instruction: 'Warm tortillas.' }, { stepNumber: 2, instruction: 'Mash beans and assemble with avocado.' }],
    servings: 2,
    prepTime: 15,
    cookTime: 5,
    totalTime: 20,
    tags: ['mexican', 'tacos'],
    cuisine: 'Mexican',
    isVegan: true,
    isQuick: true,
    isFavourite: false,
    rating: 0,
    source: 'ai-generated',
    unitSystem: 'metric',
    dateAdded: new Date().toISOString(),
    timesUsed: 0,
  }
];

export default function SwipeDiscovery({ isOpen, onClose }: SwipeDiscoveryProps) {
  const { addRecipe, rejectRecipe, toggleFavourite, recipes } = useRecipeStore();
  const { settings } = useSettingsStore();
  const [veganOnly, setVeganOnly] = useState(settings.veganOnly);
  const [quickOnly, setQuickOnly] = useState(false);
  const [cards, setCards] = useState<Recipe[]>([]);

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState<null | 'left' | 'right' | 'up'>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // Load available recipes
  useEffect(() => {
    if (isOpen) {
      // Filter out recipes already in store
      const existingIds = new Set(recipes.map(r => r.name)); // simplified match
      let available = MOCK_DISCOVERY_RECIPES.filter(r => !existingIds.has(r.name));
      
      if (veganOnly) available = available.filter(r => r.isVegan);
      if (quickOnly) available = available.filter(r => r.isQuick);

      setCards(available);
      setFlyOut(null);
      setDrag({ x: 0, y: 0 });
    }
  }, [isOpen, veganOnly, quickOnly, recipes]);

  if (!isOpen) return null;

  const currentCard = cards[0];
  const SWIPE_THRESHOLD = 100;
  
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setDrag({
      x: clientX - startPos.x,
      y: clientY - startPos.y
    });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (drag.x > SWIPE_THRESHOLD) {
      handleAction('like');
    } else if (drag.x < -SWIPE_THRESHOLD) {
      handleAction('skip');
    } else if (drag.y < -SWIPE_THRESHOLD && Math.abs(drag.x) < SWIPE_THRESHOLD) {
      handleAction('favourite');
    } else {
      // Spring back
      setDrag({ x: 0, y: 0 });
    }
  };

  const handleAction = async (action: 'like' | 'skip' | 'favourite') => {
    if (!currentCard) return;

    // Trigger animation
    if (action === 'like') setFlyOut('right');
    else if (action === 'skip') setFlyOut('left');
    else if (action === 'favourite') setFlyOut('up');

    // Perform state update after animation
    setTimeout(async () => {
      const { id, isFavourite, rating, dateAdded, timesUsed, ...recipeData } = currentCard;
      if (action === 'like') {
        await addRecipe(recipeData);
      } else if (action === 'favourite') {
        const added = await addRecipe(recipeData);
        await toggleFavourite(added.id);
      } else if (action === 'skip') {
        await rejectRecipe(id);
      }
      
      setCards(prev => prev.slice(1));
      setFlyOut(null);
      setDrag({ x: 0, y: 0 });
    }, 300);
  };

  // Mouse events
  const onMouseDown = (e: ReactMouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: ReactMouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

  // Touch events
  const onTouchStart = (e: ReactTouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: ReactTouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  const getCardStyle = (index: number) => {
    if (index === 0) {
      const flyX = flyOut === 'right' ? window.innerWidth : flyOut === 'left' ? -window.innerWidth : 0;
      const flyY = flyOut === 'up' ? -window.innerHeight : 0;
      
      const targetX = flyOut ? flyX : drag.x;
      const targetY = flyOut ? flyY : drag.y;
      
      const rotate = targetX * 0.1;
      
      return {
        transform: `translate(${targetX}px, ${targetY}px) rotate(${rotate}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: 10,
      };
    }
    
    // Background cards
    const offset = index * 10;
    const scale = 1 - index * 0.05;
    return {
      transform: `translateY(${offset}px) scale(${scale})`,
      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      zIndex: 10 - index,
      opacity: 1 - index * 0.2,
    };
  };

  const renderOverlays = () => {
    if (!currentCard) return null;
    
    const likeOpacity = Math.min(Math.max(drag.x / SWIPE_THRESHOLD, 0), 1);
    const skipOpacity = Math.min(Math.max(-drag.x / SWIPE_THRESHOLD, 0), 1);
    const favOpacity = Math.min(Math.max(-drag.y / SWIPE_THRESHOLD, 0), 1);

    return (
      <>
        {/* Like Overlay */}
        <div 
          className="absolute inset-0 bg-green-500/20 rounded-2xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'right' ? 1 : (flyOut ? 0 : likeOpacity) }}
        >
          <div className="border-4 border-green-500 text-green-500 text-6xl font-black p-4 rounded-xl rotate-[-20deg]">LIKE</div>
        </div>
        {/* Skip Overlay */}
        <div 
          className="absolute inset-0 bg-red-500/20 rounded-2xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'left' ? 1 : (flyOut ? 0 : skipOpacity) }}
        >
          <div className="border-4 border-red-500 text-red-500 text-6xl font-black p-4 rounded-xl rotate-[20deg]">NOPE</div>
        </div>
        {/* Favourite Overlay */}
        <div 
          className="absolute inset-0 bg-yellow-500/30 rounded-2xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'up' ? 1 : (flyOut ? 0 : favOpacity) }}
        >
          <div className="border-4 border-yellow-500 text-yellow-500 text-6xl font-black p-4 rounded-xl">SUPER</div>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/90 backdrop-blur-sm overflow-hidden text-neutral-800">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white shrink-0">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={veganOnly} 
              onChange={e => setVeganOnly(e.target.checked)} 
              className="accent-green-500 w-4 h-4"
            />
            <span className="text-sm font-medium">Vegan only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={quickOnly} 
              onChange={e => setQuickOnly(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-sm font-medium">Quick (&lt;30m)</span>
          </label>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <FiX size={24} />
        </button>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {cards.length === 0 ? (
          <div className="text-center text-white max-w-sm px-6">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-2xl font-bold mb-2">You're all caught up!</h3>
            <p className="text-neutral-300">You've seen all available recipes. Try adjusting your filters or importing more.</p>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-[3/4] sm:max-w-md sm:aspect-[4/5]">
            {cards.slice(0, 3).reverse().map((card, idx) => {
              const realIndex = cards.slice(0, 3).length - 1 - idx;
              const isTop = realIndex === 0;

              return (
                <div
                  key={card.id}
                  ref={isTop ? cardRef : null}
                  className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col select-none touch-none"
                  style={getCardStyle(realIndex)}
                  onMouseDown={isTop ? onMouseDown : undefined}
                  onMouseMove={isTop ? onMouseMove : undefined}
                  onMouseUp={isTop ? onMouseUp : undefined}
                  onMouseLeave={isTop ? onMouseLeave : undefined}
                  onTouchStart={isTop ? onTouchStart : undefined}
                  onTouchMove={isTop ? onTouchMove : undefined}
                  onTouchEnd={isTop ? onTouchEnd : undefined}
                >
                  {/* Image */}
                  <div className="relative h-3/5 w-full bg-neutral-200 shrink-0">
                    {card.image ? (
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-200 to-green-200 flex items-center justify-center text-6xl">🍲</div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {card.isVegan && <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">Vegan</span>}
                      {card.isQuick && <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">Quick</span>}
                    </div>
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <FiClock /> {card.totalTime}m
                    </div>
                    
                    {/* Gradient overlay for text legibility if we wanted title over image, but we are putting it below */}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 bg-white">
                    <h2 className="text-2xl font-extrabold text-neutral-900 mb-1">{card.name}</h2>
                    <p className="text-sm text-neutral-500 font-medium mb-3">{card.cuisine} • {card.servings} Servings</p>
                    
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-neutral-700 mb-2">Key Ingredients</p>
                      <ul className="text-sm text-neutral-600 line-clamp-3">
                        {card.ingredients.slice(0, 5).map((ing, i) => (
                          <li key={i}>• {ing.name}</li>
                        ))}
                        {card.ingredients.length > 5 && <li>• ...and {card.ingredients.length - 5} more</li>}
                      </ul>
                    </div>
                  </div>

                  {isTop && renderOverlays()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      {cards.length > 0 && (
        <div className="flex justify-center items-center gap-6 p-6 shrink-0 pb-10">
          <button 
            onClick={() => handleAction('skip')}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-xl hover:scale-110 hover:bg-red-50 transition-all focus:outline-none"
          >
            <FiX size={32} strokeWidth={3} />
          </button>
          
          <button 
            onClick={() => handleAction('favourite')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-yellow-500 shadow-xl hover:scale-110 hover:bg-yellow-50 transition-all focus:outline-none"
          >
            <FiStar size={24} strokeWidth={3} fill="currentColor" />
          </button>
          
          <button 
            onClick={() => handleAction('like')}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-500 shadow-xl hover:scale-110 hover:bg-green-50 transition-all focus:outline-none"
          >
            <FiHeart size={32} strokeWidth={3} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
