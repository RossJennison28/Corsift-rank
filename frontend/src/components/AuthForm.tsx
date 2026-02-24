import { useAuth } from "@workos-inc/authkit-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type AuthMode = "login" | "register";

type AuthFormProps = {
  initialMode: AuthMode;
};

function AuthForm({ initialMode }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const isLogin = mode === "login";
  const location = useLocation();
  const locationState = location.state as { redirectTo?: string } | null;
  const redirectTo = locationState?.redirectTo ?? "/review";

  const title = isLogin ? "Welcome back" : "Create your account";
  const description = isLogin
    ? "Sign in using WorkOS hosted authentication."
    : "Create your account using WorkOS hosted authentication.";

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="border-border/60 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        <CardHeader className="border-b bg-gradient-to-r from-primary/12 via-accent/10 to-secondary/18">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              try {
                // WorkOS handles the hosted auth screens; we only pass the return route.
                if (isLogin) {
                  await signIn({ state: { returnTo: redirectTo } });
                } else {
                  await signUp({ state: { returnTo: redirectTo } });
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Authentication failed");
              }
            }}
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 pt-1">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" type="submit">
                {isLogin ? "Continue to Login" : "Continue to Register"}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(isLogin ? "register" : "login");
                }}
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthForm;
