import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/ui/loading";

interface OrganizerRouteProps {
  children: ReactNode;
}

export function OrganizerRoute({ children }: OrganizerRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    async function checkOrganizer() {
      if (authLoading) return;

      if (!user) {
        navigate("/organizador/login", { 
          replace: true, 
          state: { from: location.pathname } 
        });
        return;
      }

      // Check if user has an organizer account
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("id, status")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking organizer status:", error);
        setChecking(false);
        return;
      }

      if (!data) {
        // User doesn't have an organizer account, redirect to onboarding
        navigate("/organizador/onboarding", { replace: true });
        return;
      }

      if (data.status === "suspended") {
        navigate("/organizador/login", { 
          replace: true,
          state: { suspended: true }
        });
        return;
      }

      setIsOrganizer(true);
      setChecking(false);
    }

    checkOrganizer();
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading || checking) {
    return <PageLoading />;
  }

  if (!isOrganizer) {
    return null;
  }

  return <>{children}</>;
}
