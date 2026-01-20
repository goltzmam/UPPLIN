import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface OrganizerPreviewTooltipProps {
  organizerId: string;
  organizerName?: string | null;
  organizerUsername?: string | null;
  children?: React.ReactNode;
}

export function OrganizerPreviewTooltip({
  organizerId,
  organizerName,
  organizerUsername,
  children,
}: OrganizerPreviewTooltipProps) {
  const displayUsername = organizerUsername || (organizerName ? organizerName.toLowerCase().replace(/\s+/g, '') : 'organizador');

  // Fetch organizer details on hover
  const { data: organizer } = useQuery({
    queryKey: ["organizer-preview", organizerId],
    queryFn: async () => {
      // Get organizer info
      const { data: orgData, error: orgError } = await supabase
        .from("organizer_accounts")
        .select("id, display_name, logo_url, description")
        .eq("id", organizerId)
        .single();

      if (orgError) throw orgError;

      // Get follower count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId);

      // Get event count
      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", organizerId)
        .eq("status", "published");

      return {
        ...orgData,
        followersCount: followersCount || 0,
        eventsCount: eventsCount || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!organizerId,
  });

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <Link
            to={`/organizador/${organizerId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            @{displayUsername}
          </Link>
        )}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-72 p-0 overflow-hidden"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-border">
              <AvatarImage src={organizer?.logo_url || undefined} alt={organizer?.display_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(organizer?.display_name || organizerName || "O")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {organizer?.display_name || organizerName}
              </h4>
              <p className="text-xs text-muted-foreground">@{displayUsername}</p>
            </div>
          </div>

          {/* Description */}
          {organizer?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {organizer.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{organizer?.followersCount || 0}</span>
              <span>seguidores</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{organizer?.eventsCount || 0}</span>
              <span>eventos</span>
            </div>
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            asChild
          >
            <Link to={`/organizador/${organizerId}`} onClick={(e) => e.stopPropagation()}>
              Ver perfil
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}