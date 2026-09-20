import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { FiX, FiHeart, FiClock, FiStar, FiKey, FiExternalLink, FiLoader, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Recipe } from '../../types/types';
import { getRandomRecipes, isApiKeyConfigured } from '../../services/spoonacularService';

interface SwipeDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SwipeDiscovery({ isOpen, onClose }: SwipeDiscoveryProps) {
  const { addRecipe, rejectRecipe, toggleFavourite, recipes } = useRecipeStore();
  const { settings, setApiKey } = useSettingsStore();

  const [veganOnly, setVeganOnly] = useState(settings.veganOnly);
  const [quickOnly, setQuickOnly] = useState(false);
  const [cards, setCards] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(isApiKeyConfigured());

  // API Key modal state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState(settings.spoonacularApiKey || '');
  const [showKeyText, setShowKeyText] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Swipe animation states
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState<null | 'left' | 'right' | 'up'>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Helper to fetch online recipes from Spoonacular
  const fetchOnlineRecipes = useCallback(async (count = 8): Promise<Recipe[]> => {
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const onlineRecipes = await getRandomRecipes(count, { vegan: veganOnly });

      const existingNames = new Set(recipes.map(r => r.name.toLowerCase()));
      let filtered = onlineRecipes.filter(r => !existingNames.has(r.name.toLowerCase()));

      if (quickOnly) {
        filtered = filtered.filter(r => r.isQuick);
      }

      return filtered;
    } catch (err) {
      console.error('Failed to fetch online recipes:', err);
      return [];
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [veganOnly, quickOnly, recipes]);

  // Helper to get fallback cards from the local recipe pool (80 built-in recipes)
  const getLocalCards = useCallback((): Recipe[] => {
    const existingNames = new Set(cards.map(c => c.name.toLowerCase()));
    let pool = recipes.filter(r => !r.isFavourite && !r.rejected && !existingNames.has(r.name.toLowerCase()));

    if (veganOnly) pool = pool.filter(r => r.isVegan);
    if (quickOnly) pool = pool.filter(r => r.isQuick);

    // Shuffle randomly
    return [...pool].sort(() => Math.random() - 0.5);
  }, [cards, recipes, veganOnly, quickOnly]);

  // Initial load when modal opens or filter changes
  useEffect(() => {
    if (!isOpen) return;

    const apiKeyAvailable = isApiKeyConfigured();
    setHasApiKey(apiKeyAvailable);
    setCards([]);
    setFlyOut(null);
    setDrag({ x: 0, y: 0 });

    const loadInitial = async () => {
      if (apiKeyAvailable) {
        const live = await fetchOnlineRecipes(8);
        if (live.length > 0) {
          setCards(live);
          return;
        }
      }
      // Fallback to built-in recipes
      setCards(getLocalCards());
    };

    loadInitial();
  }, [isOpen, veganOnly, quickOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite swipe pagination: auto-fetch more when cards run low (< 3)
  useEffect(() => {
    if (!isOpen || isFetchingRef.current) return;

    if (cards.length > 0 && cards.length <= 2) {
      if (hasApiKey) {
        fetchOnlineRecipes(6).then(more => {
          if (more.length > 0) {
            setCards(prev => [...prev, ...more]);
          } else {
            const local = getLocalCards();
            if (local.length > 0) setCards(prev => [...prev, ...local.slice(0, 5)]);
          }
        });
      } else {
        const local = getLocalCards();
        if (local.length > 0) {
          setCards(prev => [...prev, ...local.slice(0, 5)]);
        }
      }
    }
  }, [cards.length, isOpen, hasApiKey, fetchOnlineRecipes, getLocalCards]);

  const handleSaveApiKey = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    await setApiKey(trimmed);
    setHasApiKey(true);
    setKeySavedMessage(true);

    setTimeout(async () => {
      setShowKeyModal(false);
      setKeySavedMessage(false);
      const live = await fetchOnlineRecipes(8);
      if (live.length > 0) {
        setCards(live);
      }
    }, 1000);
  };

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
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/90 backdrop-blur-md overflow-hidden text-neutral-800">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-4 text-white shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          {hasApiKey ? (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs rounded-full font-medium transition-colors cursor-pointer"
              title="Click to edit Spoonacular API key"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Online API
            </button>
          ) : (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs rounded-full font-medium transition-colors cursor-pointer"
            >
              <FiKey className="w-3.5 h-3.5" />
              Connect Live API Key
            </button>
          )}

