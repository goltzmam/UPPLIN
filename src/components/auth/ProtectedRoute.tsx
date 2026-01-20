import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PageLoading } from "@/components/ui/loading";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // Store the attempted URL for redirect after login
      navigate(redirectTo, { 
        replace: true, 
        state: { from: location.pathname } 
      });
    }
  }, [loading, user, navigate, redirectTo, location.pathname]);

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
