import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { PageLoading } from "@/components/ui/loading";

// This standalone page simply redirects to the organizer dashboard check-in
export default function CheckIn() {
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate("/login");
    } else if (isOrganizer) {
      navigate("/organizador/check-in");
    } else {
      navigate("/");
    }
  }, [authLoading, rolesLoading, user, isOrganizer, navigate]);

  return <PageLoading />;
}
