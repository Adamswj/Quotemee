import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/Navigation";
import { Brain, CheckCircle, XCircle, Clock, ArrowLeft, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface StudyCard {
  id: number;
  userId: string;
  quoteId: number;
  quote?: {
    id: number;
    text: string;
    author: string;
    categoryId: number;
  };
  masteryLevel: number;
  timesStudied: number;
  correctAnswers: number;
  totalAnswers: number;
  easeFactor: number;
  interval: number;
  nextReview: string;
  repetitions: number;
  stage: 'learning' | 'review' | 'mastered';
}

export default function Study() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    timeStarted: Date.now()
  });

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

  // Fetch study session
  const { data: studyCards = [], isLoading: cardsLoading, refetch: refetchCards } = useQuery({
    queryKey: ["/api/study/session"],
    enabled: isAuthenticated,
  });

  // Fetch study stats
  const { data: studyStats } = useQuery({
    queryKey: ["/api/study/stats"],
    enabled: isAuthenticated,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ quoteId, quality, responseTime }: { 
      quoteId: number; 
      quality: number; 
      responseTime?: number; 
    }) => {
      await apiRequest("POST", "/api/study/review", { quoteId, quality, responseTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
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
        description: "Failed to record review",
        variant: "destructive",
      });
    },
  });

  const handleQualityRating = async (quality: number) => {
    const currentCard = studyCards[currentCardIndex];
    if (!currentCard || !sessionStarted) return;

    const responseTime = Date.now() - sessionStats.timeStarted;
    
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      total: prev.total + 1
    }));

    // Submit review
    await reviewMutation.mutateAsync({
      quoteId: currentCard.quoteId,
      quality,
      responseTime
    });

    // Move to next card or complete session
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      setSessionComplete(true);
    }
  };

  const startNewSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionStarted(true);
    setSessionComplete(false);
    setSessionStats({
      correct: 0,
      total: 0,
      timeStarted: Date.now()
    });
    refetchCards();
  };

  const currentCard = studyCards[currentCardIndex];
  const progressPercentage = studyCards.length > 0 ? ((currentCardIndex + 1) / studyCards.length) * 100 : 0;

  if (cardsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading study session...</p>
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
            onClick={() => setLocation('/learn')}
            className="absolute left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Brain className="w-8 h-8 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Spaced Repetition Study
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Study Stats Summary */}
        {studyStats && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Study Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{studyStats.dueToday}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-secondary">{studyStats.learning}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-accent">{studyStats.review}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Review</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{studyStats.mastered}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Mastered</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Content */}
        {!sessionStarted && !sessionComplete ? (
          // Start Session
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Ready to Study?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {studyCards.length > 0 
                  ? `${studyCards.length} cards ready for review using advanced spaced repetition`
                  : "No cards due for review. Great job staying on top of your studies!"
                }
              </p>
              {studyCards.length > 0 && (
                <Button onClick={startNewSession} className="w-full">
                  Start Study Session
                </Button>
              )}
            </CardContent>
          </Card>
        ) : sessionComplete ? (
          // Session Complete
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                Session Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You reviewed {sessionStats.total} cards with {Math.round((sessionStats.correct / sessionStats.total) * 100)}% accuracy
              </p>
              <div className="space-y-2 mb-6">
                <Button onClick={startNewSession} className="w-full">
                  Start Another Session
                </Button>
                <Button variant="outline" onClick={() => setLocation('/learn')} className="w-full">
                  Return to Learning
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Active Session
          <>
            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Card {currentCardIndex + 1} of {studyCards.length}</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Study Card */}
            {currentCard && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  {/* Card Info */}
                  <div className="flex items-center justify-center mb-4">
                    <Badge 
                      variant={currentCard.stage === 'learning' ? 'default' : 
                               currentCard.stage === 'review' ? 'secondary' : 'outline'}
                    >
                      {currentCard.stage}
                    </Badge>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-lg text-gray-800 dark:text-white font-medium mb-4 text-center">
                    "{currentCard.quote?.text}"
                  </blockquote>

                  {showAnswer ? (
                    <>
                      <div className="flex flex-col items-center gap-1 mb-6">
                        <p className="text-center text-gray-600 dark:text-gray-400">
                          — {currentCard.quote?.author}
                        </p>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(currentCard.quote?.author || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                          data-testid="link-author-search"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Learn more about this author</span>
                        </a>
                      </div>

                      {/* Quality Rating */}
                      <div className="space-y-3">
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                          How well did you remember this quote?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleQualityRating(1)}
                            className="border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                            disabled={reviewMutation.isPending}
                            data-testid="button-novice"
                          >
                            <XCircle className="w-4 h-4 mr-1 text-red-500" />
                            Novice (forgot)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleQualityRating(3)}
                            className="border-yellow-200 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950"
                            disabled={reviewMutation.isPending}
                            data-testid="button-apprentice"
                          >
                            <Clock className="w-4 h-4 mr-1 text-yellow-500" />
                            Apprentice (almost)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleQualityRating(4)}
                            className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                            disabled={reviewMutation.isPending}
                            data-testid="button-adept"
                          >
                            <CheckCircle className="w-4 h-4 mr-1 text-blue-500" />
                            Adept (got it)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleQualityRating(5)}
                            className="border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                            disabled={reviewMutation.isPending}
                            data-testid="button-master"
                          >
                            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                            Master (nailed it)
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Button onClick={() => setShowAnswer(true)} className="w-full">
                        Show Answer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Navigation />
    </div>
  );
}