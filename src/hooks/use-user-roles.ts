import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface UserRoles {
  isAdmin: boolean;
  isOrganizer: boolean;
  isUser: boolean;
  roles: string[];
  organizerId: string | null;
}

export function useUserRoles(): UserRoles & { isLoading: boolean } {
  const { user, loading: authLoading } = useAuth();

  // Fetch roles from user_roles table
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user && !authLoading,
  });

  // Fetch organizer account (only if not admin - admins don't auto-get organizer features)
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["user-organizer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !authLoading,
  });

  // CRITICAL: isOrganizer should ONLY be true if:
  // 1. User has 'organizer' role in user_roles table, OR
  // 2. User has an organizer_account
  // But NOT just because they are admin!
  const hasOrganizerRole = roles.includes("organizer");
  const hasOrganizerAccount = !!organizer;
  
  return {
    isAdmin: roles.includes("admin"),
    // Only organizer if they have the role OR have an organizer account
    isOrganizer: hasOrganizerRole || hasOrganizerAccount,
    isUser: roles.includes("user"),
    roles,
    organizerId: organizer?.id || null,
    isLoading: authLoading || rolesLoading || orgLoading,
  };
}
