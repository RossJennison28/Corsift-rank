import AuthForm from "../components/AuthForm";

function Register() {
  return (
    <main className="relative min-h-screen grid place-items-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_300px_at_14%_14%,hsl(var(--secondary)/0.4),transparent_72%),radial-gradient(640px_280px_at_92%_16%,hsl(var(--accent)/0.2),transparent_74%)]" />
      <div className="relative w-full">
        <AuthForm initialMode="register" />
      </div>
    </main>
  );
}

export default Register;
