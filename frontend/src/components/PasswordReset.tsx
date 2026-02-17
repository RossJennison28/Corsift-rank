import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
 
export function PasswordReset() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"forgot" | { email: string }>("forgot");
  const [error, setError] = useState<string | null>(null);
  return step === "forgot" ? (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        try {
          await signIn("password", formData);
          setStep({ email: formData.get("email") as string });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send reset code");
        }
      }}
    >
      <input name="email" placeholder="Email" type="text" />
      <input name="flow" type="hidden" value="reset" />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Send code</button>
    </form>
  ) : (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        try {
          await signIn("password", formData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Password reset failed");
        }
      }}
    >
      <input name="code" placeholder="Code" type="text" />
      <input name="newPassword" placeholder="New password" type="password" />
      <input name="email" value={step.email} type="hidden" />
      <input name="flow" value="reset-verification" type="hidden" />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Continue</button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setStep("forgot");
        }}
      >
        Cancel
      </button>
    </form>
  );
}

export default PasswordReset;
