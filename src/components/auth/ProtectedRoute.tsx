import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PageLoading } from "@/components/ui/loading";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  /** When true, also waits for the profile to be loaded before rendering. Defaults to true. */
  requireProfile?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
  requireProfile = true,
}: ProtectedRouteProps) {
  const { user, profile, loading, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [authReady, user, navigate, redirectTo, location.pathname]);

  // Wait for the auth check + (optionally) the profile to be loaded.
  if (loading || !authReady) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  if (requireProfile && !profile) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
