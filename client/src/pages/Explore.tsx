import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useLocation } from "wouter";
import type { Category } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Helper function to get category icon
const getCategoryIcon = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'all':
      return <span className="text-sm mr-1">🌍</span>;
    case 'finance':
      return <span className="text-sm mr-1">💰</span>;
    case 'history':
      return <span className="text-sm mr-1">📜</span>;
    case 'love':
      return <span className="text-sm mr-1">❤️</span>;
    case 'science':
      return <span className="text-sm mr-1">🔬</span>;
    case 'philosophy':
      return <span className="text-sm mr-1">💭</span>;
    case 'religion':
      return <span className="text-sm mr-1">✨</span>;
    default:
      return <span className="text-sm mr-1">📖</span>;
  }
};

export default function Explore() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favoriteQuotes, setFavoriteQuotes] = useState<Set<number>>(new Set());
  
  // Swipe gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 80;

  // Parse URL parameters from actual window location on mount and location changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const newCategory = categoryParam ? parseInt(categoryParam) : null;
    setSelectedCategory(newCategory);
  }, [location]);

  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["/api/quotes", selectedCategory], // Always include category in queryKey
    queryFn: async ({ queryKey }) => {
      // Extract selectedCategory from queryKey to avoid stale closure
      const [, categoryId] = queryKey;
      const url = categoryId ? `/api/quotes?categoryId=${categoryId}` : '/api/quotes';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch quotes');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Reset to first quote when quotes data changes (new category loaded)
  useEffect(() => {
    setCurrentIndex(0);
  }, [quotes?.length, selectedCategory]);

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
  });

  // Fetch user favorites
  const { data: userFavorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Update favorite quotes set when user favorites data loads
  useEffect(() => {
    if (userFavorites && Array.isArray(userFavorites)) {
      const favoriteIds = new Set(userFavorites.map((fav: any) => fav.quoteId as number));
      setFavoriteQuotes(favoriteIds);
    }
  }, [userFavorites]);

  const addFavoriteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest("POST", "/api/favorites", { quoteId });
    },
    onSuccess: (_, quoteId) => {
      setFavoriteQuotes(prev => new Set(Array.from(prev).concat([quoteId])));
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({
        title: "Added to favorites! ⭐",
        description: "Quote saved to your learning collection",
        duration: 2000,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add quote to favorites",
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest("DELETE", `/api/favorites/${quoteId}`);
    },
    onSuccess: (_, quoteId) => {
      setFavoriteQuotes(prev => {
        const newArray = Array.from(prev).filter(id => id !== quoteId);
        return new Set(newArray);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({
        title: "Removed from favorites",
        description: "Quote removed from your collection",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove quote from favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = (quoteId: number) => {
    if (favoriteQuotes.has(quoteId)) {
      removeFavoriteMutation.mutate(quoteId);
    } else {
      addFavoriteMutation.mutate(quoteId);
    }
  };

  const [, setLocation] = useLocation();

  const handleCategorySelect = (categoryId: number | null) => {
    // Update state immediately for instant UI update
    setSelectedCategory(categoryId);
    
    // Also update the URL for deep linking and browser history
    if (categoryId === null) {
      setLocation('/explore');
    } else {
      setLocation(`/explore?category=${categoryId}`);
    }
  };

  const handleNext = useCallback(() => {
    if (quotes && currentIndex < quotes.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setSwipeOffset(-300);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    }
  }, [quotes, currentIndex, isAnimating]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setSwipeOffset(300);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentIndex, isAnimating]);

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || isAnimating) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;
    
    // Only track horizontal swipes (if more horizontal than vertical)
    if (Math.abs(diffX) > Math.abs(diffY)) {
      e.preventDefault();
      // Limit the swipe offset for visual feedback
      const maxOffset = 150;
      setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diffX)));
    }
  }, [isAnimating]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || isAnimating) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    
    if (swipeOffset < -SWIPE_THRESHOLD && quotes && currentIndex < quotes.length - 1) {
      // Swiped left - go to next
      handleNext();
    } else if (swipeOffset > SWIPE_THRESHOLD && currentIndex > 0) {
      // Swiped right - go to previous
      handlePrevious();
    } else {
      // Reset position
      setSwipeOffset(0);
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [swipeOffset, quotes, currentIndex, isAnimating, handleNext, handlePrevious]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious]);

  if (quotesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quotes...</p>
        </div>
      </div>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-quote-left text-6xl text-gray-300 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No quotes found</h2>
          <p className="text-gray-600 dark:text-gray-400">Try selecting a different category.</p>
        </div>
        <Navigation />
      </div>
    );
  }

  const currentQuote = quotes?.[currentIndex];
  const selectedCategoryData = categories && Array.isArray(categories) 
    ? categories.find((cat) => cat.id === selectedCategory)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5">
      {/* Header */}
      <div className="text-center pt-6 md:pt-8 pb-2 md:pb-4 px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
          Explore Quotes
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {quotes?.length} {selectedCategoryData ? `${selectedCategoryData.name} ` : ''}quotes to discover
        </p>
      </div>

      {/* Category Filter */}
      <div className="max-w-md mx-auto px-2 md:px-4 pb-2">
        <div className="flex space-x-1.5 md:space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => handleCategorySelect(null)}
            className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 h-8"
            data-testid="button-filter-all"
          >
            {getCategoryIcon('all')}
            All
          </Button>
          {categories && Array.isArray(categories) && categories.map((category) => (
            <Button
              key={category.id}
              size="sm"
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => handleCategorySelect(category.id)}
              className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3 h-8"
              data-testid={`button-filter-${category.name.toLowerCase()}`}
            >
              {getCategoryIcon(category.name)}
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Flashcard */}
      <div className="max-w-md mx-auto p-4 flex-1 flex items-center justify-center">
        {currentQuote ? (
          <div className="w-full">
            <Card 
              ref={cardRef}
              className="relative min-h-[350px] md:min-h-[400px] shadow-xl border-0 bg-white dark:bg-gray-800 touch-pan-y select-none"
              style={{
                transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.02}deg)`,
                transition: isAnimating ? 'transform 0.2s ease-out' : 'transform 0.1s ease-out',
                opacity: 1 - Math.abs(swipeOffset) * 0.002,
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Favorite Star Button */}
              <button
                onClick={() => handleFavoriteToggle(currentQuote.id)}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                className="absolute top-4 right-4 transition-all duration-300 z-10 hover:scale-110"
                data-testid={`button-favorite-${currentQuote.id}`}
              >
                <div 
                  className={`w-6 h-6 transform rotate-45 transition-all ${
                    favoriteQuotes.has(currentQuote.id) ? 'bg-red-500' : 'bg-gray-400 hover:bg-red-400'
                  }`}
                  style={{
                    position: 'relative'
                  }}
                >
                  <div 
                    className={`absolute w-6 h-6 rounded-full transition-all ${
                      favoriteQuotes.has(currentQuote.id) ? 'bg-red-500' : 'bg-gray-400 hover:bg-red-400'
                    }`}
                    style={{
                      top: '-50%',
                      left: '0'
                    }}
                  />
                  <div 
                    className={`absolute w-6 h-6 rounded-full transition-all ${
                      favoriteQuotes.has(currentQuote.id) ? 'bg-red-500' : 'bg-gray-400 hover:bg-red-400'
                    }`}
                    style={{
                      top: '0',
                      left: '-50%'
                    }}
                  />
                </div>
              </button>

              <CardContent className="p-5 md:p-8 h-full flex flex-col justify-center text-center">
                {/* Category Badge */}
                {(() => {
                  const quoteCategoryData = categories && Array.isArray(categories) 
                    ? categories.find((cat) => cat.id === currentQuote.categoryId)
                    : null;
                  return quoteCategoryData ? (
                    <Badge 
                      variant="secondary" 
                      className={`mb-6 self-center bg-gradient-to-r ${quoteCategoryData.color} text-white`}
                    >
                      {getCategoryIcon(quoteCategoryData.name)}
                      {quoteCategoryData.name}
                    </Badge>
                  ) : null;
                })()}

                {/* Quote Icon */}
                <div className="mb-4 md:mb-6">
                  <i className="fas fa-quote-left text-3xl md:text-4xl text-primary/20"></i>
                </div>

                {/* Quote Text */}
                <blockquote className="text-base md:text-xl leading-relaxed text-gray-800 dark:text-white font-medium mb-4 md:mb-6" data-testid={`text-quote-${currentQuote.id}`}>
                  "{currentQuote.text}"
                </blockquote>

                {/* Author */}
                <cite className="text-sm md:text-lg text-gray-600 dark:text-gray-400 font-medium" data-testid={`text-author-${currentQuote.id}`}>
                  — {currentQuote.author}
                </cite>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 md:mt-6">
              {/* Left Arrow */}
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`p-3 rounded-full transition-all active:scale-95 ${
                  currentIndex === 0 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200'
                }`}
                data-testid="button-previous-quote"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              {/* Progress Dots */}
              <div className="flex space-x-1.5">
                {quotes && Array.isArray(quotes) && quotes.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_: any, index: number) => {
                  const actualIndex = Math.max(0, currentIndex - 2) + index;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => setCurrentIndex(actualIndex)}
                      className={`h-2 rounded-full transition-all ${
                        actualIndex === currentIndex 
                          ? 'bg-primary w-8' 
                          : 'bg-gray-300 dark:bg-gray-600 w-2'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                disabled={!quotes || currentIndex === (quotes as any[])?.length - 1}
                className={`p-3 rounded-full transition-all active:scale-95 ${
                  !quotes || currentIndex === (quotes as any[])?.length - 1
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200'
                }`}
                data-testid="button-next-quote"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Swipe Hint - only show on mobile */}
            <div className="text-center mt-3 text-xs text-gray-500 md:hidden">
              👆 Swipe left or right to navigate
            </div>
            {/* Desktop hint */}
            <div className="text-center mt-3 text-xs text-gray-500 hidden md:block">
              ← → Use arrow keys to navigate
            </div>

            {/* Progress Counter */}
            <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-400" data-testid="text-progress-counter">
              {currentIndex + 1} of {quotes?.length}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <i className="fas fa-quote-left text-6xl text-gray-300 mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No quote selected</h2>
            <p className="text-gray-600 dark:text-gray-400">Navigate through quotes using the buttons.</p>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}