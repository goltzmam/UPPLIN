import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { PageLoading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { cn } from "@/lib/utils";

export default function Perfil() {
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "eventos";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Fetch user stats
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
  });

  // Fetch attended events (tickets)
  const { data: attendedEvents = [], isLoading: attendedLoading } = useQuery({
    queryKey: ["attended-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          event_id,
          events:event_id (
            id,
            title,
            cover_image_url,
            start_at,
            venue_name
          )
        `)
        .eq("buyer_user_id", user!.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      
      const uniqueEvents = data?.reduce((acc: any[], ticket: any) => {
        if (ticket.events && !acc.find(t => t.events?.id === ticket.events?.id)) {
          acc.push(ticket);
        }
        return acc;
      }, []) || [];

      return uniqueEvents;
    },
    enabled: !!user,
  });

  // Fetch saved events
  const { data: savedEvents = [], isLoading: savedLoading } = useQuery({
    queryKey: ["saved-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          event_id,
          events:event_id (
            id,
            title,
            cover_image_url,
            start_at,
            venue_name,
            ticket_types(price_cents)
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <PageLoading />
    </div>
  );
  
  if (!user || !profile) return null;

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* Desktop Sidebar */}
      <TikTokDesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto">
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
            attendedEvents={attendedEvents}
            savedEvents={savedEvents}
            attendedLoading={attendedLoading}
            savedLoading={savedLoading}
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
