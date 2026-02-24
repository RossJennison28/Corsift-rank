import { Route, Routes } from "react-router-dom";
import GuestRoute from "./components/GuestRoute.tsx";
import PasswordReset from "./components/PasswordReset.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import ThemeToggle from "./components/ThemeToggle";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import Register from "./pages/Register.tsx";
import UrlReview from "./pages/UrlReview.tsx";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <UrlReview />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
