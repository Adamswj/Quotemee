import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { UserStats, Category } from "@shared/schema";

// Helper function to get category icon
const getCategoryIcon = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'all':
      return <span className="text-white text-2xl">🌍</span>;
    case 'finance':
      return <span className="text-white text-2xl">💰</span>;
    case 'history':
      return <span className="text-white text-2xl">📜</span>;
    case 'love':
      return <span className="text-white text-2xl">❤️</span>;
    case 'science':
      return <span className="text-white text-2xl">🔬</span>;
    case 'philosophy':
      return <span className="text-white text-2xl">💭</span>;
    case 'religion':
      return <span className="text-white text-2xl">✨</span>;
    default:
      return <span className="text-white text-2xl">📖</span>;
  }
};

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const levelProgress = stats?.levelProgress || 0;
  const xpToNextLevel = stats?.xpToNextLevel || 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-secondary text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="max-w-md mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow-lg"
                  data-testid="img-profile-avatar"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shadow-lg" data-testid="img-default-avatar">
                  <i className="fas fa-user text-white text-xl"></i>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1" data-testid="text-welcome-message">
                  Welcome back, {user?.firstName || 'Learner'}!
                </h1>
                <div className="flex items-center space-x-4 text-sm text-white/90">
                  <div className="flex items-center space-x-1.5">
                    <i className="fas fa-fire text-accent text-base"></i>
                    <span className="font-medium" data-testid="text-streak-count">{stats?.streak || 0} day streak</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <i className="fas fa-star text-accent text-base"></i>
                    <span className="font-medium" data-testid="text-xp-count">{stats?.totalXP || 0} XP</span>
                  </div>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-semibold px-3 py-1.5" data-testid="text-user-level">
              Level {stats?.level || 1}
            </Badge>
          </div>

          {/* Level Progress and Title */}
          {stats?.title && (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-xl">🎯</span>
              <span className="text-lg font-semibold text-white/90">{stats.title}</span>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-white/90 font-medium">
              <span>Level {stats?.level || 1}</span>
              <span>{xpToNextLevel > 0 ? `${xpToNextLevel} XP to next level` : 'Max Level!'}</span>
            </div>
            <div className="progress-bar h-3 bg-white/20 rounded-full">
              <div 
                className="progress-fill h-full bg-gradient-to-r from-white/80 to-white/60 rounded-full shadow-sm"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="stats-card">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2" data-testid="text-quotes-learned">
                {statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats?.quotesLearned || 0}
              </div>
              <div className="text-subtle font-medium">Quotes Learned</div>
            </div>
          </div>
          <div className="stats-card">
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary mb-2" data-testid="text-quiz-accuracy">
                {statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : `${Math.round(stats?.quizAccuracy || 0)}%`}
              </div>
              <div className="text-subtle font-medium">Quiz Accuracy</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Explore Categories</h2>
          
          {categoriesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl w-full" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* All Category - Big Button */}
              <div 
                className="category-card w-full text-center"
                onClick={() => setLocation('/explore')}
                data-testid="button-category-all"
              >
                <div className="category-icon-wrapper bg-gradient-to-br from-blue-500 to-purple-600 mx-auto">
                  {getCategoryIcon('all')}
                </div>
                <h3 className="text-heading text-lg mb-1">All</h3>
                <p className="text-subtle">Explore all quotes</p>
              </div>
              
              {/* Other Categories - Grid */}
              <div className="grid grid-cols-2 gap-4">
                {categories?.filter((category) => category.name.toLowerCase() !== 'all').map((category) => (
                  <div 
                    key={category.id} 
                    className="category-card"
                    onClick={() => setLocation(`/explore?category=${category.id}`)}
                    data-testid={`button-category-${category.name.toLowerCase()}`}
                  >
                    <div className={`category-icon-wrapper bg-gradient-to-br ${category.color}`}>
                      {getCategoryIcon(category.name)}
                    </div>
                    <h3 className="text-heading text-lg mb-1">{category.name}</h3>
                    <p className="text-subtle">Explore quotes</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue Learning */}
        <div className="space-y-6">
          <h2 className="text-heading text-2xl">Continue Learning</h2>
          
          <div className="learning-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-play text-primary text-xl"></i>
                </div>
                <div>
                  <h3 className="text-heading text-lg mb-1">Practice Session</h3>
                  <p className="text-subtle">Continue your learning journey</p>
                </div>
              </div>
              <button 
                className="btn-primary"
                onClick={() => setLocation('/learn')}
                data-testid="button-start-practice"
              >
                Start
              </button>
            </div>
          </div>

          <div className="learning-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-heart text-secondary text-xl"></i>
                </div>
                <div>
                  <h3 className="text-heading text-lg mb-1">My Favorites</h3>
                  <p className="text-subtle">
                    {statsLoading ? "Loading..." : `${stats?.favoritesCount || 0} saved quotes`}
                  </p>
                </div>
              </div>
              <button 
                className="btn-outline"
                onClick={() => setLocation('/favorites')}
                data-testid="button-view-favorites"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
