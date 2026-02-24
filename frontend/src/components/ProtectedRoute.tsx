import type { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) return <div>Checking session...</div>;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ redirectTo: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
