import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface SavedEvent {
  id: string;
  event: {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
    start_at: string;
    venue_name: string | null;
    ticket_types: { price_cents: number }[];
  };
}

export function SavedEventsTab() {
  const { user } = useAuth();

  const { data: savedEvents = [], isLoading } = useQuery({
    queryKey: ["saved-events-tab", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          events:event_id (
            id,
            slug,
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
      
      return (data || [])
        .filter((item: any) => item.events)
        .map((item: any) => ({
          id: item.id,
          event: item.events,
        })) as SavedEvent[];
    },
    enabled: !!user,
  });

  if (isLoading) return <PageLoading />;

  if (savedEvents.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-8 w-8 text-accent" />}
        title="Nenhum evento salvo"
        description="Salve eventos para acompanhá-los depois"
        variant="default"
        action={
          <Button asChild className="btn-gradient">
            <Link to="/eventos">Ver eventos</Link>
          </Button>
        }
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-3">
      {savedEvents.map(({ id, event }) => {
        const minPrice = event.ticket_types?.length > 0
          ? Math.min(...event.ticket_types.map((t) => t.price_cents))
          : null;

        return (
          <Link key={id} to={`/evento/${event.slug || event.id}`}>
            <div className="flex gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
              {/* Event Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm line-clamp-1">
                    {event.title}
                  </h3>
                  <Heart className="h-4 w-4 text-red-500 fill-red-500 flex-shrink-0" />
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(event.start_at), "EEEE, dd 'de' MMM", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  {event.venue_name && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{event.venue_name}</span>
                    </div>
                  )}
                </div>

                {minPrice !== null && (
                  <div className="flex items-center gap-1 mt-2">
                    <Ticket className="h-3 w-3 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      {minPrice === 0
                        ? "Grátis"
                        : `A partir de R$ ${(minPrice / 100).toFixed(2).replace(".", ",")}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
