import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Quote {
  id: number;
  text: string;
  author: string;
  category?: {
    name: string;
    color: string;
  };
}

interface QuoteCardProps {
  quote: Quote;
  featured?: boolean;
  isFavorite?: boolean;
}

export default function QuoteCard({ quote, featured = false, isFavorite = false }: QuoteCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [favorited, setFavorited] = useState(isFavorite);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/favorites", { quoteId: quote.id });
    },
    onSuccess: () => {
      setFavorited(true);
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
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${quote.id}`);
    },
    onSuccess: () => {
      setFavorited(false);
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

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    if (favorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Inspiring Quote',
        text: `"${quote.text}" — ${quote.author}`,
      });
    } else {
      navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`);
      toast({
        title: "Copied to clipboard",
        description: "Quote copied to your clipboard",
      });
    }
  };

  return (
    <div className="relative perspective-1000">
      <div 
        className={`relative w-full transition-transform duration-600 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Front of card */}
        <Card className={`${featured ? 'border-2 border-primary/30 shadow-lg' : 'shadow-sm'} 
          hover:shadow-md transition-all duration-300 backface-hidden`}>
          <CardContent className="p-6">
            {featured && (
              <div className="flex justify-between items-center mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Featured
                </Badge>
                {quote.category && (
                  <Badge variant="outline" className="text-xs">
                    {quote.category.name}
                  </Badge>
                )}
              </div>
            )}

            <div className="text-center">
              <i className="fas fa-quote-left text-primary text-2xl mb-4 opacity-30"></i>
              <blockquote className="text-lg leading-relaxed text-gray-800 dark:text-white font-medium mb-4">
                "{quote.text}"
              </blockquote>
              <cite className="text-gray-600 dark:text-gray-400">— {quote.author}</cite>
              
              <div className="mt-4 text-sm text-gray-500">
                Tap to see more details
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card className={`absolute inset-0 ${featured ? 'border-2 border-primary/30 shadow-lg' : 'shadow-sm'} 
          bg-gradient-to-br from-primary to-secondary text-white backface-hidden rotate-y-180`}>
          <CardContent className="p-6 h-full flex flex-col justify-center">
            <div className="text-center">
              <i className="fas fa-user-graduate text-3xl mb-4 opacity-80"></i>
              <h3 className="text-xl font-bold mb-2">{quote.author}</h3>
              {quote.category && (
                <p className="text-primary-foreground/80 mb-4">
                  Category: {quote.category.name}
                </p>
              )}
              <div className="text-sm text-primary-foreground/70">
                Tap again to see the quote
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center space-x-3 mt-4">
        <Button
          size="sm"
          variant={favorited ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
          disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
          className={`rounded-full px-4 transition-all duration-300 ${
            favorited 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'hover:bg-red-50 hover:border-red-300 hover:text-red-500'
          }`}
        >
          <i className={`${favorited ? 'fas' : 'far'} fa-heart mr-2`}></i>
          {favorited ? 'Favorited' : 'Favorite'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="rounded-full px-4 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <i className="fas fa-share mr-2"></i>
          Share
        </Button>
      </div>
    </div>
  );
}
