import AuthForm from "../components/AuthForm";

function Login() {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <AuthForm initialMode="login" />
    </main>
  );
}

export default Login;
