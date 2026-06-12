import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { PageLoading } from "@/components/ui/loading";

type AllowedRole = "admin" | "marketing" | "support";

interface Props {
  roles: AllowedRole[];
  children: React.ReactNode;
}

/**
 * Allows access if the user has ANY of the listed roles.
 * Admin always passes. Redirects to /admin/login when not authenticated,
 * to / when authenticated but lacking the role.
 */
export function AdminRoleRoute({ roles, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isMarketing, isSupport, isLoading } = useUserRoles();
  const navigate = useNavigate();

  const allowed =
    isAdmin ||
    (roles.includes("marketing") && isMarketing) ||
    (roles.includes("support") && isSupport);

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (!user) navigate("/admin/login");
    else if (!allowed) navigate("/");
  }, [authLoading, isLoading, user, allowed, navigate]);

  if (authLoading || isLoading) return <PageLoading />;
  if (!user || !allowed) return null;
  return <>{children}</>;
}
