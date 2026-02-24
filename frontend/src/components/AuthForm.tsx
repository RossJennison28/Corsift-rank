import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type AuthMode = "login" | "register";

type AuthFormProps = {
  initialMode: AuthMode;
};

function AuthForm({ initialMode }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const providerFlow = mode === "login" ? "signIn" : "signUp";
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { redirectTo?: string } | null;
  const redirectTo = locationState?.redirectTo ?? "/review";

  const title = isLogin ? "Welcome back" : "Create your account";
  const description = isLogin
    ? "Sign in with your email and password."
    : "Sign up to create a new account.";

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
              const formData = new FormData(event.currentTarget);
              try {
                const result = await signIn("password", formData);
                if (result.signingIn) {
                  navigate(redirectTo, { replace: true });
                  return;
                }
                if (isLogin) {
                  setError("Invalid email or password");
                  return;
                }
                setError("Could not create account. Please try again.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Authentication failed");
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>
            <input name="flow" type="hidden" value={providerFlow} />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 pt-1">
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" type="submit">
                {isLogin ? "Login" : "Register"}
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                type="button"
                onClick={() => signIn("google", { redirectTo })}
              >
                Continue with Google
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
