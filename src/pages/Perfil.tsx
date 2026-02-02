import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export default function Perfil() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "historico";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Fetch user stats with aggressive caching
  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      const [ticketsResult, savedResult] = await Promise.all([
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("buyer_user_id", user!.id),
        supabase
          .from("saved_events")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
      ]);

      return {
        ticketsCount: ticketsResult.count || 0,
        savedCount: savedResult.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <PageLoading />
    </div>
  );
  
  if (!user || !profile) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
      {/* Desktop Sidebar */}
      <TikTokDesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 lg:ml-[72px] w-full overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
          <ProfileHeader
            profile={profile}
            stats={{
              events: stats?.ticketsCount || 0,
              saved: stats?.savedCount || 0,
            }}
            onProfileUpdate={async (updates) => {
              await updateProfile(updates);
              await refreshProfile();
            }}
          />

          <ProfileTabs
            defaultTab={defaultTab}
            profile={profile}
            onProfileUpdate={async (updates) => {
              const { error } = await updateProfile(updates);
              if (!error) await refreshProfile();
              return { error };
            }}
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
