import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Flashcards() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favoriteQuotes, setFavoriteQuotes] = useState<Set<number>>(new Set());

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ["/api/quotes", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/quotes?categoryId=${selectedCategory}`
        : "/api/quotes";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch quotes");
      return response.json();
    },
  });

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
        description: "Failed to add to favorites",
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
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteToggle = (quoteId: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    if (favoriteQuotes.has(quoteId)) {
      removeFavoriteMutation.mutate(quoteId);
    } else {
      addFavoriteMutation.mutate(quoteId);
    }
  };

  const handleNext = () => {
    if (quotes && currentIndex < quotes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setCurrentIndex(0);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, quotes]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (quotesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuote = quotes?.[currentIndex];
  const selectedCategoryData = categories && Array.isArray(categories) 
    ? categories.find((cat: any) => cat.id === selectedCategory)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              {selectedCategoryData ? `${selectedCategoryData.name} Quotes` : 'All Quotes'}
            </h1>
            <div className="text-sm text-gray-500">
              {quotes ? `${currentIndex + 1} of ${quotes.length}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-md mx-auto p-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => handleCategorySelect(null)}
            className="whitespace-nowrap"
          >
            All
          </Button>
          {categories && Array.isArray(categories) && categories.map((category: any) => (
            <Button
              key={category.id}
              size="sm"
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => handleCategorySelect(category.id)}
              className="whitespace-nowrap"
            >
              <i className={`${category.icon} mr-1`}></i>
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Flashcard */}
      <div className="max-w-md mx-auto p-4 flex-1 flex items-center justify-center">
        {currentQuote ? (
          <div className="w-full">
            <Card className="relative min-h-[400px] shadow-xl border-0 bg-white dark:bg-gray-800">
              {/* Favorite Star Button */}
              <button
                onClick={() => handleFavoriteToggle(currentQuote.id)}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                  favoriteQuotes.has(currentQuote.id)
                    ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600 transform hover:scale-110'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-yellow-500'
                }`}
              >
                <i className={`${favoriteQuotes.has(currentQuote.id) ? 'fas' : 'far'} fa-star text-sm`}></i>
              </button>

              <CardContent className="p-8 h-full flex flex-col justify-center text-center">
                {/* Category Badge */}
                {selectedCategoryData && (
                  <Badge 
                    variant="secondary" 
                    className={`mb-6 self-center bg-gradient-to-r ${selectedCategoryData.color} text-white`}
                  >
                    <i className={`${selectedCategoryData.icon} mr-1`}></i>
                    {selectedCategoryData.name}
                  </Badge>
                )}

                {/* Quote Icon */}
                <div className="mb-6">
                  <i className="fas fa-quote-left text-4xl text-primary/20"></i>
                </div>

                {/* Quote Text */}
                <blockquote className="text-xl leading-relaxed text-gray-800 dark:text-white font-medium mb-6">
                  "{currentQuote.text}"
                </blockquote>

                {/* Author */}
                <cite className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                  — {currentQuote.author}
                </cite>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="w-10 h-10 p-0 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </Button>

              {/* Progress Dots */}
              <div className="flex space-x-1">
                {quotes?.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_: any, index: number) => {
                  const actualIndex = Math.max(0, currentIndex - 2) + index;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => setCurrentIndex(actualIndex)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        actualIndex === currentIndex 
                          ? 'bg-primary w-6' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  );
                })}
              </div>

              <Button
                variant="ghost"
                onClick={handleNext}
                disabled={!quotes || currentIndex === quotes.length - 1}
                className="w-10 h-10 p-0 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <i className="fas fa-chevron-right text-lg"></i>
              </Button>
            </div>

            {/* Swipe Hint */}
            <div className="text-center mt-4 text-sm text-gray-500">
              <i className="fas fa-hand-pointer mr-1"></i>
              Swipe or use arrow keys to navigate
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <i className="fas fa-search text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">No quotes found in this category</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}