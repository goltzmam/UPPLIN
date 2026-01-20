import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EventWithOrganizer {
  id: string;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  venue_name: string | null;
  address_text: string | null;
  organizer: {
    display_name: string;
    logo_url: string | null;
  } | null;
  ticket_types: {
    price_cents: number | null;
  }[];
}

export function FollowingFeed() {
  const { user } = useAuth();

  const { data: followedEvents, isLoading } = useQuery({
    queryKey: ["following-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get the organizers the user follows
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("organizer_id")
        .eq("user_id", user.id);

      if (followsError) throw followsError;
      if (!follows?.length) return [];

      const organizerIds = follows.map(f => f.organizer_id);

      // Then get events from those organizers
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          cover_image_url,
          start_at,
          venue_name,
          address_text,
          organizer:organizer_accounts(display_name, logo_url),
          ticket_types(price_cents)
        `)
        .eq("status", "published")
        .in("organizer_id", organizerIds)
        .order("start_at", { ascending: true })
        .limit(20);

      if (eventsError) throw eventsError;
      return events as EventWithOrganizer[];
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-semibold mb-2">
          Siga organizadores
        </h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-xs">
          Faça login para seguir organizadores e ver eventos personalizados para você
        </p>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!followedEvents?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-semibold mb-2">
          Nenhum evento ainda
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Siga organizadores para ver seus eventos aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      {followedEvents.map((event, index) => {
        const minPrice = event.ticket_types?.length
          ? Math.min(...event.ticket_types.map(t => t.price_cents || 0))
          : 0;

        return (
          <FeedEventCard
            key={event.id}
            id={event.id}
            title={event.title}
            coverImageUrl={event.cover_image_url}
            startAt={event.start_at}
            venueName={event.venue_name}
            addressText={event.address_text}
            organizerName={event.organizer?.display_name}
            organizerAvatar={event.organizer?.logo_url}
            minPrice={minPrice}
            index={index}
          />
        );
      })}
    </div>
  );
}
