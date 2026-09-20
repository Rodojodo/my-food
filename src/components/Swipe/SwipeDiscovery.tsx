import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { FiX, FiHeart, FiClock, FiStar, FiKey, FiExternalLink, FiLoader, FiCheck, FiEye, FiEyeOff, FiCpu, FiGlobe } from 'react-icons/fi';
import { useRecipeStore } from '../../stores/recipeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Recipe } from '../../types/types';
import { getRandomRecipes, isApiKeyConfigured as isSpoonacularConfigured } from '../../services/spoonacularService';
import { generateGeminiBatch, isGeminiConfigured } from '../../services/geminiService';
import { getGeminiBank, saveGeminiBank, removeGeminiSpare } from '../../stores/db';

interface SwipeDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SwipeCard extends Recipe {
  _isGeminiCandidate?: boolean;
}

export default function SwipeDiscovery({ isOpen, onClose }: SwipeDiscoveryProps) {
  const { addRecipe, rejectRecipe, toggleFavourite } = useRecipeStore();
  const { settings, setApiKey, setGeminiApiKey } = useSettingsStore();

  const [veganOnly, setVeganOnly] = useState(settings.veganOnly);
  const [quickOnly, setQuickOnly] = useState(false);

  // Card deck & queues
  const [cards, setCards] = useState<SwipeCard[]>([]);
  const [geminiBank, setGeminiBank] = useState<Recipe[]>([]);
  const [spoonacularBuffer, setSpoonacularBuffer] = useState<Recipe[]>([]);

  // Loading & generation states
  const [isLoadingSpoonacular, setIsLoadingSpoonacular] = useState(false);
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);

  // Key configurations
  const [hasSpoonacularKey, setHasSpoonacularKey] = useState(isSpoonacularConfigured());
  const [hasGeminiKey, setHasGeminiKey] = useState(isGeminiConfigured());

  // API Key modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputSpoonacularKey, setInputSpoonacularKey] = useState(settings.spoonacularApiKey || '');
  const [inputGeminiKey, setInputGeminiKey] = useState(settings.geminiApiKey || '');
  const [showSpoonKeyText, setShowSpoonKeyText] = useState(false);
  const [showGemKeyText, setShowGemKeyText] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState('');

  // Swipe gesture & animation states
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState<null | 'left' | 'right' | 'up'>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const isFetchingSpoonacularRef = useRef(false);
  const isGeneratingGeminiRef = useRef(false);

  // --- Background Gemini Generator ---
  // Replenishes the spare bank with 10 unique recipes, passing all current recipes as exclusions
  const replenishGeminiBank = useCallback(async () => {
    if (isGeneratingGeminiRef.current || !isGeminiConfigured()) return;

    try {
      isGeneratingGeminiRef.current = true;
      setIsGeneratingGemini(true);

      // Collect all current recipe names in the user's saved bank
      const currentSavedNames = useRecipeStore.getState().recipes.map(r => r.name);
      
      const newTen = await generateGeminiBatch(currentSavedNames, {
        veganOnly,
        count: 10,
      });

      if (newTen.length > 0) {
        await saveGeminiBank(newTen);
        setGeminiBank(newTen);
      }
    } catch (err) {
      console.error('Gemini batch generation failed:', err);
    } finally {
      setIsGeneratingGemini(false);
      isGeneratingGeminiRef.current = false;
    }
  }, [veganOnly]);

  // --- Spoonacular Fetcher ---
  const fetchSpoonacularRecipes = useCallback(async (count = 10): Promise<Recipe[]> => {
    if (isFetchingSpoonacularRef.current || !isSpoonacularConfigured()) return [];

    try {
      isFetchingSpoonacularRef.current = true;
      setIsLoadingSpoonacular(true);

      const fetched = await getRandomRecipes(count, { vegan: veganOnly });
      const currentNames = new Set(useRecipeStore.getState().recipes.map(r => r.name.toLowerCase()));
      let filtered = fetched.filter(r => !currentNames.has(r.name.toLowerCase()));

      if (quickOnly) {
        filtered = filtered.filter(r => r.isQuick);
      }

      return filtered;
    } catch (err) {
      console.error('Spoonacular fetch failed:', err);
      return [];
    } finally {
      setIsLoadingSpoonacular(false);
      isFetchingSpoonacularRef.current = false;
    }
  }, [veganOnly, quickOnly]);

  // Helper to draw the next card according to 80% Spoonacular / 20% Gemini
  const buildNextCards = useCallback((
    targetCount: number,
    currentDeck: SwipeCard[],
    currentGemini: Recipe[],
    currentSpoon: Recipe[]
  ): { newCards: SwipeCard[]; remainingGemini: Recipe[]; remainingSpoon: Recipe[] } => {
    const needed = targetCount - currentDeck.length;
    if (needed <= 0) {
      return { newCards: currentDeck, remainingGemini: currentGemini, remainingSpoon: currentSpoon };
    }

    const added: SwipeCard[] = [];
    const updatedGemini = [...currentGemini];
    const updatedSpoon = [...currentSpoon];

    for (let i = 0; i < needed; i++) {
      // 20% chance of Gemini, 80% chance of Spoonacular
      // (While Gemini is generating or empty, only Spoonacular recipes are used)
      const canUseGemini = updatedGemini.length > 0 && !isGeneratingGeminiRef.current;
      const roll = Math.random();

      if (canUseGemini && (roll < 0.20 || updatedSpoon.length === 0)) {
        const geminiCard = updatedGemini.shift()!;
        added.push({
          ...geminiCard,
          _isGeminiCandidate: true,
          source: 'ai-generated',
        });
      } else if (updatedSpoon.length > 0) {
        const spoonCard = updatedSpoon.shift()!;
        added.push({
          ...spoonCard,
          _isGeminiCandidate: false,
          source: 'online',
        });
      }
    }

    return {
      newCards: [...currentDeck, ...added],
      remainingGemini: updatedGemini,
      remainingSpoon: updatedSpoon,
    };
  }, []);

  // --- Initial Load on Modal Open ---
  useEffect(() => {
    if (!isOpen) return;

    const spoonOk = isSpoonacularConfigured();
    const geminiOk = isGeminiConfigured();
    setHasSpoonacularKey(spoonOk);
    setHasGeminiKey(geminiOk);

    setCards([]);
    setFlyOut(null);
    setDrag({ x: 0, y: 0 });

    const initDeck = async () => {
      // 1. Load spare Gemini bank from IndexedDB
      let storedGemini = await getGeminiBank();

      // If Gemini bank is empty and Gemini key is configured, trigger replenishment in background
      if (storedGemini.length === 0 && geminiOk) {
        replenishGeminiBank();
      }
      setGeminiBank(storedGemini);

      // 2. Fetch initial batch of Spoonacular recipes
      let spoonRecipes: Recipe[] = [];
      if (spoonOk) {
        spoonRecipes = await fetchSpoonacularRecipes(12);
        setSpoonacularBuffer(spoonRecipes);
      }

      // 3. Assemble initial deck of cards using 80/20 ratio
      const { newCards, remainingGemini, remainingSpoon } = buildNextCards(
        5,
        [],
        storedGemini,
        spoonRecipes
      );

      setCards(newCards);
      setGeminiBank(remainingGemini);
      setSpoonacularBuffer(remainingSpoon);
    };

    initDeck();
  }, [isOpen, veganOnly, quickOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Deck Top-Up Listener ---
  useEffect(() => {
    if (!isOpen) return;

    // If deck has <= 2 cards, replenish deck and background buffers
    if (cards.length <= 2) {
      // If spoonacular buffer is running low, fetch more in background
      if (spoonacularBuffer.length <= 3 && hasSpoonacularKey && !isFetchingSpoonacularRef.current) {
        fetchSpoonacularRecipes(10).then(more => {
          if (more.length > 0) {
            setSpoonacularBuffer(prev => [...prev, ...more]);
          }
        });
      }

      // Check if Gemini bank has run out -> trigger 10 more
      if (geminiBank.length === 0 && hasGeminiKey && !isGeneratingGeminiRef.current) {
        replenishGeminiBank();
      }

      // Top up deck to 5 cards
      if (spoonacularBuffer.length > 0 || geminiBank.length > 0) {
        const { newCards, remainingGemini, remainingSpoon } = buildNextCards(
          5,
          cards,
          geminiBank,
          spoonacularBuffer
        );
        setCards(newCards);
        setGeminiBank(remainingGemini);
        setSpoonacularBuffer(remainingSpoon);
      }
    }
  }, [cards.length, isOpen, geminiBank, spoonacularBuffer, hasSpoonacularKey, hasGeminiKey, buildNextCards, fetchSpoonacularRecipes, replenishGeminiBank]);

  // Handle saving API keys from modal
  const handleSaveKeys = async () => {
    let savedAny = false;
    if (inputSpoonacularKey.trim()) {
      await setApiKey(inputSpoonacularKey.trim());
      setHasSpoonacularKey(true);
      savedAny = true;
    }
    if (inputGeminiKey.trim()) {
      await setGeminiApiKey(inputGeminiKey.trim());
      setHasGeminiKey(true);
      savedAny = true;
    }

    if (savedAny) {
      setKeySavedMessage('API keys saved! Initializing live discovery...');
      setTimeout(async () => {
        setShowKeyModal(false);
        setKeySavedMessage('');

        // Trigger Gemini bank replenishment if needed
        if (inputGeminiKey.trim()) {
          replenishGeminiBank();
        }
        // Fetch Spoonacular cards
        if (inputSpoonacularKey.trim()) {
          const spoon = await fetchSpoonacularRecipes(10);
          setSpoonacularBuffer(spoon);
          const { newCards, remainingGemini, remainingSpoon } = buildNextCards(5, cards, geminiBank, spoon);
          setCards(newCards);
          setGeminiBank(remainingGemini);
          setSpoonacularBuffer(remainingSpoon);
        }
      }, 1000);
    }
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
      y: clientY - startPos.y,
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
      setDrag({ x: 0, y: 0 });
    }
  };

  const handleAction = async (action: 'like' | 'skip' | 'favourite') => {
    if (!currentCard) return;

    const isGemini = !!currentCard._isGeminiCandidate;
    const recipeId = currentCard.id;

    if (action === 'like') setFlyOut('right');
    else if (action === 'skip') setFlyOut('left');
    else if (action === 'favourite') setFlyOut('up');

    setTimeout(async () => {
      // 1. Handle Gemini vs Spoonacular storage
      if (isGemini) {
        if (action === 'skip') {
          // SWIPED NO: Permanently delete from Gemini bank
          await removeGeminiSpare(recipeId);
        } else {
          // SWIPED YES (like or favourite): Permanently add to saved recipes bank
          const { id: _, isFavourite: __, rating: ___, dateAdded: ____, timesUsed: _____, _isGeminiCandidate: ______, ...recipeData } = currentCard;
          const added = await addRecipe({
            ...recipeData,
            source: 'ai-generated',
          });

          if (action === 'favourite') {
            await toggleFavourite(added.id);
          }

          // Remove from spare bank now that it's in the permanent bank
          await removeGeminiSpare(recipeId);
        }

        // Check if Gemini bank has run out -> replenish 10 more!
        const remaining = await getGeminiBank();
        setGeminiBank(remaining);
        if (remaining.length === 0 && hasGeminiKey && !isGeneratingGeminiRef.current) {
          replenishGeminiBank();
        }
      } else {
        // Spoonacular recipe
        if (action === 'like' || action === 'favourite') {
          const { id: _, isFavourite: __, rating: ___, dateAdded: ____, timesUsed: _____, _isGeminiCandidate: ______, ...recipeData } = currentCard;
          const added = await addRecipe({
            ...recipeData,
            source: 'online',
          });
          if (action === 'favourite') {
            await toggleFavourite(added.id);
          }
        } else if (action === 'skip') {
          await rejectRecipe(recipeId);
        }
      }

      // Remove card from active deck
      setCards(prev => prev.slice(1));
      setFlyOut(null);
      setDrag({ x: 0, y: 0 });
    }, 300);
  };

  // Mouse & Touch bindings
  const onMouseDown = (e: ReactMouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: ReactMouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();

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
        <div
          className="absolute inset-0 bg-green-500/20 rounded-3xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'right' ? 1 : (flyOut ? 0 : likeOpacity) }}
        >
          <div className="border-4 border-green-500 text-green-500 text-6xl font-black p-4 rounded-2xl rotate-[-20deg]">LIKE</div>
        </div>
        <div
          className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'left' ? 1 : (flyOut ? 0 : skipOpacity) }}
        >
          <div className="border-4 border-red-500 text-red-500 text-6xl font-black p-4 rounded-2xl rotate-[20deg]">NOPE</div>
        </div>
        <div
          className="absolute inset-0 bg-yellow-500/30 rounded-3xl flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{ opacity: flyOut === 'up' ? 1 : (flyOut ? 0 : favOpacity) }}
        >
          <div className="border-4 border-yellow-500 text-yellow-500 text-6xl font-black p-4 rounded-2xl">SUPER</div>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/90 backdrop-blur-md overflow-hidden text-neutral-800">
      {/* Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-4 text-white shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Spoonacular Status (80%) */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer border ${
              hasSpoonacularKey 
                ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40' 
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border-neutral-700'
            }`}
            title="80% of Discovery cards come from Spoonacular"
          >
            <FiGlobe className="w-3.5 h-3.5" />
            <span>80% Web {hasSpoonacularKey ? '(Active)' : '(Need Key)'}</span>
          </button>

          {/* Gemini AI Bank Status (20%) */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer border ${
              hasGeminiKey 
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40' 
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border-neutral-700'
            }`}
            title="20% of Discovery cards come from your Gemini AI spare bank"
          >
            <FiCpu className="w-3.5 h-3.5" />
            <span>
              20% Gemini {hasGeminiKey ? `(${geminiBank.length}/10 ready)` : '(Need Key)'}
            </span>
          </button>

          {/* Activity indicators */}
          {isGeneratingGemini && (
            <span className="text-xs text-purple-300 flex items-center gap-1">
              <FiLoader className="animate-spin text-purple-400" /> Generating 10 Gemini recipes...
            </span>
          )}
          {isLoadingSpoonacular && !isGeneratingGemini && (
            <span className="text-xs text-sky-300 flex items-center gap-1">
              <FiLoader className="animate-spin text-sky-400" /> Fetching web recipes...
            </span>
          )}

          {/* Diet Filters */}
          <div className="flex items-center gap-3 ml-2 border-l border-white/20 pl-3">
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
              {!hasSpoonacularKey && !hasGeminiKey
                ? "Connect your free Spoonacular or Gemini API keys to discover live web and AI recipes."
                : isGeneratingGemini
                ? "Generating 10 fresh recipes with Gemini in the background..."
                : "Loading next batch of recipes..."}
            </p>
            {(!hasSpoonacularKey || !hasGeminiKey) && (
              <button
                onClick={() => setShowKeyModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg cursor-pointer"
              >
                Connect API Keys
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-[3/4] sm:max-w-md sm:aspect-[4/5]">
            {cards.slice(0, 3).reverse().map((card, idx) => {
              const realIndex = cards.slice(0, 3).length - 1 - idx;
              const isTop = realIndex === 0;
              const isGeminiCard = !!card._isGeminiCandidate;

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
                  {/* Image & Header */}
                  <div className="relative h-3/5 w-full bg-neutral-100 shrink-0">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center ${
                        isGeminiCard 
                          ? 'bg-gradient-to-br from-purple-100 via-indigo-50 to-pink-100' 
                          : 'bg-gradient-to-br from-orange-100 to-amber-100'
                      }`}>
                        <span className="text-6xl mb-2">{isGeminiCard ? '✨' : '🍲'}</span>
                        {isGeminiCard && (
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
                            Gemini AI Custom Creation
                          </span>
                        )}
                      </div>
                    )}

                    {/* Origin Badge */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-md flex items-center gap-1 ${
                        isGeminiCard 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-sky-500 text-white'
                      }`}>
                        {isGeminiCard ? <FiCpu /> : <FiGlobe />}
                        {isGeminiCard ? 'Gemini AI' : 'Spoonacular Web'}
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
            title="Swipe Left: Discard (permanently deleted if Gemini recipe)"
          >
            <FiX size={30} strokeWidth={3} />
          </button>

          <button
            onClick={() => handleAction('favourite')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-yellow-500 shadow-xl hover:scale-110 hover:bg-yellow-50 transition-all focus:outline-none cursor-pointer"
            title="Swipe Up: Superlike & Save to Recipes"
          >
            <FiStar size={22} strokeWidth={3} fill="currentColor" />
          </button>

          <button
            onClick={() => handleAction('like')}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-500 shadow-xl hover:scale-110 hover:bg-green-50 transition-all focus:outline-none cursor-pointer"
            title="Swipe Right: Like & Save to Recipes"
          >
            <FiHeart size={30} strokeWidth={3} fill="currentColor" />
          </button>
        </div>
      )}

      {/* API Key Connection Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 text-neutral-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-neutral-900">
                <FiKey className="text-orange-500" /> Connect API Keys
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer">
                <FiX size={20} />
              </button>
            </div>

            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              Discovery Swipe blends <strong>80% live online recipes</strong> from Spoonacular with <strong>20% unique, customized recipes</strong> generated by Google Gemini.
            </p>

            {/* Google Gemini Key */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                    <FiCpu /> Google Gemini API Key (20% Feed)
                  </h4>
                  <p className="text-xs text-purple-700">Generates 10-recipe spare banks tailored without duplicates.</p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
                >
                  Get Free Key <FiExternalLink />
                </a>
              </div>
              <div className="relative mt-2">
                <input
                  type={showGemKeyText ? 'text' : 'password'}
                  placeholder="Paste Gemini API key..."
                  value={inputGeminiKey}
                  onChange={e => setInputGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-purple-300 rounded-lg text-sm bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGemKeyText(!showGemKeyText)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showGemKeyText ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Spoonacular Key */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-sm text-sky-900 flex items-center gap-1.5">
                    <FiGlobe /> Spoonacular API Key (80% Feed)
                  </h4>
                  <p className="text-xs text-sky-700">Fetches live online recipes with photography and timers.</p>
                </div>
                <a
                  href="https://spoonacular.com/food-api/console#Dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline flex items-center gap-1"
                >
                  Get Free Key <FiExternalLink />
                </a>
              </div>
              <div className="relative mt-2">
                <input
                  type={showSpoonKeyText ? 'text' : 'password'}
                  placeholder="Paste Spoonacular API key..."
                  value={inputSpoonacularKey}
                  onChange={e => setInputSpoonacularKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-sky-300 rounded-lg text-sm bg-white text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSpoonKeyText(!showSpoonKeyText)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showSpoonKeyText ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {keySavedMessage && (
              <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium mb-4">
                <FiCheck /> {keySavedMessage}
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
                onClick={handleSaveKeys}
                disabled={!inputSpoonacularKey.trim() && !inputGeminiKey.trim()}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white text-sm font-semibold rounded-lg transition-colors shadow-md cursor-pointer"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
