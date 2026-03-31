import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent-purple flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center">
            <i className="fas fa-quote-right text-white text-2xl"></i>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-gray-800">QuoteLearn</CardTitle>
            <CardDescription className="text-lg">
              Master inspiring quotes through gamified learning
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={() => setLocation("/auth")}
              className="w-full bg-primary hover:bg-primary-dark text-white py-6 text-lg font-semibold rounded-2xl"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => setLocation("/auth")}
              variant="outline"
              className="w-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white py-6 text-lg font-semibold rounded-2xl"
            >
              I have an account
            </Button>
          </div>
          
          <div className="pt-4">
            <p className="text-center text-sm text-gray-500 mb-4">
              Features you'll love:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <i className="fas fa-star text-accent"></i>
                <span>Gamified Learning</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-fire text-error"></i>
                <span>Daily Streaks</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-brain text-secondary"></i>
                <span>Interactive Quizzes</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-heart text-accent-purple"></i>
                <span>Save Favorites</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
