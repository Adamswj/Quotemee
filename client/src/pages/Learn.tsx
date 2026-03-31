import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import QuoteCard from "@/components/QuoteCard";
import ProgressBar from "@/components/ProgressBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Brain, Clock, Target } from "lucide-react";

export default function Learn() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/progress"],
    enabled: isAuthenticated,
  });

  // Fetch spaced repetition study stats
  const { data: studyStats, isLoading: studyStatsLoading } = useQuery({
    queryKey: ["/api/study/stats"],
    enabled: isAuthenticated,
  });

  // Redirect to login if not authenticated
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

  const dailyGoal = 10;
  // Each quote practiced gives 10 XP, so divide dailyXp by 10 to get quotes count
  const completedToday = Math.min(Math.floor((stats?.dailyXp || 0) / 10), dailyGoal);
  const goalProgress = (completedToday / dailyGoal) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            My Learning
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Practice your favorite quotes and track progress
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6 bg-gradient-to-r from-primary to-secondary text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Today's Goal</h3>
                <p className="text-primary-foreground/80">Practice {dailyGoal} quotes</p>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="4" 
                    fill="none"
                  />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    stroke="white" 
                    strokeWidth="4" 
                    fill="none" 
                    strokeDasharray="175" 
                    strokeDashoffset={175 - (175 * goalProgress / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                  {completedToday}/{dailyGoal}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <i className="fas fa-fire text-accent"></i>
                <span className="text-sm">{stats?.streak || 0} day streak</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-star text-accent"></i>
                <span className="text-sm">+{stats?.dailyXp || 0} XP today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spaced Repetition Study */}
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8" />
                <div>
                  <h3 className="text-lg font-semibold">Advanced Study Mode</h3>
                  <p className="text-blue-100 text-sm">Spaced repetition algorithm for optimal learning</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setLocation('/study')}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Start Study
              </Button>
            </div>
            
            {studyStatsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-white/20" />
                ))}
              </div>
            ) : studyStats ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{studyStats.dueToday || 0}</div>
                  <div className="text-xs text-blue-100">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{studyStats.learning || 0}</div>
                  <div className="text-xs text-blue-100">Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{studyStats.mastered || 0}</div>
                  <div className="text-xs text-blue-100">Mastered</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-blue-100 text-sm">
                Start studying your favorite quotes with spaced repetition
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary mb-1">
                {statsLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : stats?.quotesLearned || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Mastered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-secondary mb-1">
                {statsLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : `${Math.round(stats?.quizAccuracy || 0)}%`}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-accent mb-1">
                {favoritesLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : favorites?.length || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Favorites</div>
            </CardContent>
          </Card>
        </div>

        {/* Favorite Quotes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Favorite Quotes ({favorites?.length || 0})
            </h2>
          </div>

          {favoritesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : favorites && favorites.length > 0 ? (
            <div className="space-y-4">
              {[...favorites]
                .sort((a: any, b: any) => {
                  const aProgress = progress?.find((p: any) => p.quoteId === a.quote.id);
                  const bProgress = progress?.find((p: any) => p.quoteId === b.quote.id);
                  const aMastery = aProgress?.masteryLevel || 0;
                  const bMastery = bProgress?.masteryLevel || 0;
                  return bMastery - aMastery; // Highest mastery first
                })
                .map((favorite: any) => {
                const quoteProgress = progress?.find((p: any) => p.quoteId === favorite.quote.id);
                const masteryLevel = quoteProgress?.masteryLevel || 0;
                const accuracy = quoteProgress?.totalAnswers > 0 
                  ? (quoteProgress.correctAnswers / quoteProgress.totalAnswers) * 100 
                  : 0;

                return (
                  <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${favorite.category.color}`}></div>
                          <span className="text-xs text-gray-500">{favorite.category.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {masteryLevel >= 5 ? (
                            <>
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <i className="fas fa-check text-white text-xs"></i>
                              </div>
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                Mastered
                              </Badge>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-bold text-accent">{masteryLevel}/5</span>
                              </div>
                              <Badge variant="secondary" className="text-xs bg-accent/10 text-accent">
                                Learning
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <blockquote className="text-gray-800 dark:text-white font-medium mb-2 line-clamp-2">
                        "{favorite.quote.text}"
                      </blockquote>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        — {favorite.quote.author}
                      </p>
                      
                      <div className="text-xs text-gray-500">
                        {quoteProgress ? (
                          `${Math.round(accuracy)}% accuracy • ${quoteProgress.timesStudied} practices`
                        ) : (
                          'Not practiced yet'
                        )}
                      </div>
                      
                      {/* Progress bar for mastery */}
                      <div className="mt-3">
                        <ProgressBar 
                          progress={(masteryLevel / 5) * 100} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <i className="fas fa-heart text-4xl text-gray-300 mb-4"></i>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  No favorite quotes yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start exploring quotes and save your favorites to practice them here
                </p>
                <Button>Explore Quotes</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
