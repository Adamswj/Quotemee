import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Target } from "lucide-react";
import type { UserStats, UserAchievement } from "@shared/schema";
import { TITLE_TIERS } from "@shared/levelingUtils";

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<UserAchievement[]>({
    queryKey: ["/api/user/achievements"],
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

  const levelProgress = stats?.levelProgress || 0;
  const xpToNextLevel = stats?.xpToNextLevel || 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
            )}
            <Badge 
              className="absolute -bottom-1 -right-1 bg-accent text-white border-2 border-white"
            >
              {stats?.level || 1}
            </Badge>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'QuoteLearn User'}
          </h1>
          {stats?.title && (
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="text-lg font-semibold text-primary">{stats.title}</span>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            Learning since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
          </p>
        </div>

        {/* Level Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Level Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {xpToNextLevel > 0 ? `${xpToNextLevel} XP until Level ${(stats?.level || 1) + 1}` : 'Max Level Reached!'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{stats?.totalXP || 0} XP</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Experience</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Level {stats?.level || 1}</span>
                <span>{(stats?.level || 1) >= 100 ? 'Max Level' : `Level ${(stats?.level || 1) + 1}`}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Daily Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats?.dailyGoalCompleted ? '🎉 Daily goal completed!' : 'Study 10 quotes to complete daily goal'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-accent flex items-center space-x-1">
                    <span>🔥</span>
                    <span>{stats?.streak || 0}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Day Streak</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-accent">{stats?.dailyXp || 0} XP</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Today's XP</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Progress</span>
                <span>{Math.min(Math.floor((stats?.dailyXp || 0) / 10), 10)} / 10 quotes</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                    stats?.dailyGoalCompleted 
                      ? 'bg-gradient-to-r from-green-400 to-green-600' 
                      : 'bg-gradient-to-r from-accent to-accent/80'
                  }`}
                  style={{ width: `${Math.min((Math.floor((stats?.dailyXp || 0) / 10) / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.quotesLearned || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Quotes Learned</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1 flex items-center justify-center space-x-1">
                <span>🔥</span>
                <span>{statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.streak || 0}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-secondary mb-1">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.favoritesCount || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Favorites</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : `${Math.round(stats?.quizAccuracy || 0)}%`}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Quiz Accuracy</div>
            </CardContent>
          </Card>
        </div>

        {/* Levels & Ranks */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Levels & Ranks
          </h2>
          
          <div className="space-y-3">
            {TITLE_TIERS.map((tier) => {
              const userLevel = stats?.level || 1;
              const isCurrentTier = userLevel >= tier.levelRange[0] && userLevel <= tier.levelRange[1];
              const isCompleted = userLevel > tier.levelRange[1];
              
              return (
                <Card 
                  key={tier.levelRange[0]} 
                  className={isCurrentTier ? 'ring-2 ring-primary border-primary' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        isCurrentTier 
                          ? 'bg-primary text-white' 
                          : isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {tier.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-medium ${isCurrentTier ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>
                            Levels {tier.levelRange[0]}-{tier.levelRange[1]}
                          </h4>
                          {isCurrentTier && (
                            <Target className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className={`text-sm ${isCurrentTier ? 'text-primary/80' : 'text-gray-600 dark:text-gray-400'}`}>
                          {tier.titles.join(' → ')}
                        </p>
                      </div>
                      {isCurrentTier && (
                        <Badge className="bg-primary text-white">
                          Current
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          ✓ Complete
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Settings</h2>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {theme === 'dark' ? (
                    <Moon className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="text-gray-600 dark:text-gray-400" />
                  )}
                  <span className="text-gray-800 dark:text-white">Dark Mode</span>
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    theme === 'dark' ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-bell text-gray-600 dark:text-gray-400"></i>
                  <span className="text-gray-800 dark:text-white">Notifications</span>
                </div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-question-circle text-gray-600 dark:text-gray-400"></i>
                  <span className="text-gray-800 dark:text-white">Help & Support</span>
                </div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
            </CardContent>
          </Card>

          <Button 
            variant="destructive"
            className="w-full mt-6"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
