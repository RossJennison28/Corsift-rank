import type { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <div>Checking session...</div>;
  if (isAuthenticated) return <Navigate to="/review" replace />;

  return <>{children}</>;
}
