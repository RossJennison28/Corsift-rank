import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import Register from "./pages/Register.tsx";
import PasswordReset from "./components/PasswordReset.tsx";
import UrlReview from "./pages/UrlReview.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/password-reset" element={<PasswordReset />} />
      <Route path="/register" element={<Register />} />
      <Route path="/review" element={<UrlReview />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}