          {isLoading && (
            <span className="text-xs text-neutral-400 flex items-center gap-1">
              <FiLoader className="animate-spin text-orange-400" /> Loading recipes...
            </span>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 ml-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white text-xs">
              <input
                type="checkbox"
                checked={veganOnly}
                onChange={e => setVeganOnly(e.target.checked)}
                className="accent-green-500 rounded w-3.5 h-3.5"
              />
              Vegan
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white text-xs">
              <input
                type="checkbox"
                checked={quickOnly}
                onChange={e => setQuickOnly(e.target.checked)}
                className="accent-orange-500 rounded w-3.5 h-3.5"
              />
              Quick (&le;30m)
            </label>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          aria-label="Close"
        >
          <FiX size={22} />
        </button>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {cards.length === 0 ? (
          <div className="text-center text-white max-w-sm px-6">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-2xl font-bold mb-2">You're all caught up!</h3>
            <p className="text-neutral-300 text-sm mb-4">
              {hasApiKey
                ? "Fetching more recipes from the web..."
                : "Connect a free Spoonacular API key for unlimited live web recipes, or adjust your filters."}
            </p>
            {!hasApiKey && (
              <button
                onClick={() => setShowKeyModal(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg cursor-pointer"
              >
                Connect Free API Key
              </button>
            )}
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
                  className="absolute inset-0 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col select-none touch-none border border-neutral-100"
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
                  <div className="relative h-3/5 w-full bg-neutral-100 shrink-0">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-6xl">
                        🍲
                      </div>
                    )}

                    {/* Source & Tags */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-md ${
                        card.source === 'online' ? 'bg-sky-500 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        {card.source === 'online' ? 'Online' : 'AI Generated'}
                      </span>
                      {card.isVegan && <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-md">Vegan</span>}
                      {card.isQuick && <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-md">Quick</span>}
                    </div>

                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <FiClock /> {card.totalTime}m
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 bg-white">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mb-1 line-clamp-1">{card.name}</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 font-medium mb-3">
                      {card.cuisine} &bull; {card.servings} Servings
                    </p>

                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Key Ingredients</p>
                      <ul className="text-xs sm:text-sm text-neutral-700 line-clamp-3 space-y-0.5">
                        {card.ingredients.slice(0, 5).map((ing, i) => (
                          <li key={i}>&bull; {ing.name}</li>
                        ))}
                        {card.ingredients.length > 5 && (
                          <li className="text-neutral-400 italic">&bull; +{card.ingredients.length - 5} more ingredients</li>
                        )}
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
        <div className="flex justify-center items-center gap-6 p-6 shrink-0 pb-8">
          <button
            onClick={() => handleAction('skip')}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-xl hover:scale-110 hover:bg-red-50 transition-all focus:outline-none cursor-pointer"
            title="Skip (Swipe Left)"
          >
            <FiX size={30} strokeWidth={3} />
          </button>

          <button
            onClick={() => handleAction('favourite')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-yellow-500 shadow-xl hover:scale-110 hover:bg-yellow-50 transition-all focus:outline-none cursor-pointer"
            title="Favourite & Save (Swipe Up)"
          >
            <FiStar size={22} strokeWidth={3} fill="currentColor" />
          </button>

          <button
            onClick={() => handleAction('like')}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-500 shadow-xl hover:scale-110 hover:bg-green-50 transition-all focus:outline-none cursor-pointer"
            title="Like & Save (Swipe Right)"
          >
            <FiHeart size={30} strokeWidth={3} fill="currentColor" />
          </button>
        </div>
      )}

      {/* API Key Connection Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 text-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-neutral-900">
                <FiKey className="text-orange-500" /> Spoonacular API Key
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer">
                <FiX size={20} />
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              Connect your free Spoonacular API key to unlock hundreds of thousands of live online vegetarian recipes for infinite swipe discovery!
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-4 text-xs text-orange-900 leading-relaxed">
              <span className="font-bold text-sm">How to get your free key (takes ~60 seconds):</span>
              <ol className="list-decimal list-inside mt-1.5 space-y-1">
                <li>Create a free account at Spoonacular.</li>
                <li>Copy your API key from the dashboard.</li>
                <li>Paste it below and click Save. 150 requests/day free forever.</li>
              </ol>
              <a
                href="https://spoonacular.com/food-api/console#Dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-orange-700 underline mt-2 hover:text-orange-900"
              >
                Open Spoonacular Console <FiExternalLink />
              </a>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Your Spoonacular API Key
              </label>
              <div className="relative">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  placeholder="Paste API key here..."
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-neutral-300 rounded-lg text-sm bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showKeyText ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {keySavedMessage && (
              <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium mb-4">
                <FiCheck /> API key saved! Loading live recipes...
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={!inputKey.trim()}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white text-sm font-semibold rounded-lg transition-colors shadow-md cursor-pointer"
              >
                Save &amp; Discover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
