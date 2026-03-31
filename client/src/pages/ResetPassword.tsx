import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Check, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (!tokenParam) {
      toast({
        title: "Invalid Link",
        description: "No reset token found in the URL",
        variant: "destructive"
      });
      setIsValidating(false);
      return;
    }

    setToken(tokenParam);

    // Validate the token
    fetch(`/api/validate-reset-token?token=${tokenParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setIsValidToken(true);
        } else {
          toast({
            title: "Invalid Link",
            description: data.message || "This reset link is invalid or has expired",
            variant: "destructive"
          });
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to validate reset link",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        toast({
          title: "Success!",
          description: "Your password has been reset"
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to reset password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="card w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-body">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-heading text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              QuoteLearn
            </h1>
          </div>

          <Card className="card">
            <CardHeader>
              <CardTitle>Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>

            <CardFooter className="flex flex-col gap-2">
              <Link href="/forgot-password" className="w-full">
                <Button className="btn-primary w-full" data-testid="link-request-new-link">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth" className="w-full">
                <Button variant="outline" className="w-full" data-testid="link-back-to-login">
                  Back to Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-heading text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            QuoteLearn
          </h1>
          <p className="text-subtle">Create a new password</p>
        </div>

        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resetSuccess ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Password Reset Complete
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Reset Password
                </>
              )}
            </CardTitle>
            <CardDescription>
              {resetSuccess 
                ? "You can now log in with your new password"
                : "Enter your new password below"
              }
            </CardDescription>
          </CardHeader>

          {!resetSuccess ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <p className="text-xs text-subtle">Must be at least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isSubmitting}
                  data-testid="button-reset-password"
                >
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>

                <Link href="/auth">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    data-testid="link-cancel"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </Link>
              </CardFooter>
            </form>
          ) : (
            <CardFooter className="flex flex-col gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-body text-center">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>

              <Link href="/auth" className="w-full">
                <Button className="btn-primary w-full" data-testid="link-go-to-login">
                  Go to Login
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
