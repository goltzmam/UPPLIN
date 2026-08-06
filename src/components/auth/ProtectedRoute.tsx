import { ReactNode, useEffect, useState } from "react";
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

  // Nunca ficar preso no loading: após 8s seguimos com o que temos.
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGaveUpWaiting(true), 8000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [authReady, user, navigate, redirectTo, location.pathname]);

  // Sem sessão após o timeout: manda para o login em vez de travar.
  useEffect(() => {
    if (gaveUpWaiting && !user) {
      navigate(redirectTo, { replace: true, state: { from: location.pathname } });
    }
  }, [gaveUpWaiting, user, navigate, redirectTo, location.pathname]);

  // Wait for the auth check + (optionally) the profile to be loaded.
  if ((loading || !authReady) && !gaveUpWaiting) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  if (requireProfile && !profile && !gaveUpWaiting) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
