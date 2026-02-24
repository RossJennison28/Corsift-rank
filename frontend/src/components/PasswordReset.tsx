import { useAuth } from "@workos-inc/authkit-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
 
export function PasswordReset() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const location = useLocation();
  const locationState = location.state as { redirectTo?: string } | null;
  const redirectTo = locationState?.redirectTo ?? "/review";
  const searchParams = new URLSearchParams(location.search);
  const resetToken = searchParams.get("password_reset_token") ?? searchParams.get("token");

  const startResetFlow = useCallback(async () => {
    setError(null);
    setIsRedirecting(true);

    try {
      if (resetToken) {
        await signIn({
          passwordResetToken: resetToken,
          state: { returnTo: redirectTo },
        });
      } else {
        await signIn({ state: { returnTo: redirectTo } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start password reset");
      setIsRedirecting(false);
    }
  }, [redirectTo, resetToken, signIn]);

  useEffect(() => {
    if (resetToken) {
      void startResetFlow();
    }
  }, [resetToken, startResetFlow]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center px-4">
      <Card className="w-full border-border/60 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        <CardHeader className="border-b bg-gradient-to-r from-primary/12 via-accent/10 to-secondary/18 text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Password reset is handled by WorkOS hosted authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-center">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!resetToken && (
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              onClick={() => void startResetFlow()}
              disabled={isRedirecting}
            >
              {isRedirecting ? "Redirecting..." : "Continue to Reset"}
            </Button>
          )}
          {resetToken && isRedirecting && (
            <p className="text-sm text-muted-foreground">Redirecting to WorkOS...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PasswordReset;
