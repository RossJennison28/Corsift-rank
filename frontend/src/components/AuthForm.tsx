import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type AuthMode = "login" | "register";
type AuthStep = AuthMode | { email: string };

type AuthFormProps = {
  initialMode: AuthMode;
};

function AuthForm({ initialMode }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<AuthStep>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const isCredentialsStep = step === "login" || step === "register";
  const mode = isCredentialsStep ? step : initialMode;
  const providerFlow = step === "login" ? "signIn" : "signUp";
  const isLogin = mode === "login";

  const title = isCredentialsStep
    ? isLogin
      ? "Welcome back"
      : "Create your account"
    : "Check your email";
  const description = isCredentialsStep
    ? isLogin
      ? "Sign in with your email and password."
      : "Sign up to create a new account."
    : "Enter the verification code sent to your inbox.";

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isCredentialsStep ? (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                const formData = new FormData(event.currentTarget);
                try {
                  const result = await signIn("password", formData);
                  if (!result.signingIn) {
                    setStep({ email: formData.get("email") as string });
                  }
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
                <Button className="w-full" type="submit">
                  {isLogin ? "Login" : "Register"}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  onClick={() => signIn("google", { redirectTo: "/" })}
                >
                  Continue with Google
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(isLogin ? "register" : "login");
                  }}
                >
                  {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                </Button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                const formData = new FormData(event.currentTarget);
                try {
                  await signIn("password", formData);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Verification failed");
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification code</Label>
                <Input id="verification-code" name="code" placeholder="Enter code" type="text" required />
              </div>
              <input name="flow" type="hidden" value="email-verification" />
              <input name="email" value={step.email} type="hidden" />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2 pt-1">
                <Button className="w-full" type="submit">
                  Continue
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  onClick={() => signIn("google", { redirectTo: "/" })}
                >
                  Continue with Google
                </Button>
                <Button
                  className="w-full"
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(initialMode);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthForm;
