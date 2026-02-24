import { useEffect, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api} from "../../../backend/convex/_generated/api"
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const checkUserProfile = useMutation(api.myFunctions.checkUserProfile);
  const location = useLocation();
  const [isBootstrappingProfile, setIsBootstrappingProfile] = useState(true);
  
  useEffect(() => {
    let cancelled = false;

    async function bootstrapProfile() {
      // Ensure a profile row exists before rendering protected pages.
      if(!isAuthenticated) {
        if(!cancelled) setIsBootstrappingProfile(false);
        return;
      }

      try {
        await checkUserProfile({});
      } finally {
        if(!cancelled) setIsBootstrappingProfile(false);
      }
    }

    void bootstrapProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, checkUserProfile]);

  if (isLoading || (isAuthenticated && isBootstrappingProfile)) {
    // Hold rendering while auth/profile bootstrap resolves.
    return <div>Checking session...</div>
  }

  if(!isAuthenticated) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname}} />;
  }

  return <>{children}</>;
  }
