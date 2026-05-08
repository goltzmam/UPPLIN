import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, BadgeCheck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface FollowedOrganizer {
  id: string;
  organizer: {
    id: string;
    display_name: string;
    logo_url: string | null;
    slug: string | null;
    description: string | null;
  };
  eventCount: number;
}

export function FollowingTab() {
  const { user } = useAuth();

  const { data: following = [], isLoading } = useQuery({
    queryKey: ["user-following", user?.id],
    queryFn: async () => {
      // Get follows with organizer info
      const { data: follows, error } = await supabase
        .from("follows")
        .select(`
          id,
          organizer_id,
          organizer_accounts:organizer_id (
            id,
            display_name,
            logo_url,
            slug,
            description
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get event counts for each organizer
      const organizerIds = follows?.map((f: any) => f.organizer_id) || [];
      
      const { data: eventCounts } = await supabase
        .from("events")
        .select("organizer_id")
        .in("organizer_id", organizerIds)
        .eq("status", "published");

      const countMap = new Map<string, number>();
      eventCounts?.forEach((e) => {
        countMap.set(e.organizer_id, (countMap.get(e.organizer_id) || 0) + 1);
      });

      return (follows || []).map((f: any) => ({
        id: f.id,
        organizer: f.organizer_accounts,
        eventCount: countMap.get(f.organizer_id) || 0,
      })) as FollowedOrganizer[];
    },
    enabled: !!user,
  });

  if (isLoading) return <PageLoading />;

  if (following.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8 text-accent" />}
        title="Você não segue ninguém"
        description="Siga organizadores para acompanhar seus eventos"
        variant="default"
        action={
          <Button asChild className="btn-gradient">
            <Link to="/explorar-organizadores">Explorar organizadores</Link>
          </Button>
        }
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-3 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {following.length} {following.length === 1 ? "organizador" : "organizadores"}
        </p>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link to="/explorar-organizadores">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Explorar
          </Link>
        </Button>
      </div>
      {following.map(({ id, organizer, eventCount }) => (
        <Link
          key={id}
          to={organizer.slug ? `/o/${organizer.slug}` : `/organizador/${organizer.id}`}
          className="block"
        >
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors w-full overflow-hidden">
            <Avatar className="h-11 w-11 sm:h-14 sm:w-14 ring-2 ring-primary/20 flex-shrink-0">
              <AvatarImage src={organizer.logo_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-base sm:text-lg">
                {organizer.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
                  {organizer.display_name}
                </h3>
                {eventCount >= 5 && (
                  <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                )}
              </div>

              {organizer.description && (
                <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {organizer.description}
                </p>
              )}

              <div className="flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] sm:text-xs text-muted-foreground">
                  {eventCount} evento{eventCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <Badge variant="secondary" className="flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5">
              Seguindo
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
