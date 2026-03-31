import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Heart, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Favorites() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
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
  }, [isAuthenticated, toast]);

  // Fetch user favorites
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      await apiRequest("DELETE", `/api/favorites/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({
        title: "Success",
        description: "Quote removed from favorites",
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
        description: "Failed to remove favorite",
        variant: "destructive",
      });
    },
  });

  // Group favorites by category
  const favoritesByCategory = favorites.reduce((acc: any, favorite: any) => {
    const categoryId = favorite.quote.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(favorite);
    return acc;
  }, {});

  // Filter favorites by selected category
  const filteredFavorites = selectedCategory 
    ? favoritesByCategory[selectedCategory] || []
    : favorites;

  if (favoritesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <div className="flex items-center justify-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="absolute left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Heart className="w-8 h-8 text-secondary mr-2 fill-current" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Favorites
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {favorites.length} saved quotes
        </p>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Category Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-6">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className="whitespace-nowrap"
          >
            All ({favorites.length})
          </Button>
          {categories.map((category: any) => {
            const categoryFavorites = favoritesByCategory[category.id] || [];
            if (categoryFavorites.length === 0) return null;
            
            return (
              <Button
                key={category.id}
                size="sm"
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                <i className={`${category.icon} mr-1`}></i>
                {category.name} ({categoryFavorites.length})
              </Button>
            );
          })}
        </div>

        {/* Favorites List */}
        {filteredFavorites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                {selectedCategory ? 'No favorites in this category' : 'No favorite quotes yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedCategory 
                  ? 'Try exploring other categories to find quotes you love'
                  : 'Start exploring quotes and save your favorites to see them here'
                }
              </p>
              <Button onClick={() => setLocation('/explore')}>
                Explore Quotes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFavorites.map((favorite: any) => {
              const category = categories.find((cat: any) => cat.id === favorite.quote.categoryId);
              
              return (
                <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${category?.color || 'from-gray-400 to-gray-500'}`}></div>
                        <span className="text-xs text-gray-500">{category?.name || 'Unknown'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFavoriteMutation.mutate(favorite.quote.id)}
                        disabled={removeFavoriteMutation.isPending}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                    
                    <blockquote className="text-gray-800 dark:text-white font-medium mb-2">
                      "{favorite.quote.text}"
                    </blockquote>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      — {favorite.quote.author}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}