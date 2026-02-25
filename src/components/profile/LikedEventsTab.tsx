import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Heart, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LikedEventsTab() {
  const { user } = useAuth();

  const { data: likedEvents = [], isLoading } = useQuery({
    queryKey: ["liked-events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_likes")
        .select(`
          id,
          created_at,
          event:event_id(
            id,
            title,
            cover_image_url,
            start_at,
            venue_name,
            address_text,
            organizer:organizer_id(display_name)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (likedEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-base font-semibold mb-1 text-foreground">Nenhuma curtida ainda</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Curta eventos para vê-los aqui
        </p>
        <Button asChild size="sm" className="rounded-full">
          <Link to="/eventos">Explorar Eventos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {likedEvents.map((liked: any) => {
        const event = liked.event;
        if (!event) return null;

        return (
          <Link
            key={liked.id}
            to={`/evento/${event.id}`}
            className="block group"
          >
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute top-3 right-3 bg-destructive/90 text-white p-2 rounded-full">
                <Heart className="h-4 w-4 fill-current" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 mb-1.5">
                  {event.title}
                </h3>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-white/80 text-xs">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {format(new Date(event.start_at), "d MMM • HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-1.5 text-white/70 text-xs">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{event.venue_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
