import AuthForm from "../components/AuthForm";

function Register() {
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <AuthForm initialMode="register" />
    </main>
  );
}

export default Register;
