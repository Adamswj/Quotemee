import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setIsVerifying(false);
      setErrorMessage('No verification token found in the URL');
      toast({
        title: "Invalid Link",
        description: "No verification token found",
        variant: "destructive"
      });
      return;
    }

    // Verify the email
    fetch(`/api/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.message && data.message.includes('successfully')) {
          setIsVerified(true);
          toast({
            title: "Email Verified!",
            description: "Your email has been successfully verified"
          });
        } else {
          setErrorMessage(data.message || 'Failed to verify email');
          toast({
            title: "Verification Failed",
            description: data.message || 'Failed to verify email',
            variant: "destructive"
          });
        }
      })
      .catch(() => {
        setErrorMessage('Something went wrong. Please try again.');
        toast({
          title: "Error",
          description: "Failed to verify email",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-heading text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            QuoteLearn
          </h1>
          <p className="text-subtle">Email Verification</p>
        </div>

        <Card className="card">
          {isVerifying ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying Email
                </CardTitle>
                <CardDescription>
                  Please wait while we verify your email address...
                </CardDescription>
              </CardHeader>
            </>
          ) : isVerified ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Email Verified!
                </CardTitle>
                <CardDescription>
                  Your email has been successfully verified. You can now access all features of QuoteLearn.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-body text-center">
                    Welcome to QuoteLearn! Start exploring quotes and tracking your learning journey.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Link href="/" className="w-full">
                  <Button className="btn-primary w-full" data-testid="link-go-to-dashboard">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/explore" className="w-full">
                  <Button variant="outline" className="w-full" data-testid="link-explore-quotes">
                    Explore Quotes
                  </Button>
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  Verification Failed
                </CardTitle>
                <CardDescription>
                  {errorMessage || 'We were unable to verify your email address'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-body text-center">
                    This verification link may be invalid or expired. Please try logging in or contact support if the problem persists.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Link href="/auth" className="w-full">
                  <Button className="btn-primary w-full" data-testid="link-go-to-login">
                    Go to Login
                  </Button>
                </Link>
                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full" data-testid="link-go-to-home">
                    Go to Home
                  </Button>
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
