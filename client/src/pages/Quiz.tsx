import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  quote: any;
  correctAnswer: string;
  options: string[];
  type: 'fill-blank' | 'author' | 'complete';
}

export default function Quiz() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      await apiRequest("POST", "/api/quiz/session", sessionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
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
        description: "Failed to submit quiz results",
        variant: "destructive",
      });
    },
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

  const generateQuestions = (favoriteQuotes: any[]): QuizQuestion[] => {
    if (!favoriteQuotes || favoriteQuotes.length === 0) return [];

    const shuffled = [...favoriteQuotes].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));

    return selected.map(favorite => {
      const quote = favorite.quote;
      const questionType = Math.random();
      
      if (questionType < 0.6) {
        // Fill in the blank question
        const words = quote.text.split(' ');
        if (words.length < 4) return null;
        
        const blankIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
        const correctAnswer = words[blankIndex].replace(/[.,!?;]$/, '');
        const questionText = [
          ...words.slice(0, blankIndex),
          '_____',
          ...words.slice(blankIndex + 1)
        ].join(' ');

        // Generate wrong options
        const allWords = favoriteQuotes.flatMap(f => f.quote.text.split(' '))
          .map(w => w.replace(/[.,!?;]$/, ''))
          .filter(w => w.length > 2 && w !== correctAnswer);
        
        const wrongOptions = [...new Set(allWords)]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        return {
          quote: { ...quote, text: questionText },
          correctAnswer,
          options,
          type: 'fill-blank' as const
        };
      } else {
        // Author question
        const correctAnswer = quote.author;
        const wrongAuthors = favoriteQuotes
          .map(f => f.quote.author)
          .filter(a => a !== correctAnswer);
        
        const uniqueWrongAuthors = [...new Set(wrongAuthors)];
        const wrongOptions = uniqueWrongAuthors
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        if (wrongOptions.length < 3) {
          // If not enough wrong authors, add some common ones
          const commonAuthors = ["Oscar Wilde", "Mark Twain", "Maya Angelou", "Winston Churchill"];
          wrongOptions.push(...commonAuthors.filter(a => a !== correctAnswer));
        }

        const options = [correctAnswer, ...wrongOptions.slice(0, 3)]
          .sort(() => Math.random() - 0.5);

        return {
          quote,
          correctAnswer,
          options,
          type: 'author' as const
        };
      }
    }).filter(Boolean) as QuizQuestion[];
  };

  const startQuiz = () => {
    if (!favorites || favorites.length === 0) {
      toast({
        title: "No quotes available",
        description: "Add some quotes to your favorites first!",
        variant: "destructive",
      });
      return;
    }

    const newQuestions = generateQuestions(favorites);
    if (newQuestions.length === 0) {
      toast({
        title: "Cannot generate quiz",
        description: "Need more favorite quotes to create a quiz",
        variant: "destructive",
      });
      return;
    }

    setQuestions(newQuestions);
    setQuizStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizCompleted(false);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;
    
    setIsAnswered(true);
    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
      toast({
        title: "Correct! 🎉",
        description: "+10 XP earned",
        variant: "default",
      });
    } else {
      toast({
        title: "Not quite right",
        description: `The correct answer was: ${questions[currentQuestion].correctAnswer}`,
        variant: "destructive",
      });
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    const xpEarned = score * 10;
    const sessionData = {
      score,
      totalQuestions: questions.length,
      xpEarned
    };

    submitQuizMutation.mutate(sessionData);
    setQuizCompleted(true);
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuestions([]);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto p-4 pb-24">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-brain text-primary text-3xl"></i>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Quote Quiz
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Test your knowledge of your favorite quotes
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {favorites?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Favorite Quotes
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-secondary mb-1">
                    {Math.min(5, favorites?.length || 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Quiz Questions
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={startQuiz}
                className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary-dark"
                disabled={!favorites || favorites.length === 0}
              >
                Start Quiz
              </Button>
              
              {(!favorites || favorites.length === 0) && (
                <p className="text-sm text-gray-500 text-center">
                  Add some quotes to your favorites to start a quiz
                </p>
              )}
            </div>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    const xpEarned = score * 10;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto p-4 pb-24 flex items-center justify-center min-h-screen">
          <Card className="w-full">
            <CardContent className="p-8 text-center space-y-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                percentage >= 80 ? 'bg-primary' : percentage >= 60 ? 'bg-accent' : 'bg-gray-400'
              }`}>
                <i className={`text-white text-3xl ${
                  percentage >= 80 ? 'fas fa-trophy' : percentage >= 60 ? 'fas fa-medal' : 'fas fa-thumbs-up'
                }`}></i>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Quiz Complete!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {percentage >= 80 ? 'Excellent work!' : percentage >= 60 ? 'Good job!' : 'Keep practicing!'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{score}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">{percentage}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">+{xpEarned}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">XP Earned</div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={resetQuiz}
                  className="w-full bg-primary hover:bg-primary-dark"
                >
                  Take Another Quiz
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setQuizStarted(false)}
                  className="w-full"
                >
                  Back to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={resetQuiz}
            className="p-2"
          >
            <i className="fas fa-times text-xl"></i>
          </Button>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <div className="flex items-center space-x-1 mt-1">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentQuestion ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <Badge variant="secondary">+10 XP</Badge>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-8" />

        {/* Question */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 text-center">
              {currentQ.type === 'fill-blank' ? 'Complete this quote:' : 'Who said this quote?'}
            </h3>
            <blockquote className="text-xl leading-relaxed text-gray-800 dark:text-white text-center mb-4">
              "{currentQ.quote.text}"
            </blockquote>
            {currentQ.type === 'fill-blank' && (
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                — {currentQ.quote.author}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Answer Options */}
        <div className="space-y-4 mb-8">
          {currentQ.options.map((option, index) => {
            let buttonClass = "w-full border-2 rounded-2xl p-4 text-left transition-all ";
            
            if (isAnswered) {
              if (option === currentQ.correctAnswer) {
                buttonClass += "border-primary bg-primary/10 text-primary";
              } else if (option === selectedAnswer && option !== currentQ.correctAnswer) {
                buttonClass += "border-destructive bg-destructive/10 text-destructive";
              } else {
                buttonClass += "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
              }
            } else {
              if (option === selectedAnswer) {
                buttonClass += "border-primary bg-primary/10 text-primary";
              } else {
                buttonClass += "border-gray-200 dark:border-gray-700 hover:border-primary text-gray-800 dark:text-white";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={buttonClass}
                disabled={isAnswered}
              >
                <span className="font-medium">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {isAnswered ? (
          <Button 
            onClick={nextQuestion}
            className="w-full py-4 text-lg font-semibold bg-primary hover:bg-primary-dark"
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        ) : (
          <Button 
            onClick={checkAnswer}
            disabled={!selectedAnswer}
            className="w-full py-4 text-lg font-semibold"
          >
            Check Answer
          </Button>
        )}
      </div>
      <Navigation />
    </div>
  );
}
