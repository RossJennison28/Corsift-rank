import AuthForm from "../components/AuthForm";

function Login() {
  return (
    <main className="relative min-h-screen grid place-items-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_20%_10%,hsl(var(--primary)/0.26),transparent_70%),radial-gradient(620px_280px_at_90%_20%,hsl(var(--accent)/0.2),transparent_72%)]" />
      <div className="relative w-full">
        <AuthForm initialMode="login" />
      </div>
    </main>
  );
}

export default Login;
